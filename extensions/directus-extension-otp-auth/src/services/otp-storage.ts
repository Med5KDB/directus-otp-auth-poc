import type { Knex } from 'knex';
import type { OTPCode } from '../types';

export class OTPStorage {
  private db: Knex;
  private tableName = 'otp_codes';

  constructor(database: Knex) {
    this.db = database;
  }

  /**
   * Crée un nouveau code OTP dans la base de données
   */
  async create(otpData: Omit<OTPCode, 'id' | 'created_at'>): Promise<string> {
    const [id] = await this.db(this.tableName).insert({
      user_id: otpData.user_id,
      code: otpData.code,
      phone: otpData.phone,
      expires_at: otpData.expires_at,
      attempts: otpData.attempts,
      used: otpData.used,
      ip_address: otpData.ip_address || null,
      user_agent: otpData.user_agent || null,
      created_at: new Date()
    }).returning('id');

    return id;
  }

  /**
   * Récupère le code OTP le plus récent pour un utilisateur
   */
  async getLatestByPhone(phone: string): Promise<OTPCode | null> {
    const result = await this.db(this.tableName)
      .where({ phone })
      .andWhere('used', false)
      .orderBy('created_at', 'desc')
      .first();

    return result || null;
  }

  /**
   * Marque un code OTP comme utilisé
   */
  async markAsUsed(id: string): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({ used: true });
  }

  /**
   * Incrémente le nombre de tentatives
   */
  async incrementAttempts(id: string): Promise<number> {
    const result = await this.db(this.tableName)
      .where({ id })
      .increment('attempts', 1)
      .returning('attempts');

    return result[0]?.attempts || 0;
  }

  /**
   * Invalide tous les codes OTP non utilisés pour un téléphone
   */
  async invalidateAllForPhone(phone: string): Promise<void> {
    await this.db(this.tableName)
      .where({ phone, used: false })
      .update({ used: true });
  }

  /**
   * Nettoie les codes OTP expirés (maintenance)
   */
  async cleanupExpired(): Promise<number> {
    const deleted = await this.db(this.tableName)
      .where('expires_at', '<', new Date())
      .delete();

    return deleted;
  }

  /**
   * Vérifie si la table otp_codes existe
   */
  async tableExists(): Promise<boolean> {
    return await this.db.schema.hasTable(this.tableName);
  }
}

