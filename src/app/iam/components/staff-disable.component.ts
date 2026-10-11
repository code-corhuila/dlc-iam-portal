import { Component, DestroyRef, OnChanges, SimpleChanges, computed, inject, input, output, signal } from '@angular/core';
import { StaffDirectoryService } from '../data/staff-directory.service';
import type { Staff } from '../model/staff';

@Component({
  selector: 'dlc-staff-disable',
  standalone: true,
  styleUrl: './staff-disable.component.css',
  template: `
    <form (submit)="submit($event)" (input)="invalidateKey()" aria-label="Deshabilitar personal">
      <h3>Deshabilitar a {{ member().name }}</h3>
      <p>Esta acción revoca sus sesiones. Auth confirma y registra la operación.</p>
      <label>Motivo
        <textarea name="reason" required maxlength="1000" rows="3"
          [disabled]="state() === 'saving' || terminalResponse()"></textarea>
      </label>
      <div class="actions">
        <button type="submit" [disabled]="submitBlocked()">
          Confirmar deshabilitación
        </button>
        <button type="button" (click)="cancel.emit()" [disabled]="state() === 'saving'">Cancelar</button>
      </div>
      @if (state() === 'saving') {
        <p role="status">Deshabilitando personal…</p>
      } @else if (state() === 'invalid') {
        <p role="alert">Escribe un motivo válido.</p>
      } @else if (state() === 'conflict') {
        <p role="alert">Este registro cambió. Consúltalo de nuevo antes de deshabilitar.</p>
        <button type="button" (click)="refreshRecord()">Recargar registro</button>
      } @else if (state() === 'forbidden') {
        <p role="alert">No tienes permiso para deshabilitar este registro.</p>
      } @else if (state() === 'session-expired') {
        <p role="alert">La sesión terminó. Inicia sesión de nuevo.</p>
      } @else if (state() === 'not-found') {
        <p role="alert">El registro no está disponible.</p>
      } @else if (state() === 'error') {
        <p role="alert">No se pudo deshabilitar. Puedes reintentar.</p>
      }
    </form>
  `,
})
export class StaffDisableComponent implements OnChanges {
  private readonly directory = inject(StaffDirectoryService);
  private readonly destroyRef = inject(DestroyRef);
  readonly member = input.required<Staff>();
  readonly saved = output<Staff>();
  readonly cancel = output<void>();
  readonly refresh = output<void>();
  readonly state = signal<'editing' | 'saving' | 'invalid' | 'conflict' | 'forbidden' |
    'session-expired' | 'not-found' | 'error'>('editing');
  readonly terminalResponse = computed(() => this.state() === 'forbidden' ||
    this.state() === 'session-expired' || this.state() === 'not-found');
  readonly submitBlocked = computed(() =>
    this.state() !== 'editing' && this.state() !== 'invalid' && this.state() !== 'error');
  private idempotencyKey: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['member'];
    if (change && !change.firstChange &&
      (this.state() === 'conflict' || !this.submitBlocked()) &&
      (change.previousValue?.id !== change.currentValue?.id ||
        change.previousValue?.version !== change.currentValue?.version)) {
      this.idempotencyKey = null;
      this.state.set('editing');
    }
  }

  refreshRecord(): void {
    this.idempotencyKey = null;
    this.refresh.emit();
  }

  invalidateKey(): void {
    if (this.submitBlocked()) return;
    this.idempotencyKey = null;
    this.state.set('editing');
  }

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submitBlocked()) return;
    const form = event.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) return;
    const reason = String(new FormData(form).get('reason') ?? '').trim();
    this.idempotencyKey ??= globalThis.crypto.randomUUID();
    this.state.set('saving');
    const result = await this.directory.disable(this.member(), reason, this.idempotencyKey);
    if (this.destroyRef.destroyed) return;
    if (result.kind === 'disabled') {
      this.saved.emit(result.staff);
    } else {
      this.state.set(result.kind === 'unavailable' ? 'error' : result.kind);
    }
  }
}
