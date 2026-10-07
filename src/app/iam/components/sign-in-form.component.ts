import { Component, EventEmitter, Output, inject } from '@angular/core';
import { IamApiService } from '../data/iam-api.service';
import { MfaChallenge } from '../model/auth';

@Component({
    selector: 'dlc-sign-in-form',
    standalone: true,
    template: `
    <form (submit)="submit($event)">
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

        this.api.login({ email: this.email, password: this.password }).subscribe({
            next: (challenge) => this.challenge.emit(challenge),
            error: () => {
                this.loading = false;
                this.errorMessage = 'No se pudo completar la autenticación.';
            },
        });
    }
}