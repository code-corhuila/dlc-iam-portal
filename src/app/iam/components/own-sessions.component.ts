import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { OwnSessionsService } from '../data/own-sessions.service';
import type { OwnSessionPage } from '../model/session';

@Component({
  selector: 'dlc-own-sessions',
  standalone: true,
  styleUrl: './own-sessions.component.css',
  template: `
    <section class="sessions" aria-label="Mis sesiones">
      <h1>Mis sesiones</h1>
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
            </li>
          } @empty {
            <li role="status">No hay sesiones en esta página.</li>
          }
        </ul>
        <nav aria-label="Páginas de sesiones">
          <button type="button" [disabled]="result.meta.page <= 1"
            (click)="load(result.meta.page - 1)">Anterior</button>
          <span>Página {{ result.meta.page }} de {{ result.meta.totalPages || 1 }}</span>
          <button type="button" [disabled]="result.meta.page >= result.meta.totalPages"
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
  requestedPage = 1;
  private loadVersion = 0;

  ngOnInit(): void { void this.load(1); }

  async load(page: number): Promise<void> {
    const version = ++this.loadVersion;
    this.requestedPage = page;
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

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
      .format(new Date(value));
  }
}
