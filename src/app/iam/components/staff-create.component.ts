import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { StaffDirectoryService, type StaffCreateInput } from '../data/staff-directory.service';

@Component({
  selector: 'dlc-staff-create',
  standalone: true,
  styleUrl: './staff-create.component.css',
  template: `
    <section aria-label="Crear personal">
      <h2>Crear personal</h2>
      @if (state() === 'created') {
        <p role="status">Cuenta creada. La verificación de correo está pendiente.</p>
        <button type="button" (click)="close.emit()">Volver al listado</button>
      } @else {
        <form (submit)="submit($event)" (input)="invalidateKey()" (change)="invalidateKey()">
          <label>Nombre
            <input name="name" required maxlength="100" autocomplete="off"
              [disabled]="state() === 'loading'" />
          </label>
          <label>Correo electrónico
            <input name="email" type="email" required maxlength="255" autocomplete="off"
              [disabled]="state() === 'loading'" />
          </label>
          <label>Contraseña inicial
            <input name="password" type="password" required minlength="8" maxlength="72"
              autocomplete="new-password" [disabled]="state() === 'loading'" />
          </label>
          <p class="hint">Mínimo ocho caracteres, una mayúscula y un número; máximo 72 bytes.</p>
          <label>Rol
            <select name="role" required [disabled]="state() === 'loading'">
              <option value="" disabled selected>Selecciona un rol</option>
              <option value="DENTIST">Odontólogo</option>
              <option value="SECRETARY_ASSISTANT">Secretaría o asistencia</option>
            </select>
          </label>
          <div class="actions">
            <button type="submit" [disabled]="state() === 'loading'">Crear cuenta</button>
            <button type="button" (click)="close.emit()" [disabled]="state() === 'loading'">Cancelar</button>
          </div>
        </form>
        @if (state() === 'loading') {
          <p role="status">Creando cuenta…</p>
        } @else if (state() === 'invalid') {
          <p role="alert">Revisa los datos ingresados.</p>
        } @else if (state() === 'conflict') {
          <p role="alert">No se pudo crear: los datos ya están registrados.</p>
        } @else if (state() === 'forbidden') {
          <p role="alert">No tienes permiso para crear personal.</p>
        } @else if (state() === 'session-expired') {
          <p role="alert">La sesión terminó. Inicia sesión de nuevo.</p>
        } @else if (state() === 'error') {
          <p role="alert">No se pudo crear la cuenta. Puedes reintentar.</p>
        }
      }
    </section>
  `,
})
export class StaffCreateComponent {
  private readonly directory = inject(StaffDirectoryService);
  private readonly destroyRef = inject(DestroyRef);
  readonly close = output<void>();
  readonly state = signal<'editing' | 'loading' | 'created' | 'invalid' | 'conflict' |
    'forbidden' | 'session-expired' | 'error'>('editing');
  private idempotencyKey: string | null = null;

  invalidateKey(): void {
    this.idempotencyKey = null;
    if (this.state() !== 'loading') this.state.set('editing');
  }

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.state() === 'loading') return;
    const form = event.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) return;
    const values = new FormData(form);
    const input: StaffCreateInput = {
      name: String(values.get('name') ?? '').trim(),
      email: String(values.get('email') ?? '').trim(),
      password: String(values.get('password') ?? ''),
      role: String(values.get('role') ?? '') as StaffCreateInput['role'],
    };
    this.idempotencyKey ??= globalThis.crypto.randomUUID();
    this.state.set('loading');
    const result = await this.directory.create(input, this.idempotencyKey);
    if (this.destroyRef.destroyed) return;
    if (result.kind === 'created') {
      form.reset();
      this.idempotencyKey = null;
      this.state.set('created');
    } else {
      this.state.set(result.kind === 'unavailable' ? 'error' : result.kind);
    }
  }
}
