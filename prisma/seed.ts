import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.info('Seed skipped. Create the first approved admin account from the login page.')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
