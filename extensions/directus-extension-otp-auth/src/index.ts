import { defineEndpoint } from '@directus/extensions-sdk';
import { requestOTP } from './endpoints/request-otp';
import { verifyOTP } from './endpoints/verify-otp';
import { getMe } from './endpoints/me';

export default defineEndpoint((router, context) => {
  const { database, services, getSchema, env } = context;

  // POST /otp/request - Demander un code OTP
  router.post('/request', async (req, res) => {
    await requestOTP(req, res, { database, services, getSchema, env });
  });

  // POST /otp/verify - Vérifier un code OTP et obtenir un token
  router.post('/verify', async (req, res) => {
    await verifyOTP(req, res, { database, services, getSchema, env });
  });

  router.get('/me', async (req, res) => {
    await getMe(req, res, { database, services, getSchema, env });
  });

  // GET /otp/health - Vérifier que l'extension fonctionne
  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      extension: 'directus-extension-otp-auth',
      version: '1.0.0',
      endpoints: [
        'POST /otp/request',
        'POST /otp/verify',
        'GET /otp/me',
        'GET /otp/health'
      ]
    });
  });
});

