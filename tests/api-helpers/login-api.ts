import { APIRequestContext } from '@playwright/test';

export class LoginAPI {
  private request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async login(credentials: { email: string; password: string }) {
    return await this.request.post('/api/auth/login', {
      data: credentials,
    });
  }

  async submitMFACode(data: { sessionToken: string; mfaCode: string }) {
    return await this.request.post('/api/auth/mfa-verify', {
      data: data,
    });
  }

  async getMFACode(): Promise<string> {
    // This method should be implemented based on your MFA provider
    // For example, if using TOTP (Time-based One-Time Password):
    // - You might want to generate the code using a secret key
    // - Or retrieve it from an authentication app simulator
    // For now, returning a placeholder
    return '123456';
  }
}