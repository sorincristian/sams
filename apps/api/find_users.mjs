import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log("Fetching users...");
    const users = await prisma.user.findMany({ select: { email: true, role: true }});
    console.log(users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
