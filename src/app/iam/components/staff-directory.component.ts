import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { StaffDirectoryService } from '../data/staff-directory.service';
import type { StaffPage, StaffStatus } from '../model/staff';

@Component({
  selector: 'dlc-staff-directory',
  standalone: true,
  styleUrl: './staff-directory.component.css',
  template: `
    <section class="directory" aria-label="Administración de personal">
      <h1>Personal</h1>
      @if (state() === 'loading') {
        <p role="status">Cargando personal…</p>
      } @else if (state() === 'forbidden') {
        <p role="alert">No tienes permiso para consultar el personal.</p>
      } @else if (state() === 'error') {
        <p role="alert">No se pudo cargar el personal.</p>
        <button type="button" (click)="load(requestedPage)">Reintentar</button>
      } @else if (page(); as result) {
        <p class="count">{{ result.meta.total }} registros</p>
        <ul>
          @for (member of result.data; track member.id) {
            <li>
              <strong>{{ member.name }}</strong>
              <span>{{ member.email }}</span>
              <span>{{ member.roles.join(', ') }}</span>
              <span class="status">{{ statusLabel(member.status) }}</span>
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
  readonly state = signal<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  readonly page = signal<StaffPage | null>(null);
  requestedPage = 1;

  ngOnInit(): void {
    void this.load(1);
  }

  async load(page: number): Promise<void> {
    this.requestedPage = page;
    this.page.set(null);
    this.state.set('loading');
    const result = await this.directory.list(page);
    if (this.destroyRef.destroyed) return;
    if (result.kind === 'loaded') {
      this.page.set(result.page);
      this.state.set('ready');
    } else {
      this.state.set(result.kind === 'forbidden' ? 'forbidden' : 'error');
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
