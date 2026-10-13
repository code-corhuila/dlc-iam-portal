import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { StaffDirectoryService } from '../data/staff-directory.service';
import type { Staff, StaffPage, StaffRole, StaffStatus } from '../model/staff';
import { StaffCreateComponent } from './staff-create.component';
import { StaffDisableComponent } from './staff-disable.component';
import { StaffEditComponent } from './staff-edit.component';
import { StaffEnableComponent } from './staff-enable.component';
import { StaffRolesComponent } from './staff-roles.component';
import { StaffUnlockComponent } from './staff-unlock.component';

@Component({
  selector: 'dlc-staff-directory',
  standalone: true,
  imports: [StaffCreateComponent, StaffDisableComponent, StaffEditComponent,
    StaffEnableComponent, StaffRolesComponent, StaffUnlockComponent],
  styleUrl: './staff-directory.component.css',
  template: `
    <section class="directory" aria-label="Administración de personal">
      <div class="directory-content" [attr.inert]="creating() ? '' : null">
      <header class="page-heading">
        <p class="eyebrow">Administración</p>
        <div class="heading-row">
          <div>
            <h1>Gestión de usuarios y roles</h1>
            <p class="subtitle">Gestiona el acceso, los permisos y los roles del personal de la clínica.</p>
          </div>
          @if (!selectedId() && page()) {
            <button class="primary-action" type="button" (click)="creating.set(true)">
              <span aria-hidden="true">＋</span> Agregar nuevo usuario
            </button>
          }
        </div>
      </header>
      @if (selectedId()) {
        <button class="back-button" type="button" (click)="closeDetail()">← Volver al listado</button>
        <section class="detail-card" aria-label="Detalle de personal">
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
            } @else if (disabling()) {
              <dlc-staff-disable [member]="member" (saved)="saveDetail($event)"
                (cancel)="disabling.set(false)" (refresh)="openDetail(member.id)" />
            } @else if (enabling()) {
              <dlc-staff-enable [member]="member" (saved)="saveDetail($event)"
                (cancel)="enabling.set(false)" (refresh)="openDetail(member.id)" />
            } @else if (changingRoles()) {
              <dlc-staff-roles [member]="member" (saved)="saveDetail($event)"
                (cancel)="changingRoles.set(false)" (refresh)="openDetail(member.id)" />
            } @else if (unlocking()) {
              <dlc-staff-unlock [member]="member" (saved)="saveDetail($event)"
                (cancel)="unlocking.set(false)" (refresh)="openDetail(member.id)" />
            } @else {
              <button type="button" (click)="editing.set(true)">Editar nombre</button>
              @if (!member.roles.includes('ADMINISTRATOR')) {
                <button type="button" (click)="changingRoles.set(true)">Cambiar roles</button>
              }
              @if (member.status === 'LOCKED') {
                <button type="button" (click)="unlocking.set(true)">Desbloquear personal</button>
              }
              @if (member.status !== 'DISABLED') {
                <button type="button" (click)="disabling.set(true)">Deshabilitar personal</button>
              } @else {
                <button type="button" (click)="enabling.set(true)">Habilitar personal</button>
              }
            }
            <dl class="staff-details">
              <div><dt>Correo</dt><dd>{{ member.email }}</dd></div>
              <div><dt>Roles</dt><dd>
                @for (role of member.roles; track role) {
                  <span class="role-badge" [class.role-admin]="role === 'ADMINISTRATOR'"
                    [class.role-dentist]="role === 'DENTIST'">{{ roleLabel(role) }}</span>
                }
              </dd></div>
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
        <section class="metrics" aria-label="Resumen del personal">
          <article class="metric-card">
            <span class="metric-icon metric-icon--people" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2H3ZM16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2h-3"/></svg>
            </span>
            <div><p>Personal total</p><strong>{{ result.meta.total }}</strong><small>En el directorio</small></div>
          </article>
          <article class="metric-card">
            <span class="metric-icon metric-icon--medical" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 3v7a5 5 0 0 0 10 0V3M4 3h4m6 0h4m-7 12v2a4 4 0 0 0 8 0v-3"/><circle cx="19" cy="13" r="2"/></svg>
            </span>
            <div><p>Profesionales médicos</p><strong>{{ roleCount('DENTIST') }}</strong><small>En esta página</small></div>
          </article>
          <article class="metric-card">
            <span class="metric-icon metric-icon--admin" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m12 2 8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4Z"/><path d="M9 12h6m-3-3v6"/></svg>
            </span>
            <div><p>Administradores</p><strong>{{ roleCount('ADMINISTRATOR') }}</strong><small>En esta página</small></div>
          </article>
        </section>
        <section class="directory-card" aria-label="Directorio del personal de la clínica">
          <div class="directory-toolbar">
            <div>
              <h2>Directorio del personal de la clínica</h2>
              <p>{{ result.meta.total }} registros · El filtro se aplica a esta página</p>
            </div>
            <div class="filter-control">
              <label for="staff-role-filter">Filtrar por rol</label>
              <select id="staff-role-filter" [value]="roleFilter()" (change)="setRoleFilter($event)">
                <option value="ALL">Todos los roles</option>
                <option value="DENTIST">Odontólogos</option>
                <option value="SECRETARY_ASSISTANT">Secretarios auxiliares</option>
                <option value="ADMINISTRATOR">Administradores</option>
              </select>
            </div>
          </div>
          <div class="table-scroll">
            <table>
              <thead><tr>
                <th scope="col">Nombre</th><th scope="col">Rol</th><th scope="col">Correo</th>
                <th scope="col">Estado</th><th scope="col">Acciones</th>
              </tr></thead>
              <tbody>
                @for (member of filteredStaff(); track member.id) {
                  <tr>
                    <td><span class="person"><span class="avatar" aria-hidden="true">{{ initials(member.name) }}</span>
                      <strong>{{ member.name }}</strong></span></td>
                    <td><span class="role-list">
                      @for (role of member.roles; track role) {
                        <span class="role-badge" [class.role-admin]="role === 'ADMINISTRATOR'"
                          [class.role-dentist]="role === 'DENTIST'">{{ roleLabel(role) }}</span>
                      }
                    </span></td>
                    <td class="email">{{ member.email }}</td>
                    <td><span class="status-badge" [class.status-active]="member.status === 'ACTIVE'"
                      [class.status-pending]="member.status === 'PENDING_VERIFICATION'"
                      [class.status-locked]="member.status === 'LOCKED'">{{ statusLabel(member.status) }}</span></td>
                    <td><button class="detail-button" type="button" (click)="openDetail(member.id)"
                      [attr.aria-label]="'Ver detalle de ' + member.name">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path d="m4 16-.5 4 4-.5L19 8a2 2 0 0 0-3-3L4 16Z"/>
                      </svg><span aria-hidden="true">⋮</span>
                    </button></td>
                  </tr>
                } @empty {
                  <tr><td class="empty" colspan="5" role="status">
                    {{ result.data.length ? 'No hay personal con ese rol en esta página.' : 'No hay personal en esta página.' }}
                  </td></tr>
                }
              </tbody>
            </table>
          </div>
          <nav aria-label="Páginas de personal">
            <button type="button" [disabled]="result.meta.page <= 1"
              (click)="load(result.meta.page - 1)">Anterior</button>
            <span>Página {{ result.meta.page }} de {{ result.meta.totalPages || 1 }}</span>
            <button type="button" [disabled]="result.meta.page >= result.meta.totalPages"
              (click)="load(result.meta.page + 1)">Siguiente</button>
          </nav>
        </section>
      }
      </div>
      @if (creating()) {
        <div class="modal-backdrop">
          <div class="create-dialog" role="dialog" aria-modal="true"
            aria-labelledby="staff-create-title" aria-describedby="staff-create-subtitle">
            <dlc-staff-create (close)="closeCreate()" />
          </div>
        </div>
      }
    </section>
  `,
})
export class StaffDirectoryComponent implements OnInit {
  private readonly directory = inject(StaffDirectoryService);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = signal<'loading' | 'ready' | 'forbidden' | 'session-expired' | 'error'>('loading');
  readonly page = signal<StaffPage | null>(null);
  readonly roleFilter = signal<'ALL' | StaffRole>('ALL');
  readonly filteredStaff = computed(() => {
    const role = this.roleFilter();
    return this.page()?.data.filter((member) => role === 'ALL' || member.roles.includes(role)) ?? [];
  });
  readonly selectedId = signal<string | null>(null);
  readonly detail = signal<Staff | null>(null);
  readonly creating = signal(false);
  readonly editing = signal(false);
  readonly disabling = signal(false);
  readonly enabling = signal(false);
  readonly changingRoles = signal(false);
  readonly unlocking = signal(false);
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
    this.disabling.set(false);
    this.enabling.set(false);
    this.changingRoles.set(false);
    this.unlocking.set(false);
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
    this.disabling.set(false);
    this.enabling.set(false);
    this.changingRoles.set(false);
    this.unlocking.set(false);
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
    this.disabling.set(false);
    this.enabling.set(false);
    this.changingRoles.set(false);
    this.unlocking.set(false);
    const current = this.page();
    if (current) {
      this.page.set({ ...current, data: current.data.map((member) =>
        member.id === staff.id ? staff : member) });
    }
  }

  setRoleFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'ALL' || value === 'ADMINISTRATOR' || value === 'DENTIST' ||
        value === 'SECRETARY_ASSISTANT') this.roleFilter.set(value);
  }

  roleCount(role: StaffRole): number {
    return this.page()?.data.filter((member) => member.roles.includes(role)).length ?? 0;
  }

  roleLabel(role: StaffRole): string {
    switch (role) {
      case 'ADMINISTRATOR': return 'Administrador';
      case 'DENTIST': return 'Odontólogo';
      case 'SECRETARY_ASSISTANT': return 'Secretario auxiliar';
    }
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
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
