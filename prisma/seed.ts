import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.user.createMany({
    data: [
      { name: 'Alice', role: 'admin' },
      { name: 'Bob', role: 'user' },
      { name: 'Charlie', role: 'user' },
      { name: 'Diana', role: 'user' },
    ]
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())