import dotenv from 'dotenv'

dotenv.config()

const production = process.env.NODE_ENV === 'production'

function origins() {
  return (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

const clientOrigins = origins()

export const config = {
  production,
  port: Number(process.env.PORT || 5000),
  accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  mongoUri: process.env.MONGODB_URI || '',
  clientOrigins,
  appUrl: (process.env.APP_URL || clientOrigins[0] || 'http://localhost:5173').replace(/\/$/, ''),
  adminApiKey: process.env.ADMIN_API_KEY || (production ? '' : 'dev-admin-key'),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  mailFrom: process.env.MAIL_FROM || 'Shafi SOS <noreply@shafisos.example>',
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : production,
  cookieSameSite: (process.env.COOKIE_SAMESITE || (production ? 'none' : 'lax')) as 'lax' | 'strict' | 'none',
  autoSeed: process.env.AUTO_SEED === 'true' || (!production && process.env.AUTO_SEED !== 'false'),
  refreshTtlMs: 7 * 24 * 60 * 60 * 1000,
}

if (production) {
  const weak = (value: string) => !value || value.startsWith('dev-') || value.length < 24
  if (weak(config.accessSecret) || weak(config.refreshSecret)) {
    throw new Error('Set long unique JWT_ACCESS_SECRET and JWT_REFRESH_SECRET before running in production.')
  }
  if (!config.mongoUri) {
    throw new Error('Set MONGODB_URI before running in production.')
  }
  if (!config.clientOrigins.length || config.clientOrigins.every((item) => item.includes('localhost'))) {
    throw new Error('Set CLIENT_ORIGIN to your hosted frontend URL (https://….onrender.com), comma-separated if you also have an admin panel.')
  }
}
