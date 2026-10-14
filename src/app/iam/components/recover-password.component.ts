import { Component, DestroyRef, EventEmitter, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IamApiService } from '../data/iam-api.service';

@Component({
  selector: 'dlc-recover-password',
  standalone: true,
  styleUrl: './recover-password.component.css',
  template: `
    <div class="recovery-card">
      <span class="recovery-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round">
          <circle cx="8" cy="12" r="4" />
          <path d="M12 12h8m-3 0v3m3-3v2" />
        </svg>
      </span>
      <h1>Recuperar contraseña</h1>
      @if (submitted) {
        <p role="status">Si la cuenta existe, recibirás instrucciones en tu correo.</p>
      } @else {
        <p>Ingresa el correo de tu cuenta de personal para recibir instrucciones.</p>
        <form (submit)="submit($event)">
          <label for="iam-recovery-email">Correo electrónico</label>
          <div class="recovery-email-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m4 7 8 6 8-6" />
            </svg>
            <input
              id="iam-recovery-email"
              name="email"
              type="email"
              autocomplete="email"
              placeholder="correo@clinica.com"
              [value]="email"
              (input)="email = $any($event.target).value"
              required
            />
          </div>
          <button type="submit" [disabled]="loading">Enviar instrucciones</button>
          @if (errorMessage) {
            <p role="alert">{{ errorMessage }}</p>
          }
        </form>
      }
      <div class="recovery-code-links">
        <button type="button" class="text-link" (click)="verifyEmail.emit()">
          Ya tengo un código de verificación
        </button>
        <button type="button" class="text-link" (click)="resetPassword.emit()">
          Ya tengo un código de recuperación
        </button>
      </div>
      <button type="button" class="text-link back-link" (click)="backToLogin.emit()">
        <span aria-hidden="true">←</span> Volver a iniciar sesión
      </button>
    </div>
  `,
})
export class RecoverPasswordComponent {
  private readonly api = inject(IamApiService);
  private readonly destroyRef = inject(DestroyRef);

  @Output() readonly backToLogin = new EventEmitter<void>();
  @Output() readonly resetPassword = new EventEmitter<void>();
  @Output() readonly verifyEmail = new EventEmitter<void>();
  email = '';
  loading = false;
  submitted = false;
  errorMessage = '';

  submit(event: Event): void {
    event.preventDefault();
    if (this.loading || this.submitted) return;

    this.loading = true;
    this.errorMessage = '';
    this.api.requestPasswordRecovery(this.email.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading = false;
          this.submitted = true;
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'No se pudo enviar la solicitud. Inténtalo de nuevo.';
        },
      });
  }
}
