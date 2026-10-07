import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginCredentials, MfaChallenge } from '../model/auth';

@Injectable({ providedIn: 'root' })
export class IamApiService {
  private readonly http = inject(HttpClient);

  login(credentials: LoginCredentials): Observable<MfaChallenge> {
    return this.http.post<MfaChallenge>('/api/v1/auth/login', credentials);
  }
}