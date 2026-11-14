import nodemailer from 'nodemailer'
import { config } from '../config.js'

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function mailer() {
  if (!config.smtpHost) return null
  transporter ||= nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
  })
  return transporter
}

export async function sendMail(input: { to: string; subject: string; text: string; html?: string }) {
  const transport = mailer()
  if (!transport) {
    console.log(`[mail] not configured — ${input.subject} to ${input.to}`)
    return { sent: false }
  }
  await transport.sendMail({
    from: config.mailFrom,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html || `<pre style="font-family:inherit">${input.text}</pre>`,
  })
  return { sent: true }
}

export function approvalMail(input: { adminName: string; hospitalName: string; email: string; password: string }) {
  const login = `${config.appUrl}/login`
  const text = [
    `Hello ${input.adminName},`,
    '',
    `${input.hospitalName} has been verified on Shafi SOS.`,
    'You can now sign in to the hospital portal with the password below. Please change it after you sign in.',
    '',
    `Sign in: ${login}`,
    `Hospital email: ${input.email}`,
    `Temporary password: ${input.password}`,
    '',
    'Shafi SOS',
  ].join('\n')
  return {
    subject: 'Shafi SOS — your hospital is approved',
    text,
  }
}

export function resetMail(input: { adminName: string; hospitalName: string; link: string }) {
  const text = [
    `Hello ${input.adminName},`,
    '',
    `A password reset was requested for ${input.hospitalName}.`,
    'This link works for one hour. If you did not ask for it, you can ignore this email.',
    '',
    input.link,
    '',
    'Shafi SOS',
  ].join('\n')
  return { subject: 'Shafi SOS — reset your hospital password', text }
}

export function rejectionMail(input: { adminName: string; hospitalName: string; reason: string }) {
  const signup = `${config.appUrl}/signup`
  const text = [
    `Hello ${input.adminName},`,
    '',
    `We could not approve ${input.hospitalName} for Shafi SOS.`,
    '',
    `Reason: ${input.reason}`,
    '',
    `You may register again with updated documents: ${signup}`,
    '',
    'Shafi SOS',
  ].join('\n')
  return {
    subject: 'Shafi SOS — registration not approved',
    text,
  }
}
