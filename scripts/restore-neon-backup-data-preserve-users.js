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
const sqlNullable = (value) => (value === '\\N' || value === '' || value == null ? 'NULL' : sqlString(value))
const sqlBool = (value) => (value === 't' || value === true ? 'TRUE' : 'FALSE')
const sqlNumber = (value) => Number(value)

const extractCopyRows = (text, marker) => {
  const start = text.indexOf(marker)
  if (start === -1) return []

  const lines = text.slice(start).split(/\r?\n/)
  const rows = []
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (line === '\\.') break
    if (line.trim()) rows.push(line.split('\t'))
  }

  return rows
}

const env = parseEnvFile(path.join(process.cwd(), '.env.local'))
const runtimeDatabaseUrl = process.env.DIRECT_URL || env.DIRECT_URL || process.env.DATABASE_URL || env.DATABASE_URL
if (!runtimeDatabaseUrl) {
  console.error('DIRECT_URL or DATABASE_URL was not found in the environment or .env.local.')
  process.exit(1)
}

const databaseUrl = (() => {
  const fallbackUrl = process.env.DATABASE_URL || env.DATABASE_URL || runtimeDatabaseUrl
  try {
    const parsed = new URL(fallbackUrl)
    parsed.searchParams.delete('pgbouncer')
    parsed.searchParams.delete('connection_limit')
    return parsed.toString()
  } catch {
    return fallbackUrl
  }
})()

const backupSql = readFileSync(path.join(process.cwd(), 'neon_backup.sql'), 'utf8')

const userRows = extractCopyRows(backupSql, 'COPY public."User"')
const activityRows = extractCopyRows(backupSql, 'COPY activity (id, user_id, action, timestamp) FROM stdin;')
const availabilityRows = extractCopyRows(backupSql, 'COPY public."Availability"')
const communityEventRows = extractCopyRows(backupSql, 'COPY public."CommunityEvent"')
const expenseRows = extractCopyRows(backupSql, 'COPY public."Expense"')
const inventoryRows = extractCopyRows(backupSql, 'COPY public."InventoryItem"')
const menuRows = extractCopyRows(backupSql, 'COPY public."Menu"')
const menuItemRows = extractCopyRows(backupSql, 'COPY public."MenuItem"')
const menuSuggestionRows = extractCopyRows(backupSql, 'COPY public."MenuSuggestion"')
const monthlyPaymentRows = extractCopyRows(backupSql, 'COPY public."MonthlyPayment"')
const notificationRows = extractCopyRows(backupSql, 'COPY public."Notification"')
const registrationVerificationRows = extractCopyRows(backupSql, 'COPY public."RegistrationVerification"')
const supplyReportRows = extractCopyRows(backupSql, 'COPY public."SupplyReport"')

const requiredUserIds = new Set()
for (const row of activityRows) requiredUserIds.add(row[1])
for (const row of availabilityRows) requiredUserIds.add(row[6])
for (const row of communityEventRows) requiredUserIds.add(row[8])
for (const row of expenseRows) requiredUserIds.add(row[6])
for (const row of inventoryRows) requiredUserIds.add(row[8])
for (const row of menuRows) requiredUserIds.add(row[3])
for (const row of menuSuggestionRows) requiredUserIds.add(row[5])
for (const row of monthlyPaymentRows) requiredUserIds.add(row[4])
for (const row of notificationRows) requiredUserIds.add(row[4])
for (const row of supplyReportRows) requiredUserIds.add(row[7])
requiredUserIds.delete('\\N')

const placeholderUsers = userRows.filter((row) => requiredUserIds.has(row[0]))

