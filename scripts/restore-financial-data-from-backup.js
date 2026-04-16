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

const sqlString = (value) => `'${String(value).replace(/'/g, "''")}'`
const sqlNullable = (value) => (value === '\\N' || value === '' ? 'NULL' : sqlString(value))

const extractCopyRows = (text, table) => {
  const marker = `COPY public."${table}"`
  const start = text.indexOf(marker)
  if (start === -1) return []

  const after = text.slice(start)
  const lines = after.split(/\r?\n/)
  const rows = []

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (line === '\\.') break
    if (line.trim().length > 0) rows.push(line.split('\t'))
  }

  return rows
}

const envFile = parseEnvFile(path.join(process.cwd(), '.env.local'))
const databaseUrl = process.env.DATABASE_URL || envFile.DATABASE_URL

if (!databaseUrl) {
  console.error('DATABASE_URL was not found in the environment or .env.local.')
  process.exit(1)
}

const backupSql = readFileSync(path.join(process.cwd(), 'neon_backup.sql'), 'utf8')
const userRows = extractCopyRows(backupSql, 'User')
const expenseRows = extractCopyRows(backupSql, 'Expense')
const paymentRows = extractCopyRows(backupSql, 'MonthlyPayment')

if (expenseRows.length === 0 && paymentRows.length === 0) {
  console.error('No Expense or MonthlyPayment rows were found in neon_backup.sql.')
  process.exit(1)
}

const requiredUserIds = new Set([
  ...expenseRows.map((row) => row[6]),
  ...paymentRows.map((row) => row[4]),
])

const backupUsers = userRows.filter((row) => requiredUserIds.has(row[0]))

const userStatements = backupUsers.map((row, index) => {
  const [id, name] = row
  const archivedName = `${name} (Archived)`
  const archivedUsername = `archived_restore_${String(index + 1).padStart(3, '0')}_${id}`
  const createdAt = row[8] === '\\N' || !row[8] ? 'NOW()' : sqlString(row[8])

  return `
INSERT INTO "User" (
  id,
  name,
  username,
  email,
  phone,
  "passwordHash",
  "securityAnswers",
  "passwordResetTokenHash",
  "passwordResetTokenExpiresAt",
  role,
  approved,
  "createdAt",
  "updatedAt"
)
VALUES (
  ${sqlString(id)},
  ${sqlString(archivedName)},
  ${sqlString(archivedUsername)},
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'user',
  FALSE,
  ${createdAt},
  NOW()
)
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const expenseStatements = expenseRows.map((row) => {
  const [id, date, type, category, amount, description, userId, createdAt] = row
  return `
INSERT INTO "Expense" (
  id,
  date,
  type,
  category,
  amount,
  description,
  "userId",
  "createdAt",
  "updatedAt"
)
VALUES (
  ${sqlString(id)},
  ${sqlString(date)},
  ${sqlString(type)},
  ${sqlString(category)},
  ${Number(amount)},
  ${sqlString(description)},
  ${sqlString(userId)},
  ${sqlString(createdAt)},
  ${sqlString(createdAt)}
)
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const paymentStatements = paymentRows.map((row) => {
  const [
    id,
    month,
    paid,
    amount,
    userId,
    createdAt,
    expenseId,
    memberName,
    reminderSent,
    note,
    paymentType,
  ] = row

  return `
INSERT INTO "MonthlyPayment" (
  id,
  month,
  paid,
  amount,
  "memberName",
  "paymentType",
  note,
  "reminderSent",
  "expenseId",
  "userId",
  "createdAt",
  "updatedAt"
)
VALUES (
  ${sqlString(id)},
  ${sqlString(month)},
  ${paid === 't' ? 'TRUE' : 'FALSE'},
  ${Number(amount)},
  ${sqlNullable(memberName)},
  ${sqlNullable(paymentType)},
  ${sqlNullable(note)},
  ${reminderSent === 't' ? 'TRUE' : 'FALSE'},
  ${sqlNullable(expenseId)},
  ${sqlString(userId)},
  ${sqlString(createdAt)},
  ${sqlString(createdAt)}
)
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const verificationSql = `
SELECT
  (SELECT COUNT(*) FROM "User" WHERE id IN (${Array.from(requiredUserIds).map(sqlString).join(', ')})) AS restored_users,
  (SELECT COUNT(*) FROM "Expense") AS expense_count,
  (SELECT COUNT(*) FROM "MonthlyPayment") AS monthly_payment_count;
`

const sql = `
BEGIN;
${userStatements}
${expenseStatements}
${paymentStatements}
COMMIT;
${verificationSql}
`

console.log('Restoring financial data from neon_backup.sql...')

const result = spawnSync('psql', ['--dbname', databaseUrl, '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-F', ',', '-c', sql], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: 'pipe',
})

if (result.status !== 0) {
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  process.exit(result.status || 1)
}

if (result.stdout) process.stdout.write(result.stdout)
console.log(`Recovered users referenced by financial data: ${backupUsers.length}`)
console.log(`Recovered expenses from backup: ${expenseRows.length}`)
console.log(`Recovered monthly payments from backup: ${paymentRows.length}`)
