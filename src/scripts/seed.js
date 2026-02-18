const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
    const rounds = Number(process.env.PASSWORD_HASH_ROUNDS || 12);

    // 1️⃣ Seed Roles
    const roleNames = [
        "PLATFORM_ADMIN",
        "ADMIN",
        "APPROVER",
        "REQUESTER",
    ];

    const roles = await Promise.all(
        roleNames.map((name) =>
            prisma.role.upsert({
                where: { name },
                update: {},
                create: { name },
            })
        )
    );

    const roleMap = Object.fromEntries(
        roles.map((r) => [r.name, r])
    );

    console.log("✅ Roles seeded");

    // 2️⃣ Seed Platform Admin (NO UPSERT)
    const platformEmail = "platform@company.com";
    const platformPassword =
        process.env.PLATFORM_ADMIN_PASSWORD || "Platform@123";

    const passwordHash = await bcrypt.hash(platformPassword, rounds);

    const existingPlatformAdmin = await prisma.user.findFirst({
        where: {
            email: platformEmail,
            organizationId: null,
        },
    });

    if (!existingPlatformAdmin) {
        await prisma.user.create({
            data: {
                email: platformEmail,
                passwordHash,
                roleId: roleMap.PLATFORM_ADMIN.id,
                organizationId: null, // Option 3
                departmentId: null,
                isActive: true,
            },
        });

        console.log("✅ Platform admin created");
    } else {
        console.log("ℹ️ Platform admin already exists");
    }
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
