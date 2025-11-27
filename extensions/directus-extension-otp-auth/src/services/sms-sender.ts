export class SMSSender {
  private fromPhone: string;
  private twilioConfigured: boolean;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromPhone = process.env.TWILIO_PHONE_NUMBER || '';
    
    // Vérifier si les credentials Twilio sont configurés
    this.twilioConfigured = !!(accountSid && authToken && this.fromPhone);

    if (!this.twilioConfigured) {
      console.warn('⚠️  Twilio non configuré - Les SMS seront affichés dans les logs');
      console.warn('💡 Pour activer l\'envoi réel de SMS, configurez: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
    }
  }

  /**
   * Envoie un SMS avec le code OTP
   * Pour l'instant, toujours en mode simulation (logs)
   * Pour activer Twilio en production, décommenter et installer twilio
   */
  async sendOTP(phone: string, code: string): Promise<boolean> {
    const message = `Votre code de vérification Samacoach est: ${code}\n\nCe code expire dans 5 minutes.`;

    // Mode développement : affiche le code dans les logs
    console.log('\n📱 ═══════════════════════════════════════');
    console.log('   MODE DÉVELOPPEMENT - SMS SIMULÉ');
    console.log('═══════════════════════════════════════');
    console.log(`📞 Destinataire: ${phone}`);
    console.log(`🔐 Code OTP: ${code}`);
    console.log(`📨 Message: ${message}`);
    console.log('⏱️  Expire dans: 5 minutes');
    console.log('═══════════════════════════════════════\n');
    
    // Si Twilio est configuré, afficher une note
    if (this.twilioConfigured) {
      console.log('💡 Configuration Twilio détectée mais non utilisée (mode POC)');
    }
    
    return true;

    /* 
    // POUR ACTIVER L'ENVOI RÉEL VIA TWILIO:
    // 1. Installer twilio: npm install twilio
    // 2. Décommenter le code ci-dessous
    // 3. Supprimer le code de simulation ci-dessus
    
    if (!this.twilioConfigured) {
      // Fallback en mode dev si pas configuré
      console.log('\n📱 SMS SIMULÉ: Code OTP:', code, 'pour', phone, '\n');
      return true;
    }

    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      const result = await client.messages.create({
        body: message,
        from: this.fromPhone,
        to: phone
      });

      console.log(`✅ SMS envoyé avec succès - SID: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du SMS:', error);
      return false;
    }
    */
  }

  /**
   * Vérifie si le service SMS est configuré et fonctionnel
   */
  isConfigured(): boolean {
    return this.enabled;
  }
}

