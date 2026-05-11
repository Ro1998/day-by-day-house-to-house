import nodemailer from 'nodemailer'
import type { Attachment } from 'nodemailer/lib/mailer'
import type { Menu } from '@/types'
import { buildEventIcsContent, buildGoogleCalendarUrl } from '@/lib/calendar'

type EmailRecipient = { email: string; name: string }

const APP_NAME = 'Day by Day'

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const formatMultiline = (value: string) => escapeHtml(value).replace(/\n/g, '<br />')

const normalizeRecipients = (users: Array<{ email: string; name: string }>) =>
  users
    .map((user) => ({
      email: user.email.trim(),
      name: user.name.trim() || 'Member',
    }))
    .filter((user) => user.email.length > 0)

const createTransporter = () => {
  const host = process.env.SMTP_HOST?.trim()
  const port = Number(process.env.SMTP_PORT ?? '587')
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const service = process.env.SMTP_SERVICE?.trim()

  if (!user || !pass || (!host && !service)) {
    return null
  }

  return nodemailer.createTransport({
    ...(service ? { service } : { host, port, secure: port === 465 }),
    auth: { user, pass },
  })
}

const transporter = createTransporter()

export const isEmailConfigured = () =>
  Boolean(transporter && process.env.EMAIL_FROM?.trim())

const getFromAddress = () => process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || ''
const getAdminNotificationEmail = () =>
  process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || process.env.SMTP_USER?.trim() || ''

const getAppBaseUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.APP_URL?.trim() ||
  'http://localhost:3000'

export async function sendEmail(input: {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: Attachment[]
}) {
  if (!transporter || !getFromAddress()) {
    console.warn('Email service is not configured. Skipping email delivery.')
    return false
  }

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments,
    })
    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}

export async function sendRegistrationOtpEmail(input: {
  email: string
  name: string
  otp: string
}) {
  const appUrl = getAppBaseUrl()
  const logoUrl = `${appUrl.replace(/\/$/, '')}/icon.svg`
  return sendEmail({
    to: input.email,
    subject: `${APP_NAME} verification code`,
    html: `
      <div style="margin: 0; padding: 32px 16px; background: #f4f7f1; font-family: Arial, sans-serif; color: #1f2937;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #d9e2d0; border-radius: 20px; overflow: hidden;">
          <div style="padding: 28px 32px; text-align: center; background: linear-gradient(135deg, #f2f7ea 0%, #e8f0df 100%); border-bottom: 1px solid #d9e2d0;">
            <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(APP_NAME)}" style="width: 56px; height: 56px; margin-bottom: 12px;" />
            <div style="font-size: 28px; font-weight: 700; color: #1f2937;">${escapeHtml(APP_NAME)}</div>
            <div style="margin-top: 8px; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: #4b5563;">Email verification</div>
          </div>
          <div style="padding: 32px;">
            <h1 style="margin: 0 0 14px; font-size: 28px; line-height: 1.2;">Verify your email</h1>
            <p style="margin: 0 0 12px;">Hello ${escapeHtml(input.name)},</p>
            <p style="margin: 0 0 20px;">Use the verification code below to complete your registration.</p>
            <div style="margin: 24px 0; padding: 22px; text-align: center; border: 1px dashed #8aa06f; border-radius: 16px; background: #f8fbf5;">
              <div style="font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #111827;">${escapeHtml(input.otp)}</div>
            </div>
            <p style="margin: 0 0 8px;">This code expires in <strong>10 minutes</strong>.</p>
            <p style="margin: 0; color: #6b7280;">If you did not request this, you can safely ignore this email.</p>
          </div>
          <div style="padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
            ${escapeHtml(APP_NAME)}<br />
            <a href="${escapeHtml(appUrl)}" style="color: #2563eb; text-decoration: none;">Open website</a>
          </div>
        </div>
      </div>
    `,
    text: [
      `Hello ${input.name},`,
      '',
      `Use this verification code to complete your ${APP_NAME} registration:`,
      input.otp,
      '',
      'This code expires in 10 minutes.',
      'If you did not request this, you can safely ignore this email.',
      '',
      `Open website: ${appUrl}`,
      '',
      APP_NAME,
    ].join('\n'),
  })
}

