import { Observable } from 'rxjs';
import { LoginCredentials } from '../model/auth';

export abstract class IamApiService {
  abstract login(credentials: LoginCredentials): Observable<void>;
  abstract requestPasswordRecovery(email: string): Observable<void>;
}
