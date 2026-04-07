import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ronald.thapa08@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD, // User needs to set this
  },
})

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({
      from: 'ronald.thapa08@gmail.com',
      to,
      subject,
      html,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

export async function sendNotificationEmails(users: Array<{ email: string; name: string }>, title: string, message: string) {
  const promises = users.map(user =>
    sendEmail(
      user.email,
      `Notification: ${title}`,
      `
      <h1>${title}</h1>
      <p>Dear ${user.name},</p>
      <p>${message}</p>
      <p>Best regards,<br>Day by Day House to House Team</p>
      `
    )
  )
  await Promise.allSettled(promises)
}