export async function sendPasswordResetEmail(input: {
  email: string
  name: string
  resetLink: string
  expiresAt: Date
}) {
  const appUrl = getAppBaseUrl()
  const expiresAtLabel = input.expiresAt.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  })

  return sendEmail({
    to: input.email,
    subject: `${APP_NAME} password reset link`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <h1 style="margin-bottom: 12px;">Reset your password</h1>
        <p>Hello ${escapeHtml(input.name)},</p>
        <p>Your security answers were verified. Use the link below to set a new password.</p>
        <p style="margin: 24px 0;">
          <a href="${escapeHtml(input.resetLink)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">
            Reset Password
          </a>
        </p>
        <p>This link expires at <strong>${escapeHtml(expiresAtLabel)}</strong>.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p style="margin-top: 24px;">
          Open website:
          <a href="${escapeHtml(appUrl)}">${escapeHtml(appUrl)}</a>
        </p>
        <p style="margin-top: 24px;">${escapeHtml(APP_NAME)}</p>
      </div>
    `,
    text: [
      `Hello ${input.name},`,
      '',
      'Your security answers were verified. Use this link to set a new password:',
      input.resetLink,
      '',
      `This link expires at ${expiresAtLabel}.`,
      'If you did not request this, you can safely ignore this email.',
      '',
      APP_NAME,
    ].join('\n'),
  })
}

export async function sendAdminRegistrationRequestEmail(input: {
  name: string
  username: string
  email: string
}) {
  const adminEmail = getAdminNotificationEmail()
  if (!adminEmail) return false

  const dashboardUrl = getAppBaseUrl()
  return sendEmail({
    to: adminEmail,
    subject: `New registration pending approval: ${input.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <h1 style="margin-bottom: 12px;">New registration request</h1>
        <p>A new user has verified their email and is waiting for approval.</p>
        <p><strong>Name:</strong> ${escapeHtml(input.name)}</p>
        <p><strong>Username:</strong> ${escapeHtml(input.username)}</p>
        <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
        <p style="margin-top: 20px;">
          Open the admin dashboard here:
          <a href="${escapeHtml(dashboardUrl)}">${escapeHtml(dashboardUrl)}</a>
        </p>
        <p>Then go to <strong>User Access</strong> to approve or disapprove the request.</p>
        <p style="margin-top: 24px;">${escapeHtml(APP_NAME)}</p>
      </div>
    `,
    text: [
      'New registration request',
      '',
      `Name: ${input.name}`,
      `Username: ${input.username}`,
      `Email: ${input.email}`,
      '',
      `Open the admin dashboard: ${dashboardUrl}`,
      'Then go to User Access to approve or disapprove the request.',
      '',
      APP_NAME,
    ].join('\n'),
  })
}

const buildNotificationEmail = (name: string, title: string, message: string) => ({
  subject: `Notification: ${title}`,
  html: `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h1 style="margin-bottom: 12px;">${escapeHtml(title)}</h1>
      <p>Hello ${escapeHtml(name)},</p>
      <p>${formatMultiline(message)}</p>
      <p style="margin-top: 24px;">You can also view this in your dashboard.</p>
      <p style="margin-top: 24px;">${escapeHtml(APP_NAME)}</p>
    </div>
  `,
  text: `Hello ${name},\n\n${message}\n\nYou can also view this in your dashboard.\n\n${APP_NAME}`,
})

const buildMenuRows = (menu: Menu) =>
  menu.items
    .map(
      (item) => `
        <tr>
          <td style="border: 1px solid #d1d5db; padding: 10px; font-weight: 600;">${escapeHtml(item.day)}</td>
          <td style="border: 1px solid #d1d5db; padding: 10px;">${formatMultiline(item.lunch || '-')}</td>
          <td style="border: 1px solid #d1d5db; padding: 10px;">${escapeHtml(item.lunchCooks.join(', ') || '-')}</td>
          <td style="border: 1px solid #d1d5db; padding: 10px;">${formatMultiline(item.dinner || '-')}</td>
          <td style="border: 1px solid #d1d5db; padding: 10px;">${escapeHtml(item.dinnerCooks.join(', ') || '-')}</td>
        </tr>
      `,
    )
    .join('')

const buildMenuEmail = (name: string, menu: Menu, title: string, imageAttachmentName?: string) => {
  const purchasers = menu.purchasers.length > 0 ? menu.purchasers.join(', ') : 'Not assigned yet'
  const dashboardUrl = getAppBaseUrl()
  return {
    subject: title,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
        <h1 style="margin-bottom: 8px;">${escapeHtml(title)}</h1>
        <p>Hello ${escapeHtml(name)},</p>
        <p>The weekly menu for <strong>${escapeHtml(menu.week)}</strong> has been published.</p>
        <p><strong>Vegetable purchasers:</strong> ${escapeHtml(purchasers)}</p>
        <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Day</th>
              <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Lunch</th>
              <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Lunch Team</th>
              <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Dinner</th>
              <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Dinner Team</th>
            </tr>
          </thead>
          <tbody>${buildMenuRows(menu)}</tbody>
        </table>
        ${
          imageAttachmentName
            ? `<p style="margin-top: 20px;">The menu image is attached for easier viewing on mobile.</p>`
            : ''
        }
        <p style="margin-top: 20px;">
          You can also view the latest details in the dashboard:
          <a href="${escapeHtml(dashboardUrl)}">${escapeHtml(dashboardUrl)}</a>
        </p>
        <p style="margin-top: 24px;">${escapeHtml(APP_NAME)}</p>
      </div>
    `,
    text: [
      `Hello ${name},`,
      '',
      `${title}`,
      `Week: ${menu.week}`,
      `Vegetable purchasers: ${purchasers}`,
      '',
      ...menu.items.flatMap((item) => [
        `${item.day}`,
        `  Lunch: ${item.lunch || '-'}`,
        `  Lunch team: ${item.lunchCooks.join(', ') || '-'}`,
        `  Dinner: ${item.dinner || '-'}`,
        `  Dinner team: ${item.dinnerCooks.join(', ') || '-'}`,
        '',
      ]),
      `Dashboard: ${dashboardUrl}`,
      '',
      APP_NAME,
    ].join('\n'),
  }
}

export async function sendNotificationEmails(
  users: EmailRecipient[],
  title: string,
  message: string,
) {
  const recipients = normalizeRecipients(users)
  if (recipients.length === 0 || !isEmailConfigured()) return

  await Promise.allSettled(
    recipients.map((user) => {
      const email = buildNotificationEmail(user.name, title, message)
      return sendEmail({
        to: user.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      })
    }),
  )
}

export async function sendMenuEmails(
  users: EmailRecipient[],
  menu: Menu,
  options?: { title?: string; imageDataUrl?: string },
) {
  const recipients = normalizeRecipients(users)
  if (recipients.length === 0 || !isEmailConfigured()) return

  const imageAttachment =
    options?.imageDataUrl && options.imageDataUrl.startsWith('data:image/')
      ? {
          filename: `menu-${menu.week}.${options.imageDataUrl.includes('image/png') ? 'png' : 'jpg'}`,
          path: options.imageDataUrl,
        }
      : undefined

  const title = options?.title?.trim() || `Weekly Menu for ${menu.week}`

  await Promise.allSettled(
    recipients.map((user) => {
      const email = buildMenuEmail(user.name, menu, title, imageAttachment?.filename)
      return sendEmail({
        to: user.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        attachments: imageAttachment ? [imageAttachment] : undefined,
      })
    }),
  )
}

export async function sendEventEmails(
  users: EmailRecipient[],
  event: {
    id: string
    title: string
    date: string
    time: string
    type: 'online' | 'offline'
    location?: string | null
    venue?: string | null
    description?: string | null
    createdBy: string
  },
) {
  const recipients = normalizeRecipients(users)
  if (recipients.length === 0 || !isEmailConfigured()) return

  const eventLocation = (event.location || event.venue || '').trim()
  const googleCalendarUrl = buildGoogleCalendarUrl({
    title: event.title,
    date: event.date,
    time: event.time,
    description: event.description,
    location: eventLocation,
  })
  const dashboardUrl = getAppBaseUrl()
  const icsAttachment = {
    filename: `${event.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'event'}.ics`,
    content: buildEventIcsContent({
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
      description: event.description,
      location: eventLocation,
    }),
    contentType: 'text/calendar; charset=utf-8',
  } satisfies Attachment

  await Promise.allSettled(
    recipients.map((user) => sendEmail({
      to: user.email,
      subject: `Event: ${event.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <h1 style="margin-bottom: 12px;">${escapeHtml(event.title)}</h1>
          <p>Hello ${escapeHtml(user.name)},</p>
          <p>A new community event has been scheduled by ${escapeHtml(event.createdBy)}.</p>
          <p><strong>Date:</strong> ${escapeHtml(event.date)}</p>
          <p><strong>Time:</strong> ${escapeHtml(event.time)}</p>
          <p><strong>Type:</strong> ${escapeHtml(event.type === 'online' ? 'Online meeting' : 'In-person event')}</p>
          <p><strong>${event.type === 'online' ? 'Link / Meeting details' : 'Location'}:</strong> ${escapeHtml(eventLocation || 'To be announced')}</p>
          ${event.description ? `<p><strong>Details:</strong><br />${formatMultiline(event.description)}</p>` : ''}
          <p style="margin-top: 20px;">
            <a href="${escapeHtml(googleCalendarUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">
              Add To Google Calendar
            </a>
          </p>
          <p style="margin-top: 16px;">An .ics calendar file is also attached for Apple Calendar, Outlook, or other calendar apps.</p>
          <p style="margin-top: 16px;">
            View it in the dashboard:
            <a href="${escapeHtml(dashboardUrl)}">${escapeHtml(dashboardUrl)}</a>
          </p>
          <p style="margin-top: 24px;">${escapeHtml(APP_NAME)}</p>
        </div>
      `,
      text: [
        `Hello ${user.name},`,
        '',
        `${event.createdBy} scheduled a new community event.`,
        `Title: ${event.title}`,
        `Date: ${event.date}`,
        `Time: ${event.time}`,
        `Type: ${event.type === 'online' ? 'Online meeting' : 'In-person event'}`,
        `${event.type === 'online' ? 'Link / Meeting details' : 'Location'}: ${eventLocation || 'To be announced'}`,
        ...(event.description ? ['', `Details: ${event.description}`] : []),
        '',
        `Add to Google Calendar: ${googleCalendarUrl}`,
        `Dashboard: ${dashboardUrl}`,
        '',
        APP_NAME,
      ].join('\n'),
      attachments: [icsAttachment],
    })),
  )
}
