import { test, expect } from '@playwright/test';
import { LoginAPI } from '../api-helpers/login-api';

test.describe('MFA Authentication Flow', () => {
  let loginAPI: LoginAPI;

  test.beforeEach(async ({ request }) => {
    loginAPI = new LoginAPI(request);
  });

  test('should successfully login with MFA', async () => {
    // Step 1: Initial login
    const loginResponse = await loginAPI.login({
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'password123'
    });

    expect(loginResponse.status()).toBe(200);
    const loginData = await loginResponse.json();
    expect(loginData.mfaRequired).toBe(true);

    // Step 2: Submit MFA code
    const mfaResponse = await loginAPI.submitMFACode({
      sessionToken: loginData.sessionToken,
      mfaCode: await loginAPI.getMFACode() // This would be implemented based on your MFA provider
    });

    expect(mfaResponse.status()).toBe(200);
    const mfaData = await mfaResponse.json();
    expect(mfaData.accessToken).toBeDefined();
  });

  test('should fail with invalid MFA code', async () => {
    // Step 1: Initial login
    const loginResponse = await loginAPI.login({
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'password123'
    });

    expect(loginResponse.status()).toBe(200);
    const loginData = await loginResponse.json();

    // Step 2: Submit invalid MFA code
    const mfaResponse = await loginAPI.submitMFACode({
      sessionToken: loginData.sessionToken,
      mfaCode: '000000' // Invalid code
    });

    expect(mfaResponse.status()).toBe(401);
    const errorData = await mfaResponse.json();
    expect(errorData.error).toBe('Invalid MFA code');
  });
});