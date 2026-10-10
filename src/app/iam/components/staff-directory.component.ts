import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { StaffDirectoryService } from '../data/staff-directory.service';
import type { Staff, StaffPage, StaffStatus } from '../model/staff';
import { StaffCreateComponent } from './staff-create.component';
import { StaffEditComponent } from './staff-edit.component';

@Component({
  selector: 'dlc-staff-directory',
  standalone: true,
  imports: [StaffCreateComponent, StaffEditComponent],
  styleUrl: './staff-directory.component.css',
  template: `
    <section class="directory" aria-label="Administración de personal">
      <h1>Personal</h1>
      @if (creating()) {
        <dlc-staff-create (close)="closeCreate()" />
      } @else if (selectedId()) {
        <button type="button" (click)="closeDetail()">Volver al listado</button>
        <section aria-label="Detalle de personal">
          @if (detailState() === 'loading') {
            <p role="status">Cargando detalle…</p>
          } @else if (detailState() === 'forbidden') {
            <p role="alert">No tienes permiso para consultar este registro.</p>
          } @else if (detailState() === 'session-expired') {
            <p role="alert">La sesión terminó. Inicia sesión de nuevo.</p>
          } @else if (detailState() === 'not-found') {
            <p role="alert">El registro no está disponible.</p>
          } @else if (detailState() === 'error') {
            <p role="alert">No se pudo cargar el detalle.</p>
            <button type="button" (click)="openDetail(selectedId()!)">Reintentar</button>
          } @else if (detail(); as member) {
            <h2>{{ member.name }}</h2>
            @if (editing()) {
              <dlc-staff-edit [member]="member" (saved)="saveDetail($event)"
                (cancel)="editing.set(false)" (refresh)="openDetail(member.id)" />
            } @else {
              <button type="button" (click)="editing.set(true)">Editar nombre</button>
            }
            <dl>
              <div><dt>Correo</dt><dd>{{ member.email }}</dd></div>
              <div><dt>Roles</dt><dd>{{ member.roles.join(', ') }}</dd></div>
              <div><dt>Estado</dt><dd>{{ statusLabel(member.status) }}</dd></div>
              <div><dt>Identificador</dt><dd>{{ member.id }}</dd></div>
            </dl>
          }
        </section>
      } @else if (state() === 'loading') {
        <p role="status">Cargando personal…</p>
      } @else if (state() === 'forbidden') {
        <p role="alert">No tienes permiso para consultar el personal.</p>
      } @else if (state() === 'session-expired') {
        <p role="alert">La sesión terminó. Inicia sesión de nuevo.</p>
      } @else if (state() === 'error') {
        <p role="alert">No se pudo cargar el personal.</p>
        <button type="button" (click)="load(requestedPage)">Reintentar</button>
      } @else if (page(); as result) {
        <button type="button" (click)="creating.set(true)">Crear personal</button>
        <p class="count">{{ result.meta.total }} registros</p>
        <ul>
          @for (member of result.data; track member.id) {
            <li>
              <strong>{{ member.name }}</strong>
              <span>{{ member.email }}</span>
              <span>{{ member.roles.join(', ') }}</span>
              <span class="status">{{ statusLabel(member.status) }}</span>
              <button type="button" (click)="openDetail(member.id)">Ver detalle de {{ member.name }}</button>
            </li>
          } @empty {
            <li class="empty" role="status">No hay personal en esta página.</li>
          }
        </ul>
        <nav aria-label="Páginas de personal">
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
export class StaffDirectoryComponent implements OnInit {
  private readonly directory = inject(StaffDirectoryService);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = signal<'loading' | 'ready' | 'forbidden' | 'session-expired' | 'error'>('loading');
  readonly page = signal<StaffPage | null>(null);
  readonly selectedId = signal<string | null>(null);
  readonly detail = signal<Staff | null>(null);
  readonly creating = signal(false);
  readonly editing = signal(false);
  readonly detailState = signal<'loading' | 'ready' | 'forbidden' | 'not-found' | 'session-expired' | 'error'>('loading');
  requestedPage = 1;
  private loadVersion = 0;
  private detailVersion = 0;

  ngOnInit(): void {
    void this.load(1);
  }

  async load(page: number): Promise<void> {
    const version = ++this.loadVersion;
    this.requestedPage = page;
    this.page.set(null);
    this.state.set('loading');
    const result = await this.directory.list(page);
    if (this.destroyRef.destroyed || version !== this.loadVersion) return;
    if (result.kind === 'loaded') {
      this.page.set(result.page);
      this.state.set('ready');
    } else {
      this.state.set(result.kind === 'unavailable' ? 'error' : result.kind);
    }
  }

  async openDetail(id: string): Promise<void> {
    const version = ++this.detailVersion;
    this.editing.set(false);
    this.selectedId.set(id);
    this.detail.set(null);
    this.detailState.set('loading');
    const result = await this.directory.read(id);
    if (this.destroyRef.destroyed || version !== this.detailVersion) return;
    if (result.kind === 'loaded') {
      this.detail.set(result.staff);
      this.detailState.set('ready');
    } else {
      this.detailState.set(result.kind === 'unavailable' ? 'error' : result.kind);
    }
  }

  closeDetail(): void {
    ++this.detailVersion;
    this.editing.set(false);
    this.selectedId.set(null);
    this.detail.set(null);
  }

  closeCreate(): void {
    this.creating.set(false);
    void this.load(1);
  }

  saveDetail(staff: Staff): void {
    this.detail.set(staff);
    this.editing.set(false);
    const current = this.page();
    if (current) {
      this.page.set({ ...current, data: current.data.map((member) =>
        member.id === staff.id ? staff : member) });
    }
  }

  statusLabel(status: StaffStatus): string {
    switch (status) {
      case 'PENDING_VERIFICATION': return 'Pendiente de verificación';
      case 'ACTIVE': return 'Activo';
      case 'LOCKED': return 'Bloqueado';
      case 'DISABLED': return 'Deshabilitado';
    }
  }
}
