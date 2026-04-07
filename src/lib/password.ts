import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const KEY_LENGTH = 64

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${hash}`
}

export const verifyPassword = (password: string, passwordHash: string) => {
  const [salt, storedHash] = passwordHash.split(':')
  if (!salt || !storedHash) return false

  const hashedBuffer = scryptSync(password, salt, KEY_LENGTH)
  const storedBuffer = Buffer.from(storedHash, 'hex')

  if (hashedBuffer.length !== storedBuffer.length) return false

  return timingSafeEqual(hashedBuffer, storedBuffer)
}
