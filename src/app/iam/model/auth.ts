export interface LoginCredentials {
  email: string;
  password: string;
}

export interface MfaChallenge {
  challengeId: string;
  expiresAt: string;
  mfaRequired: true;
}