import { Component, signal } from '@angular/core';
import { SignInFormComponent } from '../components/sign-in-form.component';
import { MfaChallenge } from '../model/auth';

@Component({
  selector: 'dlc-iam-page',
  standalone: true,
  imports: [SignInFormComponent],
  styleUrl: './iam-page.component.css',
  template: `
    <section class="iam-auth-surface" aria-label="Acceso del personal">
      @if (challenge()) {
        <section aria-live="polite">
          <h1>Verificación adicional requerida</h1>
        </section>
      } @else {
        <dlc-sign-in-form (challenge)="showMfa($event)" />
      }
    </section>
  `,
})
export class IamPageComponent {
  readonly challenge = signal<MfaChallenge | null>(null);

  showMfa(value: MfaChallenge): void {
    this.challenge.set(value);
  }
}
