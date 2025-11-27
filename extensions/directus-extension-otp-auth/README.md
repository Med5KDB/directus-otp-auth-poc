# Extension OTP Authentication pour Directus

Extension Directus pour l'authentification par OTP (One-Time Password) via SMS.

## 🚀 Installation

1. **Installer les dépendances**

```bash
cd directus/extensions/directus-extension-otp-auth
npm install
```

2. **Builder l'extension**

```bash
npm run build
```

3. **Configuration des variables d'environnement**

Ajouter dans votre `docker-compose.yml` ou `.env` :

```env
# Configuration Twilio (pour SMS en production)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+33123456789

# En développement, si ces variables ne sont pas définies,
# les codes OTP seront affichés dans les logs Docker
```

4. **Redémarrer Directus**

```bash
docker-compose restart
```

## 📋 Prérequis dans Directus

### 1. Ajouter le champ `phone` à la table `directus_users`

Exécuter cette requête SQL ou créer manuellement via l'interface :

```sql
ALTER TABLE directus_users ADD COLUMN phone VARCHAR(20) UNIQUE;
```

### 2. Créer la collection `otp_codes`

```sql
CREATE TABLE otp_codes (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  code VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  used BOOLEAN DEFAULT 0,
  ip_address VARCHAR(45),
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES directus_users(id) ON DELETE CASCADE
);

CREATE INDEX idx_otp_phone ON otp_codes(phone);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);
```

## 🔌 API Endpoints

### 1. Demander un code OTP

```http
POST http://localhost:8055/otp/request
Content-Type: application/json

{
  "phone": "+33612345678"
}
```

**Réponse succès :**
```json
{
  "success": true,
  "message": "Code OTP envoyé par SMS au +33612345678"
}
```

**Réponse erreur :**
```json
{
  "success": false,
  "error": "Aucun utilisateur trouvé avec ce numéro de téléphone"
}
```

### 2. Vérifier le code OTP

```http
POST http://localhost:8055/otp/verify
Content-Type: application/json

{
  "phone": "+33612345678",
  "code": "123456"
}
```

**Réponse succès :**
```json
{
  "success": true,
  "message": "Authentification réussie",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "def50200...",
  "expires": 900000
}
```

**Réponse erreur :**
```json
{
  "success": false,
  "error": "Code invalide. 2 tentative(s) restante(s)."
}
```

### 3. Health Check

```http
GET http://localhost:8055/otp/health
```

## 🔒 Sécurité

- ✅ Codes OTP hashés avec bcrypt
- ✅ Expiration après 5 minutes
- ✅ Maximum 3 tentatives
- ✅ Usage unique des codes
- ✅ Invalidation automatique des anciens codes
- ✅ Nettoyage automatique des codes expirés

## 🧪 Mode Développement

En mode développement (sans configuration Twilio), les codes OTP sont affichés dans les logs Docker :

```
📱 ═══════════════════════════════════════
   MODE DÉVELOPPEMENT - SMS SIMULÉ
═══════════════════════════════════════
📞 Destinataire: +33612345678
🔐 Code OTP: 123456
⏱️  Expire dans: 5 minutes
═══════════════════════════════════════
```

Pour voir les logs :
```bash
docker-compose logs -f directus
```

## 📱 Format du numéro de téléphone

Le numéro doit être au format international :
- ✅ `+33612345678`
- ✅ `+1234567890`
- ❌ `0612345678` (format local)
- ❌ `06 12 34 56 78` (espaces acceptés mais seront normalisés)

## 🛠️ Développement

```bash
# Mode watch pour le développement
npm run dev

# Build pour production
npm run build

# Link l'extension (optionnel)
npm run link
```

## 📦 Structure

```
directus-extension-otp-auth/
├── src/
│   ├── index.ts              # Point d'entrée
│   ├── endpoints/
│   │   ├── request-otp.ts    # Demander un code
│   │   └── verify-otp.ts     # Vérifier un code
│   ├── services/
│   │   ├── otp-generator.ts  # Génération et validation
│   │   ├── otp-storage.ts    # Stockage en DB
│   │   └── sms-sender.ts     # Envoi SMS (Twilio)
│   └── types/
│       └── index.ts          # Types TypeScript
├── package.json
├── tsconfig.json
└── README.md
```

## 🐛 Dépannage

### L'extension n'apparaît pas

```bash
# Vérifier que l'extension est buildée
ls dist/index.js

# Vérifier les logs Directus
docker-compose logs directus | grep -i otp
```

### Les SMS ne sont pas envoyés

1. Vérifier les variables d'environnement Twilio
2. Vérifier les logs Docker pour voir le code en mode dev
3. Vérifier le crédit Twilio

### Erreur "table otp_codes does not exist"

Créer manuellement la table (voir section Prérequis)

