import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { EmailVerificationService } from '../data/email-verification.service';

type State = 'editing' | 'saving' | 'verified' | 'invalid' | 'rate-limited' | 'unavailable';

@Component({
  selector: 'dlc-email-verification',
  standalone: true,
  styleUrl: './recover-password.component.css',
  template: `
    <div class="recovery-card">
      <h1>Verificar correo</h1>
      @if (state() === 'verified') {
        <p role="status">Tu correo fue verificado. Ya puedes iniciar sesión.</p>
      } @else {
        <p>Ingresa el código de verificación recibido en tu correo.</p>
        <form (submit)="submit($event)">
          <label for="iam-verification-token">Código de verificación</label>
          <input id="iam-verification-token" name="token" type="text"
            autocomplete="one-time-code" autocapitalize="off" spellcheck="false"
            [value]="token()" (input)="token.set($any($event.target).value)"
            [disabled]="state() === 'saving' || state() === 'rate-limited'" required />
          <button type="submit"
            [disabled]="state() === 'saving' || state() === 'rate-limited'">
            Verificar correo
          </button>
          @if (state() === 'invalid') {
            <p role="alert">El código no es válido o ya venció.</p>
          } @else if (state() === 'rate-limited') {
            <p role="alert">Demasiados intentos. Inténtalo más tarde.</p>
          } @else if (state() === 'unavailable') {
            <p role="alert">No se pudo verificar el correo. Inténtalo de nuevo.</p>
          }
        </form>
      }
      <button type="button" class="text-link" (click)="backToLogin.emit()">
        Volver a iniciar sesión
      </button>
    </div>
  `,
})
export class EmailVerificationComponent {
  private readonly verification = inject(EmailVerificationService);
  @Output() readonly backToLogin = new EventEmitter<void>();
  readonly token = signal('');
  readonly state = signal<State>('editing');

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.state() === 'saving' || this.state() === 'verified' ||
        this.state() === 'rate-limited') return;
    if (!this.token().trim()) {
      this.state.set('invalid');
      return;
    }
    this.state.set('saving');
    const result = await this.verification.verify(this.token());
    this.state.set(result);
    if (result === 'verified') this.token.set('');
  }
}
