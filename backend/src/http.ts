import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { ZodError } from 'zod'
import { config } from './config.js'
import type { HttpError } from './lib/util.js'
import { findUserById, getHospital, hospitalStatus } from './services/accounts.js'

export interface AuthedRequest extends Request {
  userId?: string
  hospitalId?: string
  role?: string
}

export function signAccess(userId: string, hospitalId: string, role: string) {
  return jwt.sign({ sub: userId, hospitalId, role }, config.accessSecret, { expiresIn: '15m' })
}

export function signRefresh(userId: string) {
  return jwt.sign({ sub: userId, jti: crypto.randomUUID() }, config.refreshSecret, { expiresIn: '7d' })
}

export function cookieBase() {
  return {
    httpOnly: true,
    sameSite: config.cookieSameSite,
    secure: config.cookieSecure,
    path: '/',
    ...(config.cookieSameSite === 'none' ? { partitioned: true } : {}),
  }
}

export function readToken(req: Request) {
  const header = req.headers.authorization
  return header?.startsWith('Bearer ') ? header.slice(7) : (req.cookies?.hos_access as string | undefined)
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readToken(req)
  if (!token) {
    res.status(401).json({ message: 'Sign in required' })
    return
  }
  let payload: { sub: string; hospitalId: string; role: string }
  try {
    payload = jwt.verify(token, config.accessSecret) as typeof payload
  } catch {
    res.status(401).json({ message: 'Session expired' })
    return
  }
  if (payload.role !== 'hospital') {
    res.status(403).json({ message: 'This portal is only for hospital accounts' })
    return
  }
  try {
    const [user, hospital] = await Promise.all([findUserById(payload.sub), getHospital(payload.hospitalId)])
    if (!user || !hospital) {
      res.status(401).json({ message: 'Session is no longer valid' })
      return
    }
    const status = hospitalStatus(hospital)
    if (status !== 'approved') {
      res.status(403).json({
        message: status === 'rejected'
          ? 'This registration was not approved. Check your email for details.'
          : 'Your hospital is still under review. We will email a password once it is approved.',
        code: status === 'rejected' ? 'hospital_rejected' : 'hospital_pending',
      })
      return
    }
    const authed = req as AuthedRequest
    authed.userId = user.id
    authed.hospitalId = hospital.id
    authed.role = user.role
    next()
  } catch (error) {
    next(error)
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!config.adminApiKey) {
    res.status(503).json({ message: 'Admin review is not configured. Set ADMIN_API_KEY.' })
    return
  }
  const key = String(req.header('x-admin-key') || '')
  if (key !== config.adminApiKey) {
    res.status(401).json({ message: 'Admin key is incorrect' })
    return
  }
  next()
}

export function asyncHandler(fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req as AuthedRequest, res, next).catch(next)
  }
}

export function errorHandler(error: Error & { status?: number; code?: number | string; issue?: string }, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({ message: error.issues[0]?.message || 'Check the form and try again' })
    return
  }
  if (error instanceof multer.MulterError) {
    res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Each file must be under 4 MB' : 'Could not upload that file' })
    return
  }
  if (error.code === 11000) {
    res.status(409).json({ message: 'This record already exists' })
    return
  }
  const status = error.status || 500
  if (status === 500) console.error(error)
  const body: { message: string; code?: string } = { message: status === 500 ? 'Something went wrong' : error.message }
  const issue = (error as HttpError).issue
  if (issue) body.code = issue
  res.status(status).json(body)
}
