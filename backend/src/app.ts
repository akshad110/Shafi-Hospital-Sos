import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { config } from './config.js'
import { errorHandler, requireAuth } from './http.js'
import { authRouter } from './routes/auth.js'
import { hospitalRouter } from './routes/hospital.js'
import { notificationsRouter } from './routes/notifications.js'
import { payrollRouter } from './routes/payroll.js'

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({ origin: config.clientOrigins, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.get('/api/v1/health', (_req, res) => {
    res.json({ ok: true, service: 'hospital-sos', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
  })

  app.use('/api/v1', authRouter)
  app.use('/api/v1', requireAuth, hospitalRouter, payrollRouter, notificationsRouter)
  app.use('/api/v1', (_req, res) => {
    res.status(404).json({ message: 'Endpoint not found' })
  })
  app.use(errorHandler)
  return app
}
