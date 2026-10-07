import { Observable } from 'rxjs';
import { LoginCredentials, MfaChallenge } from '../model/auth';

export abstract class IamApiService {
  abstract login(credentials: LoginCredentials): Observable<MfaChallenge>;
}
