import { Component, DestroyRef, EventEmitter, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IamApiService } from '../data/iam-api.service';

@Component({
  selector: 'dlc-recover-password',
  standalone: true,
  styleUrl: './recover-password.component.css',
  template: `
    <div class="recovery-card">
      <h1>Recuperar contraseña</h1>
      @if (submitted) {
        <p role="status">Si la cuenta existe, recibirás instrucciones en tu correo.</p>
      } @else {
        <p>Ingresa el correo de tu cuenta de personal.</p>
        <form (submit)="submit($event)">
          <label for="iam-recovery-email">Correo electrónico</label>
          <input
            id="iam-recovery-email"
            name="email"
            type="email"
            autocomplete="email"
            [value]="email"
            (input)="email = $any($event.target).value"
            required
          />
          <button type="submit" [disabled]="loading">Enviar instrucciones</button>
          @if (errorMessage) {
            <p role="alert">{{ errorMessage }}</p>
          }
        </form>
      }
      <button type="button" class="text-link" (click)="backToLogin.emit()">
        Volver a iniciar sesión
      </button>
    </div>
  `,
})
export class RecoverPasswordComponent {
  private readonly api = inject(IamApiService);
  private readonly destroyRef = inject(DestroyRef);

  @Output() readonly backToLogin = new EventEmitter<void>();
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
