import { Router, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { config } from '../config.js'
import { asyncHandler, cookieBase, requireAuth, signAccess, signRefresh } from '../http.js'
import {
  changePassword,
  dropRefresh,
  findUserByEmail,
  findUserById,
  getHospital,
  publicUser,
  registerHospital,
  rememberRefresh,
  takeRefresh,
} from '../services/accounts.js'

export const authRouter = Router()

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

const registerSchema = z.object({
  hospitalName: z.string().trim().min(2, 'Hospital name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
  phone: z.string().trim().min(8, 'Enter a phone number'),
  city: z.string().trim().min(2, 'City is required'),
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

authRouter.post('/auth/login', asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body)
  const user = await findUserByEmail(body.email)
  const hospital = user ? await getHospital(user.hospitalId) : null
  const valid = user ? await bcrypt.compare(body.password, user.passwordHash) : false
  if (!user || !hospital || !valid) {
    res.status(401).json({ message: 'Email or password is incorrect' })
    return
  }
  const accessToken = await startSession(res, user.id, hospital.id, user.role)
  res.json({ user: publicUser(user, hospital), accessToken })
}))

authRouter.post('/auth/register', asyncHandler(async (req, res) => {
  const body = registerSchema.parse(req.body)
  const { user, hospital } = await registerHospital(body)
  const accessToken = await startSession(res, user.id, hospital.id, user.role)
  res.status(201).json({ user: publicUser(user, hospital), accessToken })
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
  if (!user || !hospital) {
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
