import { Component, DestroyRef, OnChanges, SimpleChanges, inject, input, output, signal } from '@angular/core';
import { StaffDirectoryService } from '../data/staff-directory.service';
import type { Staff } from '../model/staff';

@Component({
  selector: 'dlc-staff-enable',
  standalone: true,
  styleUrl: './staff-enable.component.css',
  template: `
    <form (submit)="submit($event)" (input)="invalidateKey()" aria-label="Habilitar personal">
      <h3>Habilitar a {{ member().name }}</h3>
      <p>Auth verificará la cuenta. Las sesiones revocadas no se restauran.</p>
      <label>Motivo
        <textarea name="reason" required maxlength="1000" rows="3"
          [disabled]="state() === 'saving'"></textarea>
      </label>
      <div class="actions">
        <button type="submit" [disabled]="state() === 'saving' || state() === 'conflict'">
          Confirmar habilitación
        </button>
        <button type="button" (click)="cancel.emit()" [disabled]="state() === 'saving'">Cancelar</button>
      </div>
      @if (state() === 'saving') {
        <p role="status">Habilitando personal…</p>
      } @else if (state() === 'invalid') {
        <p role="alert">Escribe un motivo válido.</p>
      } @else if (state() === 'conflict') {
        <p role="alert">Este registro cambió. Consúltalo de nuevo antes de habilitar.</p>
        <button type="button" (click)="refreshRecord()">Recargar registro</button>
      } @else if (state() === 'forbidden') {
        <p role="alert">No tienes permiso para habilitar este registro.</p>
      } @else if (state() === 'session-expired') {
        <p role="alert">La sesión terminó. Inicia sesión de nuevo.</p>
      } @else if (state() === 'not-found') {
        <p role="alert">El registro no está disponible.</p>
      } @else if (state() === 'error') {
        <p role="alert">No se pudo habilitar. Puedes reintentar.</p>
      }
    </form>
  `,
})
export class StaffEnableComponent implements OnChanges {
  private readonly directory = inject(StaffDirectoryService);
  private readonly destroyRef = inject(DestroyRef);
  readonly member = input.required<Staff>();
  readonly saved = output<Staff>();
  readonly cancel = output<void>();
  readonly refresh = output<void>();
  readonly state = signal<'editing' | 'saving' | 'invalid' | 'conflict' | 'forbidden' |
    'session-expired' | 'not-found' | 'error'>('editing');
  private idempotencyKey: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['member'] && !changes['member'].firstChange) {
      this.idempotencyKey = null;
      this.state.set('editing');
    }
  }

  refreshRecord(): void {
    this.idempotencyKey = null;
    this.refresh.emit();
  }

  invalidateKey(): void {
    if (this.state() === 'saving') return;
    this.idempotencyKey = null;
    if (this.state() !== 'conflict') this.state.set('editing');
  }

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.state() === 'saving' || this.state() === 'conflict') return;
    const form = event.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) return;
    const reason = String(new FormData(form).get('reason') ?? '').trim();
    this.idempotencyKey ??= globalThis.crypto.randomUUID();
    this.state.set('saving');
    const result = await this.directory.enable(this.member(), reason, this.idempotencyKey);
    if (this.destroyRef.destroyed) return;
    if (result.kind === 'enabled') {
      this.saved.emit(result.staff);
    } else {
      this.state.set(result.kind === 'unavailable' ? 'error' : result.kind);
    }
  }
}
