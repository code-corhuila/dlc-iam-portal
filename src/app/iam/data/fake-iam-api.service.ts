import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { LoginCredentials } from '../model/auth';
import { IamApiService } from './iam-api.service';

@Injectable()
export class FakeIamApiService extends IamApiService {
  override requestPasswordRecovery(_email: string): Observable<void> {
    return throwError(() => new Error('Recovery is unavailable in the standalone preview'));
  }

  override login(_credentials: LoginCredentials): Observable<void> {
    return throwError(() => new Error('Login requires the shell session capability'));
  }
}
