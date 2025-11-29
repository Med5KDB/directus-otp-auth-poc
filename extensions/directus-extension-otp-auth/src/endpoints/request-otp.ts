import type { Request, Response } from "express";
import { OTPGenerator } from "../services/otp-generator";
import { OTPStorage } from "../services/otp-storage";
import { SMSSender } from "../services/sms-sender";
import type { RequestOTPPayload, OTPResponse } from "../types";

export async function requestOTP(
  req: Request,
  res: Response,
  { database, services, getSchema, env }: any
): Promise<void> {
  try {
    const { phone }: RequestOTPPayload = req.body;
    console.log("phone", phone);

    if (!phone) {
      res.status(400).json({
        success: false,
        error: "Le numéro de téléphone est requis",
      } as OTPResponse);
      return;
    }

    const normalizedPhone = phone.trim().replace(/\s+/g, "");
    if (!/^\+?[1-9]\d{1,14}$/.test(normalizedPhone)) {
      res.status(400).json({
        success: false,
        error:
          "Format de numéro de téléphone invalide. Utilisez le format international (+33...)",
      } as OTPResponse);
      return;
    }

    const user = await database("directus_users")
      .where({ phone: normalizedPhone })
      .first();

      console.log("user", JSON.stringify(user, null, 2));

    if (!user) {
      res.status(404).json({
        success: false,
        error: "Aucun utilisateur trouvé avec ce numéro de téléphone",
      } as OTPResponse);
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({
        success: false,
        error: "Le compte utilisateur n'est pas actif",
      } as OTPResponse);
      return;
    }

    
    const role = await database("directus_roles")
      .where({ id: user.role })
      .first();

    if (!role || role.name !== 'App User') {
      res.status(403).json({
        success: false,
        error: "Accès refusé. Seuls les utilisateurs avec le rôle 'App User' peuvent utiliser cette fonctionnalité",
      } as OTPResponse);
      return;
    }

    const otpStorage = new OTPStorage(database);
    const smsSender = new SMSSender();

    await otpStorage.invalidateAllForPhone(normalizedPhone);

    const code = OTPGenerator.generateCode();
    const hashedCode = await OTPGenerator.hashCode(code);
    const expiresAt = OTPGenerator.getExpirationDate(5); // 5 minutes

    await otpStorage.create({
      user_id: user.id,
      code: hashedCode,
      phone: normalizedPhone,
      expires_at: expiresAt,
      attempts: 0,
      used: false,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    const smsSent = await smsSender.sendOTP(normalizedPhone, code);

    if (!smsSent) {
      res.status(500).json({
        success: false,
        error: "Erreur lors de l'envoi du SMS. Veuillez réessayer.",
      } as OTPResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: `Code OTP envoyé par SMS au ${normalizedPhone}`,
    } as OTPResponse);
  } catch (error) {
    console.error("Erreur dans requestOTP:", error);
    res.status(500).json({
      success: false,
      error: "Erreur interne du serveur",
    } as OTPResponse);
  }
}
