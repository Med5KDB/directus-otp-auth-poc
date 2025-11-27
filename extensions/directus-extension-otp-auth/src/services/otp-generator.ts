import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class OTPGenerator {
  /**
   * Génère un code OTP à 6 chiffres
   */
  static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash le code OTP pour le stockage sécurisé
   */
  static async hashCode(code: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(code, saltRounds);
  }

  /**
   * Vérifie si un code correspond au hash
   */
  static async verifyCode(code: string, hashedCode: string): Promise<boolean> {
    return await bcrypt.compare(code, hashedCode);
  }

  /**
   * Calcule la date d'expiration (5 minutes par défaut)
   */
  static getExpirationDate(minutes: number = 5): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  /**
   * Vérifie si un code a expiré
   */
  static isExpired(expiresAt: Date): boolean {
    return new Date() > new Date(expiresAt);
  }
}

