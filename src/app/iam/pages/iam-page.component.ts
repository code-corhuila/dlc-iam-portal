import { Component, EventEmitter, Input, OnDestroy, Output, signal } from '@angular/core';
import { SignInFormComponent } from '../components/sign-in-form.component';
import { MfaChallenge } from '../model/auth';

@Component({
  selector: 'dlc-iam-page',
  standalone: true,
  imports: [SignInFormComponent],
  styleUrl: './iam-page.component.css',
  template: `
    <section class="iam-auth-surface" aria-label="Acceso del personal">
      @if (failure()) {
        <section class="mfa-state" role="alert">
          <h1>{{ failure() === 'expired'
            ? 'La verificación expiró'
            : 'No se pudo continuar con la verificación' }}</h1>
          <p>Vuelve a iniciar sesión para solicitar una nueva verificación.</p>
          <button type="button" (click)="restartLogin()">Volver a iniciar sesión</button>
        </section>
      } @else if (challenge()) {
        <section class="mfa-state" aria-live="polite">
          <h1>Verificación adicional requerida</h1>
          <p>Tu acceso está pendiente de la verificación adicional.</p>
          <button type="button" (click)="restartLogin()">Volver a iniciar sesión</button>
        </section>
      } @else {
        <dlc-sign-in-form
          [showRecoveryLink]="showRecoveryLink"
          (challenge)="showMfa($event)"
          (recoverPassword)="recoverPassword.emit()"
        />
      }
    </section>
  `,
})
export class IamPageComponent implements OnDestroy {
  @Input() showRecoveryLink = false;
  @Output() readonly recoverPassword = new EventEmitter<void>();
  readonly challenge = signal<MfaChallenge | null>(null);
  readonly failure = signal<'expired' | 'invalid' | null>(null);
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  showMfa(value: MfaChallenge): void {
    this.clearExpiryTimer();
    this.challenge.set(null);
    const expiresAt = typeof value?.expiresAt === 'string'
      ? Date.parse(value.expiresAt)
      : NaN;
    const validId = typeof value?.challengeId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.challengeId);
    if (value?.mfaRequired !== true || !validId || !Number.isFinite(expiresAt)) {
      this.failure.set('invalid');
      return;
    }
    if (expiresAt <= Date.now()) {
      this.failure.set('expired');
      return;
    }

    this.challenge.set(value);
    this.failure.set(null);
    this.expiryTimer = setTimeout(() => {
      this.challenge.set(null);
      this.failure.set('expired');
      this.expiryTimer = null;
    }, expiresAt - Date.now());
  }

  restartLogin(): void {
    this.clearExpiryTimer();
    this.challenge.set(null);
    this.failure.set(null);
  }

  ngOnDestroy(): void {
    this.clearExpiryTimer();
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }
}
