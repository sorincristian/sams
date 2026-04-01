import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const db = new PrismaClient();
async function main() {
  const users = await db.user.findMany();
  fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