const placeholderUserSql = placeholderUsers.map((row, index) => {
  const [id, name] = row
  const archivedName = `${name} (Archived)`
  const archivedUsername = `archived_neon_${String(index + 1).padStart(3, '0')}_${id}`

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
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const activitySql = activityRows.map((row) => {
  const [id, userId, action, timestamp] = row
  return `
INSERT INTO "Activity" (id, "userId", action, timestamp)
VALUES (${sqlString(id)}, ${sqlString(userId)}, ${sqlString(action)}, ${sqlString(timestamp)})
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const availabilitySql = availabilityRows.map((row) => {
  const [id, week, day, meal, available, note, userId, createdAt] = row
  return `
INSERT INTO "Availability" (id, week, day, meal, available, note, "userId", "createdAt", "updatedAt")
VALUES (${sqlString(id)}, ${sqlString(week)}, ${sqlString(day)}, ${sqlString(meal)}, ${sqlBool(available)}, ${sqlNullable(note)}, ${sqlString(userId)}, ${sqlString(createdAt)}, ${sqlString(createdAt)})
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const communityEventSql = communityEventRows.map((row) => {
  const [id, title, date, time, type, location, venue, description, createdById, createdAt] = row
  return `
INSERT INTO "CommunityEvent" (id, title, date, time, type, location, venue, description, "createdById", "createdAt")
VALUES (${sqlString(id)}, ${sqlString(title)}, ${sqlString(date)}, ${sqlString(time)}, ${sqlString(type)}, ${sqlNullable(location)}, ${sqlNullable(venue)}, ${sqlNullable(description)}, ${sqlString(createdById)}, ${sqlString(createdAt)})
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const expenseSql = expenseRows.map((row) => {
  const [id, date, type, category, amount, description, userId, createdAt] = row
  return `
INSERT INTO "Expense" (id, date, type, category, amount, description, "userId", "createdAt", "updatedAt")
VALUES (${sqlString(id)}, ${sqlString(date)}, ${sqlString(type)}, ${sqlString(category)}, ${sqlNumber(amount)}, ${sqlString(description)}, ${sqlString(userId)}, ${sqlString(createdAt)}, ${sqlString(createdAt)})
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const inventorySql = inventoryRows.map((row) => {
  const [id, name, category, quantity, unit, lowStockThreshold, lastPurchasedAt, lastPrice, note, userId, createdAt] = row
  return `
INSERT INTO "InventoryItem" (id, name, category, quantity, unit, "lowStockThreshold", "lastPurchasedAt", "lastPrice", note, "userId", "createdAt", "updatedAt")
VALUES (${sqlString(id)}, ${sqlString(name)}, ${sqlString(category)}, ${sqlNumber(quantity)}, ${sqlString(unit)}, ${sqlNumber(lowStockThreshold)}, ${sqlNullable(lastPurchasedAt)}, ${lastPrice === '\\N' ? 'NULL' : sqlNumber(lastPrice)}, ${sqlNullable(note)}, ${sqlString(userId)}, ${sqlString(createdAt)}, ${sqlString(createdAt)})
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const menuSql = menuRows.map((row) => {
  const [id, week, purchasers, userId, createdAt] = row
  return `
INSERT INTO "Menu" (id, week, purchasers, "userId", "createdAt", "updatedAt")
VALUES (${sqlString(id)}, ${sqlString(week)}, ${sqlNullable(purchasers)}, ${sqlString(userId)}, ${sqlString(createdAt)}, ${sqlString(createdAt)})
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const menuItemSql = menuItemRows.map((row) => {
  const [id, day, lunch, dinner, lunchCooks, dinnerCooks, menuId] = row
  return `
INSERT INTO "MenuItem" (id, day, lunch, dinner, "lunchCooks", "dinnerCooks", "menuId")
VALUES (${sqlString(id)}, ${sqlString(day)}, ${sqlString(lunch)}, ${sqlString(dinner)}, ${sqlNullable(lunchCooks)}, ${sqlNullable(dinnerCooks)}, ${sqlString(menuId)})
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const menuSuggestionSql = menuSuggestionRows.map((row) => {
  const [id, suggestion, preferredDay, preferredMeal, status, userId, createdAt] = row
  return `
INSERT INTO "MenuSuggestion" (id, suggestion, "preferredDay", "preferredMeal", status, "userId", "createdAt", "updatedAt")
VALUES (${sqlString(id)}, ${sqlString(suggestion)}, ${sqlNullable(preferredDay)}, ${sqlNullable(preferredMeal)}, ${sqlString(status)}, ${sqlString(userId)}, ${sqlString(createdAt)}, ${sqlString(createdAt)})
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const monthlyPaymentSql = monthlyPaymentRows.map((row) => {
  const [id, month, paid, amount, userId, createdAt, expenseId, memberName, reminderSent, note, paymentType] = row
  return `
INSERT INTO "MonthlyPayment" (id, month, paid, amount, "userId", "createdAt", "updatedAt", "expenseId", "memberName", "reminderSent", note, "paymentType")
VALUES (${sqlString(id)}, ${sqlString(month)}, ${sqlBool(paid)}, ${sqlNumber(amount)}, ${sqlString(userId)}, ${sqlString(createdAt)}, ${sqlString(createdAt)}, ${sqlNullable(expenseId)}, ${sqlNullable(memberName)}, ${sqlBool(reminderSent)}, ${sqlNullable(note)}, ${sqlNullable(paymentType)})
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const notificationSql = notificationRows.map((row) => {
  const [id, title, message, category, createdById, createdAt, readByUserIds, recipientUserIds] = row
  return `
INSERT INTO "Notification" (id, title, message, category, "createdById", "createdAt", "updatedAt", "readByUserIds", "recipientUserIds")
VALUES (${sqlString(id)}, ${sqlString(title)}, ${sqlString(message)}, ${sqlString(category)}, ${sqlString(createdById)}, ${sqlString(createdAt)}, ${sqlString(createdAt)}, ${sqlNullable(readByUserIds)}, ${sqlNullable(recipientUserIds)})
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const registrationVerificationSql = registrationVerificationRows.map((row) => {
  const [id, name, username, email, phone, passwordHash, securityAnswers, otpHash, otpExpiresAt, createdAt] = row
  return `
INSERT INTO "RegistrationVerification" (id, name, username, email, phone, "passwordHash", "securityAnswers", "otpHash", "otpExpiresAt", "createdAt")
VALUES (${sqlString(id)}, ${sqlString(name)}, ${sqlString(username)}, ${sqlString(email)}, ${sqlNullable(phone)}, ${sqlString(passwordHash)}, ${sqlString(securityAnswers)}, ${sqlString(otpHash)}, ${sqlString(otpExpiresAt)}, ${sqlString(createdAt)})
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const supplyReportSql = supplyReportRows.map((row) => {
  const [id, title, category, itemName, message, status, response, createdById, createdAt, updatedAt] = row
  return `
INSERT INTO "SupplyReport" (id, title, category, "itemName", message, status, response, "createdById", "createdAt", "updatedAt")
VALUES (${sqlString(id)}, ${sqlString(title)}, ${sqlString(category)}, ${sqlNullable(itemName)}, ${sqlString(message)}, ${sqlString(status)}, ${sqlNullable(response)}, ${sqlString(createdById)}, ${sqlString(createdAt)}, ${sqlString(updatedAt)})
ON CONFLICT (id) DO NOTHING;
`
}).join('\n')

const verificationSql = `
SELECT
  (SELECT COUNT(*) FROM "RegistrationVerification") AS registration_verification_count,
  (SELECT COUNT(*) FROM "Expense") AS expense_count,
  (SELECT COUNT(*) FROM "MonthlyPayment") AS monthly_payment_count,
  (SELECT COUNT(*) FROM "Menu") AS menu_count,
  (SELECT COUNT(*) FROM "MenuItem") AS menu_item_count,
  (SELECT COUNT(*) FROM "Activity") AS activity_count,
  (SELECT COUNT(*) FROM "Notification") AS notification_count,
  (SELECT COUNT(*) FROM "MenuSuggestion") AS suggestion_count,
  (SELECT COUNT(*) FROM "Availability") AS availability_count,
  (SELECT COUNT(*) FROM "SupplyReport") AS supply_report_count,
  (SELECT COUNT(*) FROM "InventoryItem") AS inventory_count,
  (SELECT COUNT(*) FROM "CommunityEvent") AS community_event_count;
`

const sql = `
BEGIN;
${placeholderUserSql}
DELETE FROM "CommunityEvent";
DELETE FROM "SupplyReport";
DELETE FROM "Availability";
DELETE FROM "MenuSuggestion";
DELETE FROM "Notification";
DELETE FROM "InventoryItem";
DELETE FROM "Activity";
DELETE FROM "MenuItem";
DELETE FROM "Menu";
DELETE FROM "MonthlyPayment";
DELETE FROM "Expense";
DELETE FROM "RegistrationVerification";
${registrationVerificationSql}
${expenseSql}
${monthlyPaymentSql}
${menuSql}
${menuItemSql}
${activitySql}
${inventorySql}
${notificationSql}
${menuSuggestionSql}
${availabilitySql}
${supplyReportSql}
${communityEventSql}
COMMIT;
${verificationSql}
`

console.log('Restoring Neon backup data into Supabase while preserving current user details...')

const result = spawnSync('psql', ['--dbname', databaseUrl, '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-F', ','], {
  cwd: process.cwd(),
  encoding: 'utf8',
  input: sql,
  stdio: 'pipe',
})

if (result.status !== 0) {
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  process.exit(result.status || 1)
}

if (result.stdout) process.stdout.write(result.stdout)
console.log(`Placeholder users ensured: ${placeholderUsers.length}`)
console.log(`Expenses restored: ${expenseRows.length}`)
console.log(`Monthly payments restored: ${monthlyPaymentRows.length}`)
console.log(`Menus restored: ${menuRows.length}`)
console.log(`Menu items restored: ${menuItemRows.length}`)
console.log(`Activities restored: ${activityRows.length}`)
console.log(`Notifications restored: ${notificationRows.length}`)
console.log(`Registration verifications restored: ${registrationVerificationRows.length}`)
console.log(`Menu suggestions restored: ${menuSuggestionRows.length}`)
console.log(`Availability entries restored: ${availabilityRows.length}`)
console.log(`Supply reports restored: ${supplyReportRows.length}`)
console.log(`Community events restored: ${communityEventRows.length}`)
