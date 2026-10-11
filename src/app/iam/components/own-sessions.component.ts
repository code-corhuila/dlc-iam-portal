import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { OwnSessionsService } from '../data/own-sessions.service';
import type { OwnSession, OwnSessionPage } from '../model/session';

@Component({
  selector: 'dlc-own-sessions',
  standalone: true,
  styleUrl: './own-sessions.component.css',
  template: `
    <section class="sessions" aria-label="Mis sesiones">
      <h1>Mis sesiones</h1>
      @if (notice()) { <p role="status">{{ notice() }}</p> }
      @if (state() === 'loading') {
        <p role="status">Cargando sesiones…</p>
      } @else if (state() === 'forbidden') {
        <p role="alert">No tienes permiso para consultar tus sesiones.</p>
      } @else if (state() === 'session-expired') {
        <p role="alert">La sesión terminó. Inicia sesión de nuevo.</p>
      } @else if (state() === 'error') {
        <p role="alert">No se pudieron cargar tus sesiones.</p>
        <button type="button" (click)="load(requestedPage)">Reintentar</button>
      } @else if (page(); as result) {
        <p>{{ result.meta.total }} sesiones</p>
        <ul>
          @for (session of result.data; track session.id) {
            <li>
              <strong>{{ session.device || 'Dispositivo no identificado' }}</strong>
              @if (session.current) { <span class="current">Sesión actual</span> }
              @if (session.lastUserActivityAt) {
                <span>Última actividad: {{ formatDate(session.lastUserActivityAt) }}</span>
              }
              <span>Vence: {{ formatDate(session.expiresAt) }}</span>
              <button type="button" [disabled]="revokeState() === 'saving'"
                (click)="select(session)">Revocar dispositivo</button>
              @if (selectedId() === session.id) {
                <form (submit)="revoke($event, session)" aria-label="Revocar sesión">
                  <p>Se cerrará el acceso de este dispositivo. Auth confirmará la revocación.</p>
                  @if (session.current) {
                    <p>Es tu sesión actual; tendrás que iniciar sesión de nuevo.</p>
                  }
                  <label>Motivo
                    <textarea name="reason" required maxlength="1000" rows="2"
                      [value]="reason()" (input)="editReason($any($event.target).value)"
                      [disabled]="revokeBlocked()"></textarea>
                  </label>
                  <button type="submit" [disabled]="revokeBlocked()">Confirmar revocación</button>
                  <button type="button" [disabled]="revokeState() === 'saving'"
                    (click)="cancelRevoke()">Cancelar</button>
                  @if (revokeState() === 'saving') {
                    <p role="status">Revocando sesión…</p>
                  } @else if (revokeState() === 'invalid') {
                    <p role="alert">Escribe un motivo válido.</p>
                  } @else if (revokeState() === 'conflict') {
                    <p role="alert">La sesión cambió. Actualiza la lista antes de intentar otra vez.</p>
                    <button type="button" (click)="load(requestedPage)">Actualizar lista</button>
                  } @else if (revokeState() === 'forbidden') {
                    <p role="alert">No tienes permiso para revocar esta sesión.</p>
                  } @else if (revokeState() === 'not-found') {
                    <p role="alert">Esta sesión ya no está disponible.</p>
                  } @else if (revokeState() === 'session-expired') {
                    <p role="alert">Tu sesión terminó. Inicia sesión de nuevo.</p>
                  } @else if (revokeState() === 'error') {
                    <p role="alert">No pudimos confirmar la revocación. Puedes reintentar sin cambiar el motivo.</p>
                  }
                </form>
              }
            </li>
          } @empty {
            <li role="status">No hay sesiones en esta página.</li>
          }
        </ul>
        <nav aria-label="Páginas de sesiones">
          <button type="button" [disabled]="result.meta.page <= 1 || revokeState() === 'saving'"
            (click)="load(result.meta.page - 1)">Anterior</button>
          <span>Página {{ result.meta.page }} de {{ result.meta.totalPages || 1 }}</span>
          <button type="button" [disabled]="result.meta.page >= result.meta.totalPages || revokeState() === 'saving'"
            (click)="load(result.meta.page + 1)">Siguiente</button>
        </nav>
      }
    </section>
  `,
})
export class OwnSessionsComponent implements OnInit {
  private readonly sessions = inject(OwnSessionsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = signal<'loading' | 'ready' | 'forbidden' | 'session-expired' | 'error'>('loading');
  readonly page = signal<OwnSessionPage | null>(null);
  readonly selectedId = signal<string | null>(null);
  readonly reason = signal('');
  readonly notice = signal('');
  readonly revokeState = signal<'editing' | 'saving' | 'invalid' | 'conflict' |
    'forbidden' | 'not-found' | 'session-expired' | 'error'>('editing');
  readonly revokeBlocked = computed(() =>
    this.revokeState() !== 'editing' && this.revokeState() !== 'invalid' &&
    this.revokeState() !== 'error');
  requestedPage = 1;
  private loadVersion = 0;
  private idempotencyKey: string | null = null;

  ngOnInit(): void { void this.load(1); }

  async load(page: number): Promise<void> {
    const version = ++this.loadVersion;
    this.requestedPage = page;
    this.cancelRevoke();
    this.notice.set('');
    this.page.set(null);
    this.state.set('loading');
    const result = await this.sessions.list(page);
    if (this.destroyRef.destroyed || version !== this.loadVersion) return;
    if (result.kind === 'loaded') {
      this.page.set(result.page);
      this.state.set('ready');
    } else {
      this.state.set(result.kind === 'forbidden' || result.kind === 'session-expired'
        ? result.kind : 'error');
    }
  }

  select(session: OwnSession): void {
    if (this.revokeState() === 'saving') return;
    if (this.selectedId() === session.id) {
      this.cancelRevoke();
      return;
    }
    this.cancelRevoke();
    this.selectedId.set(session.id);
  }

  cancelRevoke(): void {
    if (this.revokeState() === 'saving') return;
    this.selectedId.set(null);
    this.reason.set('');
    this.revokeState.set('editing');
    this.idempotencyKey = null;
  }

  editReason(value: string): void {
    if (this.revokeBlocked()) return;
    if (value.trim() !== this.reason().trim()) this.idempotencyKey = null;
    this.reason.set(value);
    this.revokeState.set('editing');
  }

  async revoke(event: Event, session: OwnSession): Promise<void> {
    event.preventDefault();
    if (this.selectedId() !== session.id || this.revokeBlocked()) return;
    if (!this.reason().trim()) {
      this.revokeState.set('invalid');
      return;
    }
    this.idempotencyKey ??= globalThis.crypto.randomUUID();
    this.revokeState.set('saving');
    const result = await this.sessions.revoke(session.id, this.reason(), this.idempotencyKey);
    if (this.destroyRef.destroyed || this.selectedId() !== session.id) return;
    if (result.kind === 'revoked') {
      const current = session.current;
      this.revokeState.set('editing');
      await this.load(this.requestedPage);
      if (!this.destroyRef.destroyed) this.notice.set(current
        ? 'Se revocó este dispositivo. Inicia sesión de nuevo.'
        : 'Se revocó el acceso del dispositivo.');
    } else if (result.kind === 'session-expired') {
      this.page.set(null);
      this.state.set('session-expired');
      this.revokeState.set('session-expired');
    } else {
      this.revokeState.set(result.kind === 'unavailable' ? 'error' : result.kind);
    }
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
      .format(new Date(value));
  }
}
