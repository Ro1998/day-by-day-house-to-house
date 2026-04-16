const { readFileSync } = require('fs')
const path = require('path')
const nodemailer = require('nodemailer')

const parseEnvFile = (filePath) => {
  const content = readFileSync(filePath, 'utf8')
  const entries = {}

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    entries[key] = value
  }

  return entries
}

const envFile = parseEnvFile(path.join(process.cwd(), '.env.local'))

const host = (process.env.SMTP_HOST || envFile.SMTP_HOST || '').trim()
const port = Number((process.env.SMTP_PORT || envFile.SMTP_PORT || '587').trim())
const user = (process.env.SMTP_USER || envFile.SMTP_USER || '').trim()
const pass = (process.env.SMTP_PASS || envFile.SMTP_PASS || '').trim()

if (!host || !user || !pass) {
  console.error('SMTP_HOST, SMTP_USER, or SMTP_PASS is missing.')
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
})

transporter.verify()
  .then(() => {
    console.log('SMTP authentication succeeded.')
  })
  .catch((error) => {
    console.error('SMTP authentication failed.')
    console.error(error)
    process.exitCode = 1
  })
