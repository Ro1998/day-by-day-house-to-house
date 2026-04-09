import nodemailer from 'nodemailer'
import type { Attachment } from 'nodemailer/lib/mailer'
import type { Menu } from '@/types'

type EmailRecipient = { email: string; name: string }

const APP_NAME = 'Day by Day House to House'

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
          filename: `menu-${menu.week}.jpg`,
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
