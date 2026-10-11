import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { StaffDirectoryService } from '../data/staff-directory.service';
import { ASSIGNABLE_STAFF_ROLES, type AssignableStaffRole, type Staff } from '../model/staff';

@Component({
  selector: 'dlc-staff-roles',
  standalone: true,
  styleUrl: './staff-roles.component.css',
  template: `
    <form (submit)="submit($event)" aria-label="Cambiar roles de personal">
      <h3>Roles de {{ member().name }}</h3>
      <p>Auth verificará los permisos y revocará las sesiones anteriores si cambia los roles.</p>
      <fieldset [disabled]="state() === 'saving'">
        <legend>Roles permitidos</legend>
        @for (role of assignableRoles; track role.value) {
          <label><input type="checkbox" name="roles" [value]="role.value"
            [checked]="member().roles.includes(role.value)" /> {{ role.label }}</label>
        }
      </fieldset>
      <label>Motivo
        <textarea name="reason" required maxlength="1000" rows="3"
          [disabled]="state() === 'saving'"></textarea>
      </label>
      <div class="actions">
        <button type="submit" [disabled]="state() === 'saving' || state() === 'conflict'">
          Guardar roles
        </button>
        <button type="button" (click)="cancel.emit()" [disabled]="state() === 'saving'">Cancelar</button>
      </div>
      @if (state() === 'saving') {
        <p role="status">Guardando roles…</p>
      } @else if (state() === 'invalid') {
        <p role="alert">Selecciona un cambio de roles y escribe un motivo válido.</p>
      } @else if (state() === 'conflict') {
        <p role="alert">Este registro cambió. Consúltalo de nuevo antes de editar roles.</p>
        <button type="button" (click)="refresh.emit()">Recargar registro</button>
      } @else if (state() === 'forbidden') {
        <p role="alert">No tienes permiso para cambiar estos roles.</p>
      } @else if (state() === 'session-expired') {
        <p role="alert">La sesión terminó. Inicia sesión de nuevo.</p>
      } @else if (state() === 'not-found') {
        <p role="alert">El registro no está disponible.</p>
      } @else if (state() === 'error') {
        <p role="alert">No se pudieron guardar los roles. Puedes reintentar.</p>
      }
    </form>
  `,
})
export class StaffRolesComponent {
  private readonly directory = inject(StaffDirectoryService);
  private readonly destroyRef = inject(DestroyRef);
  readonly assignableRoles = ASSIGNABLE_STAFF_ROLES;
  readonly member = input.required<Staff>();
  readonly saved = output<Staff>();
  readonly cancel = output<void>();
  readonly refresh = output<void>();
  readonly state = signal<'editing' | 'saving' | 'invalid' | 'conflict' | 'forbidden' |
    'session-expired' | 'not-found' | 'error'>('editing');

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.state() === 'saving' || this.state() === 'conflict') return;
    const form = event.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) return;
    const data = new FormData(form);
    const selected = data.getAll('roles').map(String) as AssignableStaffRole[];
    const reason = String(data.get('reason') ?? '').trim();
    if (!selected.length || (selected.length === this.member().roles.length &&
        selected.every((role) => this.member().roles.includes(role)))) {
      this.state.set('invalid');
      return;
    }
    this.state.set('saving');
    const result = await this.directory.assignRoles(this.member(), selected, reason);
    if (this.destroyRef.destroyed) return;
    if (result.kind === 'assigned') {
      this.saved.emit(result.staff);
    } else {
      this.state.set(result.kind === 'unavailable' ? 'error' : result.kind);
    }
  }
}
