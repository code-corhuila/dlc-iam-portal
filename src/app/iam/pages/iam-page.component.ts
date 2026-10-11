import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { SignInFormComponent } from '../components/sign-in-form.component';

@Component({
  selector: 'dlc-iam-page',
  standalone: true,
  imports: [SignInFormComponent],
  styleUrl: './iam-page.component.css',
  template: `
    <section class="iam-auth-surface" aria-label="Acceso del personal">
      @if (authenticated()) {
        <section class="auth-status" role="status" aria-live="polite">
          <h1>Ingreso confirmado</h1>
          <p>Tu sesión está activa. Continuando en el portal...</p>
        </section>
      } @else {
        <dlc-sign-in-form
          [showRecoveryLink]="showRecoveryLink"
          (authenticated)="authenticated.set(true)"
          (recoverPassword)="recoverPassword.emit()"
        />
      }
    </section>
  `,
})
export class IamPageComponent {
  @Input() showRecoveryLink = false;
  @Output() readonly recoverPassword = new EventEmitter<void>();
  readonly authenticated = signal(false);
}
