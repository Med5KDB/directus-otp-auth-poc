import type { Request, Response } from "express";
import { OTPGenerator } from "../services/otp-generator";
import { OTPStorage } from "../services/otp-storage";
import type { VerifyOTPPayload, AuthResponse } from "../types";

const MAX_ATTEMPTS = 3;

export async function verifyOTP(
  req: Request,
  res: Response,
  { database, services, getSchema, env }: any
): Promise<void> {
  try {
    const { phone, code }: VerifyOTPPayload = req.body;

    if (!phone || !code) {
      res.status(400).json({
        success: false,
        error: "Le numéro de téléphone et le code sont requis",
      } as AuthResponse);
      return;
    }

    const normalizedPhone = phone.trim().replace(/\s+/g, "");
    const normalizedCode = code.trim();

    if (!/^\d{6}$/.test(normalizedCode)) {
      res.status(400).json({
        success: false,
        error: "Le code doit contenir 6 chiffres",
      } as AuthResponse);
      return;
    }

    const otpStorage = new OTPStorage(database);
    const otpRecord = await otpStorage.getLatestByPhone(normalizedPhone);

    if (!otpRecord) {
      res.status(404).json({
        success: false,
        error: "Aucun code OTP trouvé. Veuillez en demander un nouveau.",
      } as AuthResponse);
      return;
    }

    if (OTPGenerator.isExpired(otpRecord.expires_at)) {
      res.status(400).json({
        success: false,
        error: "Le code OTP a expiré. Veuillez en demander un nouveau.",
      } as AuthResponse);
      return;
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      res.status(429).json({
        success: false,
        error: "Trop de tentatives. Veuillez demander un nouveau code.",
      } as AuthResponse);
      return;
    }

    const isValidCode = await OTPGenerator.verifyCode(
      normalizedCode,
      otpRecord.code
    );

    if (!isValidCode) {
      const newAttempts = await otpStorage.incrementAttempts(otpRecord.id!);
      const remainingAttempts = MAX_ATTEMPTS - newAttempts;

      res.status(401).json({
        success: false,
        error:
          remainingAttempts > 0
            ? `Code invalide. ${remainingAttempts} tentative(s) restante(s).`
            : "Code invalide. Trop de tentatives. Veuillez demander un nouveau code.",
      } as AuthResponse);
      return;
    }

    await otpStorage.markAsUsed(otpRecord.id!);

    const user = await database("directus_users")
      .where({ id: otpRecord.user_id })
      .first();

    if (!user) {
      res.status(404).json({
        success: false,
        error: "Utilisateur introuvable",
      } as AuthResponse);
      return;
    }

    if (user.status !== "active") {
      res.status(403).json({
        success: false,
        error: "Le compte utilisateur n'est pas actif",
      } as AuthResponse);
      return;
    }

    const role = await database("directus_roles")
      .where({ id: user.role })
      .first();

    if (!role) {
      res.status(500).json({
        success: false,
        error: "Erreur lors de la récupération du rôle",
      } as AuthResponse);
      return;
    }

    // Utiliser AuthenticationService de Directus pour créer une session et générer les tokens
    const schema = await getSchema();
    const { AuthenticationService } = services;
    
    const authService = new AuthenticationService({
      knex: database,
      schema: schema,
      accountability: null,
    });

 // Add token inside of directus_sessions table the same way as Directus does, then use the refresh method from the auth service to let Directus handle the session
    const { nanoid } = await import('nanoid');
    
 
    const getMilliseconds = (value: any, defaultValue: number): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const match = value.match(/^(\d+)([smhd])$/);
        if (match) {
          const num = parseInt(match[1]);
          const unit = match[2];
          const multipliers: Record<string, number> = { 
            s: 1000, 
            m: 60000, 
            h: 3600000, 
            d: 86400000 
          };
          return num * (multipliers[unit] || defaultValue);
        }
      }
      return defaultValue;
    };

    const refreshToken = nanoid(64);
    const refreshTokenExpiration = new Date(
      Date.now() + getMilliseconds(env['REFRESH_TOKEN_TTL'], 604800000) // 7 jours par défaut
    );

    await database("directus_sessions").insert({
      token: refreshToken,
      user: user.id,
      ip: req.ip || null,
      user_agent: req.headers["user-agent"] || null,
      origin: req.headers.origin || req.headers.referer || null,
      expires: refreshTokenExpiration,
    });

    try {
      const loginResult = await authService.refresh(refreshToken, {
        session: true,
      });
      
      await otpStorage.cleanupExpired();

      res.status(200).json({
        success: true,
        message: "Authentification réussie",
        access_token: loginResult.accessToken,
        refresh_token: loginResult.refreshToken,
        expires: loginResult.expires || 900000,
      } as AuthResponse);
    } catch (refreshError: any) {

      console.error("Erreur lors du refresh:", refreshError);
      console.error("Détails de l'erreur:", refreshError.message);
      
     // Generate the access token manually with the exact format used by Directus
      const roleRecord = await database("directus_roles")
        .where({ id: user.role })
        .first();

      const app_access = roleRecord?.app_access !== false;
      const admin_access = roleRecord?.admin_access === true;

      const tokenPayload: any = {
        id: user.id,
        role: user.role,
        app_access: app_access,
        admin_access: admin_access,
        session: refreshToken,
      };

      const TTL = env['SESSION_COOKIE_TTL'] || env['ACCESS_TOKEN_TTL'] || '15m';
      const jwt = await import('jsonwebtoken');
      
      const secret = env.SECRET || process.env.SECRET || 'directus_secret_to_sign_access_tokens';
      
      const accessToken = jwt.sign(tokenPayload, secret, {
        expiresIn: TTL,
        issuer: 'directus',
      });

      await database("directus_users")
        .update({ last_access: new Date() })
        .where({ id: user.id });

      await otpStorage.cleanupExpired();

      res.status(200).json({
        success: true,
        message: "Authentification réussie",
        access_token: accessToken,
        refresh_token: refreshToken,
        expires: getMilliseconds(TTL, 900000),
      } as AuthResponse);
    }
  } catch (error) {
    console.error("Erreur dans verifyOTP:", error);
    res.status(500).json({
      success: false,
      error: "Erreur interne du serveur",
    } as AuthResponse);
  }
}
