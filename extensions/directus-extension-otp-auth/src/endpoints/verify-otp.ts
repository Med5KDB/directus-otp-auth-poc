import type { Request, Response } from 'express';
import { OTPGenerator } from '../services/otp-generator';
import { OTPStorage } from '../services/otp-storage';
import type { VerifyOTPPayload, AuthResponse } from '../types';
import jwt from 'jsonwebtoken';

const MAX_ATTEMPTS = 3;

export async function verifyOTP(
  req: Request,
  res: Response,
  { database, services, getSchema }: any
): Promise<void> {
  try {
    const { phone, code }: VerifyOTPPayload = req.body;

    if (!phone || !code) {
      res.status(400).json({
        success: false,
        error: 'Le numéro de téléphone et le code sont requis'
      } as AuthResponse);
      return;
    }

    const normalizedPhone = phone.trim().replace(/\s+/g, '');
    const normalizedCode = code.trim();

    if (!/^\d{6}$/.test(normalizedCode)) {
      res.status(400).json({
        success: false,
        error: 'Le code doit contenir 6 chiffres'
      } as AuthResponse);
      return;
    }

    const otpStorage = new OTPStorage(database);
    const otpRecord = await otpStorage.getLatestByPhone(normalizedPhone);

    if (!otpRecord) {
      res.status(404).json({
        success: false,
        error: 'Aucun code OTP trouvé. Veuillez en demander un nouveau.'
      } as AuthResponse);
      return;
    }

    if (OTPGenerator.isExpired(otpRecord.expires_at)) {
      res.status(400).json({
        success: false,
        error: 'Le code OTP a expiré. Veuillez en demander un nouveau.'
      } as AuthResponse);
      return;
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      res.status(429).json({
        success: false,
        error: 'Trop de tentatives. Veuillez demander un nouveau code.'
      } as AuthResponse);
      return;
    }

    const isValidCode = await OTPGenerator.verifyCode(normalizedCode, otpRecord.code);

    if (!isValidCode) {
      const newAttempts = await otpStorage.incrementAttempts(otpRecord.id!);
      const remainingAttempts = MAX_ATTEMPTS - newAttempts;

      res.status(401).json({
        success: false,
        error: remainingAttempts > 0 
          ? `Code invalide. ${remainingAttempts} tentative(s) restante(s).`
          : 'Code invalide. Trop de tentatives. Veuillez demander un nouveau code.'
      } as AuthResponse);
      return;
    }

    await otpStorage.markAsUsed(otpRecord.id!);

    const user = await database('User')
      .where({ id: otpRecord.user_id })
      .first();

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Utilisateur introuvable'
      } as AuthResponse);
      return;
    }

    // Générer les tokens JWT pour l'application Samacoach
    const secret = process.env.SECRET || 'directus_secret_to_sign_access_tokens';
    
    // Token payload pour utilisateurs finaux (pas admin Directus)
    const accessTokenPayload = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      type: 'user' // Pour différencier des tokens admin
    };
    
    const refreshTokenPayload = {
      id: user.id,
      type: 'user',
      session: jwt.sign({ user_id: user.id }, secret)
    };

    const accessToken = jwt.sign(accessTokenPayload, secret, { expiresIn: '15m' });
    const refreshToken = jwt.sign(refreshTokenPayload, secret, { expiresIn: '7d' });

    // Note: Pas besoin de directus_sessions pour les utilisateurs finaux
    // Les tokens JWT sont suffisants pour l'authentification de l'application

    // Nettoyer les codes expirés (maintenance)
    await otpStorage.cleanupExpired();


    res.status(200).json({
      success: true,
      message: 'Authentification réussie',
      access_token: accessToken,
      refresh_token: refreshToken,
      expires: 900000 // 15 minutes en millisecondes
    } as AuthResponse);

  } catch (error) {
    console.error('Erreur dans verifyOTP:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    } as AuthResponse);
  }
}

