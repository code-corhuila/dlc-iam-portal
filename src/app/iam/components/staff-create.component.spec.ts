/// <reference types="vitest/globals" />
import { TestBed } from '@angular/core/testing';
import { StaffDirectoryService } from '../data/staff-directory.service';
import { StaffCreateComponent } from './staff-create.component';

describe('StaffCreateComponent', () => {
  async function render(create: ReturnType<typeof vi.fn>, role: 'DENTIST' | null = 'DENTIST') {
    await TestBed.configureTestingModule({
      imports: [StaffCreateComponent],
      providers: [{ provide: StaffDirectoryService, useValue: { create } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(StaffCreateComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const form = host.querySelector('form');
    if (!form) throw new Error('Create form is missing');
    for (const [name, value] of Object.entries({
      name: 'Ana Pérez', email: 'ana@example.test', password: 'StrongPass1',
    })) {
      const input = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (!input) throw new Error(`${name} input is missing`);
      input.value = value;
    }
    if (role) {
      const select = form.querySelector<HTMLSelectElement>('select[name="role"]');
      if (!select) throw new Error('Role selector is missing');
      select.value = role;
    }
    const submit = () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return { fixture, host, form, submit };
  }

  it('requires an explicit role selection before creating staff', async () => {
    const create = vi.fn();
    const { form, submit } = await render(create, null);
    expect(form.querySelector<HTMLSelectElement>('select[name="role"]')?.value).toBe('');
    expect(form.checkValidity()).toBe(false);
    submit();
    expect(create).not.toHaveBeenCalled();
  });

  it('submits the permitted role and hides the password after creation', async () => {
    const create = vi.fn().mockResolvedValue({ kind: 'created', staff: { id: 'created' } });
    const { fixture, host, submit } = await render(create);
    submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(create).toHaveBeenCalledWith({
      name: 'Ana Pérez', email: 'ana@example.test', password: 'StrongPass1', role: 'DENTIST',
    }, expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
    expect(host.querySelector('[role="status"]')).not.toBeNull();
    expect(host.querySelector('input[type="password"]')).toBeNull();
  });

  it('ignores a duplicate submit and reuses the key after a transport failure', async () => {
    let resolve!: (value: unknown) => void;
    const create = vi.fn().mockImplementationOnce(() => new Promise((done) => { resolve = done; }))
      .mockResolvedValue({ kind: 'unavailable' });
    const { fixture, host, submit } = await render(create);
    submit();
    submit();
    fixture.detectChanges();
    expect(create).toHaveBeenCalledTimes(1);
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);

    resolve({ kind: 'unavailable' });
    await fixture.whenStable();
    fixture.detectChanges();
    submit();
    await fixture.whenStable();
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][1]).toBe(create.mock.calls[0][1]);

    const email = host.querySelector<HTMLInputElement>('input[name="email"]');
    if (!email) throw new Error('Email input is missing');
    email.value = 'other@example.test';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    submit();
    await fixture.whenStable();
    expect(create.mock.calls[2][1]).not.toBe(create.mock.calls[0][1]);
  });

  it.each(['invalid', 'conflict', 'forbidden', 'session-expired', 'unavailable'])
  ('shows an alert for %s without exposing the password', async (kind) => {
    const { fixture, host, submit } = await render(vi.fn().mockResolvedValue({ kind }));
    submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    expect(host.textContent).not.toContain('StrongPass1');
  });
});
