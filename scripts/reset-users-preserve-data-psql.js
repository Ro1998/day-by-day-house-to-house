const { randomBytes, scryptSync } = require('crypto')
const { readFileSync } = require('fs')
const { spawnSync } = require('child_process')
const path = require('path')

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

const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

const normalizeAnswer = (value) => value.trim().toLowerCase()

const serializeSecurityAnswers = (answers) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(answers).map(([questionId, answer]) => [
        questionId,
        hashPassword(normalizeAnswer(answer)),
      ]),
    ),
  )

const sqlString = (value) => `'${String(value).replace(/'/g, "''")}'`

const buildTempPassword = () => `Admin@${randomBytes(6).toString('hex')}`

const envPath = path.join(process.cwd(), '.env.local')
const envFile = parseEnvFile(envPath)
const databaseUrl = process.env.DATABASE_URL || envFile.DATABASE_URL

if (!databaseUrl) {
  console.error('DATABASE_URL was not found in the environment or .env.local.')
  process.exit(1)
}

const adminName = (process.env.ADMIN_RESET_NAME || 'Administrator').trim()
const adminUsername = (process.env.ADMIN_RESET_USERNAME || 'admin').trim().toLowerCase()
const adminEmail = (
  process.env.ADMIN_RESET_EMAIL ||
  envFile.ADMIN_NOTIFICATION_EMAIL ||
  'admin@example.com'
).trim().toLowerCase()
const adminPhone = (process.env.ADMIN_RESET_PHONE || '').trim()
const adminPassword = (process.env.ADMIN_RESET_PASSWORD || buildTempPassword()).trim()
const uniqueSuffix = Date.now().toString()
const adminId = `admin_reset_${uniqueSuffix}`

const securityAnswers = {
  birth_city: (process.env.ADMIN_RESET_BIRTH_CITY || 'resetcity').trim(),
  first_school: (process.env.ADMIN_RESET_FIRST_SCHOOL || 'resetschool').trim(),
  childhood_friend: (process.env.ADMIN_RESET_CHILDHOOD_FRIEND || 'resetfriend').trim(),
}

const userUpdateSql = `
WITH numbered_users AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM "User"
)
UPDATE "User" AS u
SET
  name = 'Archived User ' || LPAD(numbered_users.rn::text, 3, '0') || ' ${uniqueSuffix}',
  username = 'archived_user_' || LPAD(numbered_users.rn::text, 3, '0') || '_${uniqueSuffix}',
  email = 'archived_user_' || LPAD(numbered_users.rn::text, 3, '0') || '_${uniqueSuffix}@example.invalid',
  phone = NULL,
  "passwordHash" = NULL,
  "securityAnswers" = NULL,
  "passwordResetTokenHash" = NULL,
  "passwordResetTokenExpiresAt" = NULL,
  role = 'user',
  approved = FALSE
FROM numbered_users
WHERE u.id = numbered_users.id;
`

const insertAdminSql = `
INSERT INTO "User" (
  id,
  name,
  username,
  email,
  phone,
  "passwordHash",
  "securityAnswers",
  "createdAt",
  "updatedAt",
  role,
  approved
) VALUES (
  ${sqlString(adminId)},
  ${sqlString(adminName)},
  ${sqlString(adminUsername)},
  ${sqlString(adminEmail)},
  ${adminPhone ? sqlString(adminPhone) : 'NULL'},
  ${sqlString(hashPassword(adminPassword))},
  ${sqlString(serializeSecurityAnswers(securityAnswers))},
  NOW(),
  NOW(),
  'admin',
  TRUE
);
`

const sql = `
BEGIN;
DELETE FROM "RegistrationVerification";
${userUpdateSql}
${insertAdminSql}
COMMIT;
`

console.log('Resetting user details while preserving linked records...')

const result = spawnSync(
  'psql',
  [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-c', sql],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  },
)

if (result.status !== 0) {
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  process.exit(result.status || 1)
}

if (result.stdout) process.stdout.write(result.stdout)

console.log('User reset complete.')
console.log(`Admin username: ${adminUsername}`)
console.log(`Admin password: ${adminPassword}`)
console.log(`Admin email: ${adminEmail}`)
if (adminPhone) {
  console.log(`Admin phone: ${adminPhone}`)
}
console.log('Security answers:')
console.log(`- birth_city: ${securityAnswers.birth_city}`)
console.log(`- first_school: ${securityAnswers.first_school}`)
console.log(`- childhood_friend: ${securityAnswers.childhood_friend}`)
