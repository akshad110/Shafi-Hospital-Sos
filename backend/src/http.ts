import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { ZodError } from 'zod'
import { config } from './config.js'
import { findUserById, getHospital } from './services/accounts.js'

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
    const authed = req as AuthedRequest
    authed.userId = user.id
    authed.hospitalId = hospital.id
    authed.role = user.role
    next()
  } catch (error) {
    next(error)
  }
}

export function asyncHandler(fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req as AuthedRequest, res, next).catch(next)
  }
}

export function errorHandler(error: Error & { status?: number; code?: number }, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({ message: error.issues[0]?.message || 'Check the form and try again' })
    return
  }
  if (error.code === 11000) {
    res.status(409).json({ message: 'This record already exists' })
    return
  }
  const status = error.status || 500
  if (status === 500) console.error(error)
  res.status(status).json({ message: status === 500 ? 'Something went wrong' : error.message })
}
