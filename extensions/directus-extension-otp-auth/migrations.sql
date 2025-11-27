-- ============================================
-- Migration pour l'authentification OTP
-- ============================================

-- 1. Ajouter le champ 'phone' à la collection User (utilisateurs finaux)
-- (Si le champ existe déjà, cette commande échouera, c'est normal)
ALTER TABLE User ADD COLUMN phone TEXT;

-- Créer un index unique sur le champ phone
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_phone ON User(phone);

-- 2. Créer la table otp_codes
CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  phone TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  attempts INTEGER DEFAULT 0,
  used INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
);

-- 3. Créer les index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_used ON otp_codes(used);
CREATE INDEX IF NOT EXISTS idx_otp_user_id ON otp_codes(user_id);

-- ============================================
-- Fin de la migration
-- ============================================

