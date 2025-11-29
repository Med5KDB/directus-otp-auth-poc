-- ============================================
-- Migration pour l'authentification OTP
-- Migration vers directus_users et sessions Directus
-- ============================================

-- Note: Le champ 'phone' existe déjà dans directus_users (confirmé par l'utilisateur)
-- Si nécessaire, créer un index unique sur le champ phone de directus_users
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_directus_users_phone ON directus_users(phone);

-- 1. Supprimer l'ancienne table otp_codes si elle existe (pour migration depuis User vers directus_users)
-- Les codes OTP sont temporaires, donc pas de perte de données critique
DROP TABLE IF EXISTS otp_codes;

-- 2. Créer la table otp_codes avec référence à directus_users
CREATE TABLE otp_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,  -- UUID de directus_users (TEXT au lieu d'INTEGER)
  code TEXT NOT NULL,
  phone TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  attempts INTEGER DEFAULT 0,
  used INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES directus_users(id) ON DELETE CASCADE
);

-- 3. Créer les index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_used ON otp_codes(used);
CREATE INDEX IF NOT EXISTS idx_otp_user_id ON otp_codes(user_id);

-- ============================================
-- Fin de la migration
-- ============================================

