import { Component, EventEmitter, Output, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IamApiService } from '../data/iam-api.service';
import { MfaChallenge } from '../model/auth';

@Component({
  selector: 'dlc-sign-in-form',
  standalone: true,
  styleUrl: './sign-in-form.component.css',
  template: `
    <form (submit)="submit($event)">
      <h1>Ingreso Usuario</h1>
      <p class="subtitle">Ingresa con tu cuenta de personal para acceder a tus funciones.</p>
      <label for="sign-in-email">Correo electrónico</label>
      <input
        id="sign-in-email"
        name="email"
        type="email"
        [value]="email"
        (input)="email = $any($event.target).value"
        required
      />

      <label for="sign-in-password">Contraseña</label>
      <input
        id="sign-in-password"
        name="password"
        type="password"
        [value]="password"
        (input)="password = $any($event.target).value"
        required
      />

      <button type="submit" [disabled]="loading">Iniciar sesión</button>

      @if (errorMessage) {
        <p role="alert">{{ errorMessage }}</p>
      }
    </form>
  `,
})
export class SignInFormComponent {
  private readonly api = inject(IamApiService);
  private readonly destroyRef = inject(DestroyRef);

  @Output() readonly challenge = new EventEmitter<MfaChallenge>();

  email = '';
  password = '';
  errorMessage = '';
  loading = false;

  submit(event: Event): void {
    event.preventDefault();
    if (this.loading) return;

    this.loading = true;
    this.errorMessage = '';

    this.api.login({ email: this.email, password: this.password })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (challenge) => this.challenge.emit(challenge),
        error: () => {
          this.loading = false;
          this.errorMessage = 'No se pudo completar la autenticación.';
        },
      });
  }
}
