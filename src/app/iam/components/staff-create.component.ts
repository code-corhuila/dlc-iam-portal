import { AfterViewInit, Component, DestroyRef, ElementRef, ViewChild, inject, output, signal } from '@angular/core';
import { StaffDirectoryService, type StaffCreateInput } from '../data/staff-directory.service';

@Component({
  selector: 'dlc-staff-create',
  standalone: true,
  styleUrl: './staff-create.component.css',
  template: `
    <section class="create-panel" (keydown.escape)="closeOnEscape($event)"
      (keydown.tab)="trapTab($event)">
      <header class="modal-heading">
        <div>
          <h2 id="staff-create-title">Registrar nuevo usuario</h2>
          <p id="staff-create-subtitle">Asignación de datos personales y rol laboral</p>
        </div>
        <button class="close-button" type="button" aria-label="Cerrar registro"
          (click)="close.emit()" [disabled]="state() === 'loading'">×</button>
      </header>
      @if (state() === 'created') {
        <p class="success-message" role="status">Cuenta creada. La verificación de correo está pendiente.</p>
        <button class="done-button" type="button" (click)="close.emit()">Volver al listado</button>
      } @else {
        <p class="role-notice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>
          </svg>
          <span>Solo se pueden registrar usuarios de tipo Odontólogo o Asistente/Secretaría.
            La creación de administradores sigue un procedimiento auditado.</span>
        </p>
        <form (submit)="submit($event)" (input)="invalidateKey()" (change)="invalidateKey()">
          <div class="field-grid">
            <label>Nombre <span class="required" aria-hidden="true">*</span>
              <input #firstField name="name" required maxlength="100" autocomplete="off"
                placeholder="Ej. Carlos" [disabled]="state() === 'loading'" />
            </label>
            <label>Apellido <span class="required" aria-hidden="true">*</span>
              <input name="surname" required maxlength="100" autocomplete="off"
                placeholder="Ej. Mendoza" [disabled]="state() === 'loading'" />
            </label>
            <label>Correo electrónico <span class="required" aria-hidden="true">*</span>
              <input name="email" type="email" required maxlength="255" autocomplete="off"
                placeholder="ejemplo@dilucca.com" [disabled]="state() === 'loading'" />
            </label>
            <label>Contraseña de acceso <span class="required" aria-hidden="true">*</span>
              <input name="password" type="password" required minlength="8" maxlength="72"
                autocomplete="new-password" placeholder="Mínimo 8 caracteres"
                aria-describedby="staff-password-guidance" [disabled]="state() === 'loading'" />
              <span class="hint" id="staff-password-guidance">Mínimo ocho caracteres, una mayúscula y un número; máximo 72 bytes.</span>
            </label>
            <label>Número de documento
              <input name="document" type="text" placeholder="Ej. 1000000002"
                aria-describedby="staff-unavailable-fields" disabled />
            </label>
            <label>Teléfono móvil
              <input name="mobile" type="tel" placeholder="Ej. +57 3100000000"
                aria-describedby="staff-unavailable-fields" disabled />
            </label>
            <p class="unavailable-note" id="staff-unavailable-fields">
              Aún no disponible: documento y teléfono no se guardan en esta versión.
            </p>
            <label class="role-field">Rol/Cargo en el consultorio <span class="required" aria-hidden="true">*</span>
              <select name="role" required [disabled]="state() === 'loading'">
                <option value="" disabled selected>Selecciona un rol</option>
                <option value="DENTIST">Odontólogo</option>
                <option value="SECRETARY_ASSISTANT">Secretaría o asistencia</option>
              </select>
            </label>
          </div>
          @if (state() === 'invalid') {
            <p class="form-message" role="alert">Revisa los datos ingresados.</p>
          } @else if (state() === 'conflict') {
            <p class="form-message" role="alert">No se pudo crear: los datos ya están registrados.</p>
          } @else if (state() === 'forbidden') {
            <p class="form-message" role="alert">No tienes permiso para crear personal.</p>
          } @else if (state() === 'session-expired') {
            <p class="form-message" role="alert">La sesión terminó. Inicia sesión de nuevo.</p>
          } @else if (state() === 'error') {
            <p class="form-message" role="alert">No se pudo crear la cuenta. Puedes reintentar.</p>
          }
          <div class="actions">
            <button class="cancel-button" type="button" (click)="close.emit()"
              [disabled]="state() === 'loading'">Cancelar</button>
            <button class="submit-button" type="submit" [disabled]="state() === 'loading'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M4 4h13l3 3v13H4zM8 4v6h8V4M8 20v-7h8v7" />
              </svg>Crear usuario
            </button>
          </div>
        </form>
        @if (state() === 'loading') {
          <p role="status">Creando cuenta…</p>
        }
      }
    </section>
  `,
})
export class StaffCreateComponent implements AfterViewInit {
  private readonly directory = inject(StaffDirectoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  @ViewChild('firstField') firstField?: ElementRef<HTMLInputElement>;
  readonly close = output<void>();
  readonly state = signal<'editing' | 'loading' | 'created' | 'invalid' | 'conflict' |
    'forbidden' | 'session-expired' | 'error'>('editing');
  private idempotencyKey: string | null = null;

  ngAfterViewInit(): void {
    this.firstField?.nativeElement.focus();
  }

  closeOnEscape(event: Event): void {
    if (this.state() === 'loading') return;
    event.preventDefault();
    this.close.emit();
  }

  trapTab(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const controls = [...(this.host.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled)',
    )];
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (keyboardEvent.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  invalidateKey(): void {
    this.idempotencyKey = null;
    if (this.state() !== 'loading') this.state.set('editing');
  }

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.state() === 'loading') return;
    const form = event.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) return;
    const values = new FormData(form);
    const name = [String(values.get('name') ?? '').trim(), String(values.get('surname') ?? '').trim()]
      .filter(Boolean).join(' ');
    if (name.length > 100) {
      this.state.set('invalid');
      return;
    }
    const input: StaffCreateInput = {
      name,
      email: String(values.get('email') ?? '').trim(),
      password: String(values.get('password') ?? ''),
      role: String(values.get('role') ?? '') as StaffCreateInput['role'],
    };
    this.idempotencyKey ??= globalThis.crypto.randomUUID();
    this.state.set('loading');
    const result = await this.directory.create(input, this.idempotencyKey);
    if (this.destroyRef.destroyed) return;
    if (result.kind === 'created') {
      form.reset();
      this.idempotencyKey = null;
      this.state.set('created');
    } else {
      this.state.set(result.kind === 'unavailable' ? 'error' : result.kind);
    }
  }
}
