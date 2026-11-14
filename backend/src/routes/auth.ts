import { Router, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { z } from 'zod'
import { config } from '../config.js'
import { asyncHandler, cookieBase, requireAuth, signAccess, signRefresh } from '../http.js'
import { KYC_MAX_FILE_BYTES, kycRequirements } from '../lib/hospitalKyc.js'
import {
  changePassword,
  requestHospitalPasswordReset,
  resetHospitalPassword,
  dropRefresh,
  findUserByEmail,
  findUserById,
  getHospital,
  hospitalStatus,
  publicUser,
  registerHospital,
  rememberRefresh,
  takeRefresh,
} from '../services/accounts.js'

export const authRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: KYC_MAX_FILE_BYTES, files: 8 },
})

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

const registerSchema = z.object({
  hospitalName: z.string().trim().min(2, 'Hospital name is required'),
  adminName: z.string().trim().min(2, 'Administrator name is required'),
  email: z.string().email('Enter a valid hospital email'),
  phone: z.string().trim().min(8, 'Enter the hospital phone number'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  country: z.string().trim().min(2, 'Country is required'),
  address: z.string().trim().min(5, 'Address is required'),
})

async function startSession(res: Response, userId: string, hospitalId: string, role: string) {
  const access = signAccess(userId, hospitalId, role)
  const refresh = signRefresh(userId)
  await rememberRefresh(refresh, userId, Date.now() + config.refreshTtlMs)
  res.cookie('hos_access', access, { ...cookieBase(), maxAge: 15 * 60 * 1000 })
  res.cookie('hos_refresh', refresh, { ...cookieBase(), maxAge: config.refreshTtlMs })
  return access
}

authRouter.get('/auth/register/requirements', (_req, res) => {
  res.json(kycRequirements())
})

authRouter.post('/auth/login', asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body)
  const user = await findUserByEmail(body.email)
  const hospital = user ? await getHospital(user.hospitalId) : null
  if (!user || !hospital) {
    res.status(401).json({ message: 'Email or password is incorrect' })
    return
  }
  const status = hospitalStatus(hospital)
  if (status === 'pending') {
    res.status(403).json({
      message: 'Your hospital is still under review. We will email a password once it is approved.',
      code: 'hospital_pending',
    })
    return
  }
  if (status === 'rejected') {
    res.status(403).json({
      message: hospital.rejectionReason
        ? `This registration was not approved. ${hospital.rejectionReason}`
        : 'This registration was not approved. Check your email for details.',
      code: 'hospital_rejected',
    })
    return
  }
  const valid = await bcrypt.compare(body.password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ message: 'Email or password is incorrect' })
    return
  }
  const accessToken = await startSession(res, user.id, hospital.id, user.role)
  res.json({ user: publicUser(user, hospital), accessToken })
}))

authRouter.post('/auth/register', upload.any(), asyncHandler(async (req, res) => {
  const body = registerSchema.parse(req.body)
  const files = ((req.files as Express.Multer.File[]) || []).map((file) => ({
    kind: file.fieldname,
    fileName: file.originalname,
    contentType: file.mimetype,
    buffer: file.buffer,
  }))
  await registerHospital(body, files)
  res.status(201).json({
    ok: true,
    status: 'pending',
    message: 'Application received. You can sign in after we verify your hospital and email a password.',
  })
}))

authRouter.post('/auth/refresh', asyncHandler(async (req, res) => {
  const token = req.cookies?.hos_refresh as string | undefined
  const stored = token ? await takeRefresh(token) : null
  if (!token || !stored) {
    res.status(401).json({ message: 'Session expired' })
    return
  }
  try {
    jwt.verify(token, config.refreshSecret)
  } catch {
    res.status(401).json({ message: 'Session expired' })
    return
  }
  const user = await findUserById(stored.userId)
  const hospital = user ? await getHospital(user.hospitalId) : null
  if (!user || !hospital || hospitalStatus(hospital) !== 'approved') {
    res.status(401).json({ message: 'Session expired' })
    return
  }
  const accessToken = await startSession(res, user.id, hospital.id, user.role)
  res.json({ user: publicUser(user, hospital), accessToken })
}))

authRouter.post('/auth/logout', asyncHandler(async (req, res) => {
  if (req.cookies?.hos_refresh) await dropRefresh(req.cookies.hos_refresh)
  res.clearCookie('hos_access', cookieBase())
  res.clearCookie('hos_refresh', cookieBase())
  res.json({ ok: true })
}))

authRouter.post('/auth/forgot-password', asyncHandler(async (req, res) => {
  const body = z.object({ email: z.string().email('Enter a valid email') }).parse(req.body)
  res.json(await requestHospitalPasswordReset(body.email))
}))

authRouter.post('/auth/reset-password', asyncHandler(async (req, res) => {
  const body = z.object({
    token: z.string().min(20, 'This reset link is invalid'),
    password: z.string().min(8, 'Use at least 8 characters'),
  }).parse(req.body)
  await resetHospitalPassword(body.token, body.password)
  res.json({ ok: true })
}))

authRouter.post('/auth/password', requireAuth, asyncHandler(async (req, res) => {
  const body = z.object({
    current: z.string().min(1, 'Enter your current password'),
    next: z.string().min(8, 'Use at least 8 characters'),
  }).parse(req.body)
  const ok = await changePassword(req.userId!, body.current, body.next)
  if (!ok) {
    res.status(400).json({ message: 'Current password is incorrect' })
    return
  }
  res.clearCookie('hos_access', cookieBase())
  res.clearCookie('hos_refresh', cookieBase())
  res.json({ ok: true })
}))

authRouter.get('/users/me', requireAuth, asyncHandler(async (req, res) => {
  const [user, hospital] = await Promise.all([findUserById(req.userId!), getHospital(req.hospitalId!)])
  if (!user || !hospital) {
    res.status(401).json({ message: 'Sign in required' })
    return
  }
  res.json({ user: publicUser(user, hospital), hospital })
}))
