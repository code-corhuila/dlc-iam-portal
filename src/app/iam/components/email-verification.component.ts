import { Component, DestroyRef, EventEmitter, Output, inject, signal } from '@angular/core';
import { EmailVerificationService } from '../data/email-verification.service';

type State = 'editing' | 'saving' | 'verified' | 'invalid' | 'conflict' |
  'rate-limited' | 'unavailable';

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
            [disabled]="submitBlocked()" required />
          <button type="submit"
            [disabled]="submitBlocked()">
            Verificar correo
          </button>
          @if (state() === 'invalid') {
            <p role="alert">El código no es válido o ya venció.</p>
          } @else if (state() === 'conflict') {
            <p role="alert">El código no se pudo usar. Si ya verificaste el correo, intenta iniciar sesión; si continúa pendiente, solicita ayuda al administrador.</p>
          } @else if (state() === 'rate-limited') {
            <p role="alert">Demasiados intentos. Inténtalo más tarde.</p>
          } @else if (state() === 'unavailable') {
            <p role="alert">No pudimos confirmar si se verificó el correo. Intenta iniciar sesión; si continúa pendiente, solicita ayuda al administrador.</p>
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
  private readonly destroyRef = inject(DestroyRef);
  @Output() readonly backToLogin = new EventEmitter<void>();
  readonly token = signal('');
  readonly state = signal<State>('editing');
  readonly submitBlocked = () => this.state() === 'saving' || this.state() === 'conflict' ||
    this.state() === 'rate-limited' || this.state() === 'unavailable';

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submitBlocked() || this.state() === 'verified') return;
    if (!this.token().trim()) {
      this.state.set('invalid');
      return;
    }
    this.state.set('saving');
    const result = await this.verification.verify(this.token());
    if (this.destroyRef.destroyed) return;
    this.state.set(result);
    if (result === 'verified' || result === 'conflict' ||
        result === 'unavailable') this.token.set('');
  }
}
