import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { StaffDirectoryService } from '../data/staff-directory.service';
import type { Staff } from '../model/staff';

@Component({
  selector: 'dlc-staff-edit',
  standalone: true,
  styleUrl: './staff-edit.component.css',
  template: `
    <form (submit)="submit($event)" aria-label="Editar nombre de personal">
      <label>Nombre
        <input name="name" required maxlength="100" [value]="member().name"
          [disabled]="state() === 'saving'" />
      </label>
      <div class="actions">
        <button type="submit" [disabled]="state() === 'saving' || state() === 'conflict'">
          Guardar nombre
        </button>
        <button type="button" (click)="cancel.emit()" [disabled]="state() === 'saving'">
          Cancelar
        </button>
      </div>
      @if (state() === 'saving') {
        <p role="status">Guardando cambios…</p>
      } @else if (state() === 'invalid') {
        <p role="alert">Revisa el nombre ingresado.</p>
      } @else if (state() === 'conflict') {
        <p role="alert">Este registro cambió. Consúltalo de nuevo antes de editar.</p>
        <button type="button" (click)="refresh.emit()">Recargar registro</button>
      } @else if (state() === 'forbidden') {
        <p role="alert">No tienes permiso para editar este registro.</p>
      } @else if (state() === 'session-expired') {
        <p role="alert">La sesión terminó. Inicia sesión de nuevo.</p>
      } @else if (state() === 'not-found') {
        <p role="alert">El registro no está disponible.</p>
      } @else if (state() === 'error') {
        <p role="alert">No se pudo guardar el nombre. Puedes reintentar.</p>
      }
    </form>
  `,
})
export class StaffEditComponent {
  private readonly directory = inject(StaffDirectoryService);
  private readonly destroyRef = inject(DestroyRef);
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
    const name = String(new FormData(form).get('name') ?? '').trim();
    if (name === this.member().name) {
      this.cancel.emit();
      return;
    }
    this.state.set('saving');
    const result = await this.directory.updateName(this.member().id, name, this.member().version);
    if (this.destroyRef.destroyed) return;
    if (result.kind === 'updated') {
      this.saved.emit(result.staff);
    } else {
      this.state.set(result.kind === 'unavailable' ? 'error' : result.kind);
    }
  }
}
