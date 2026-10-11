import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { PasswordResetService } from '../data/password-reset.service';

@Component({
  selector: 'dlc-reset-password',
  standalone: true,
  styleUrl: './recover-password.component.css',
  template: `
    <div class="recovery-card">
      <h1>Restablecer contraseña</h1>
      @if (state() === 'done') {
        <p role="status">La contraseña se actualizó. Inicia sesión de nuevo.</p>
      } @else {
        <p>Ingresa el código recibido por correo y una contraseña nueva.</p>
        <form (submit)="submit($event)">
          <label for="iam-reset-token">Código de recuperación</label>
          <input id="iam-reset-token" name="token" type="text" autocomplete="off" required
            [disabled]="state() === 'saving'" />
          <label for="iam-reset-password">Contraseña nueva</label>
          <input id="iam-reset-password" name="password" type="password"
            autocomplete="new-password" minlength="8" maxlength="72" required
            [disabled]="state() === 'saving'" />
          <label for="iam-reset-confirm">Confirmar contraseña</label>
          <input id="iam-reset-confirm" name="confirmation" type="password"
            autocomplete="new-password" minlength="8" maxlength="72" required
            [disabled]="state() === 'saving'" />
          <button type="submit" [disabled]="state() === 'saving'">Guardar contraseña</button>
          @if (state() === 'invalid') {
            <p role="alert">Verifica el código y la contraseña: mínimo 8 caracteres, una mayúscula y un número.</p>
          } @else if (state() === 'rate-limited') {
            <p role="alert">Hay demasiados intentos. Espera antes de volver a intentar.</p>
          } @else if (state() === 'error') {
            <p role="alert">No se pudo restablecer la contraseña. Inténtalo de nuevo.</p>
          }
        </form>
      }
      <button type="button" class="text-link" (click)="backToRecovery.emit()">
        Solicitar otro código
      </button>
      <button type="button" class="text-link" (click)="backToLogin.emit()">
        Volver a iniciar sesión
      </button>
    </div>
  `,
})
export class ResetPasswordComponent {
  private readonly service = inject(PasswordResetService);
  private readonly destroyRef = inject(DestroyRef);
  readonly backToRecovery = output<void>();
  readonly backToLogin = output<void>();
  readonly state = signal<'editing' | 'saving' | 'done' | 'invalid' | 'rate-limited' | 'error'>('editing');

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.state() === 'saving' || this.state() === 'done') return;
    const form = event.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) return;
    const fields = new FormData(form);
    const token = String(fields.get('token') ?? '');
    const password = String(fields.get('password') ?? '');
    if (password !== String(fields.get('confirmation') ?? '')) {
      this.state.set('invalid');
      return;
    }
    this.state.set('saving');
    const result = await this.service.reset(token, password);
    if (this.destroyRef.destroyed) return;
    this.state.set(result === 'unavailable' ? 'error' : result === 'reset' ? 'done' : result);
  }
}
