const express = require("express");
const bcrypt = require("bcrypt");
const prisma = require("../prisma");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

// All routes below: authenticated + PLATFORM_ADMIN only
router.use(auth, requireRole("PLATFORM_ADMIN"));

// POST /platform/organizations
router.post("/organizations", async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }

    try {
        const existing = await prisma.organization.findFirst({ where: { name } });
        if (existing) {
            return res.status(409).json({ message: "Organization already exists" });
        }

        const organization = await prisma.organization.create({
            data: { name },
        });

        return res.status(201).json({ organization });
    } catch (err) {
        console.error("Create organization error", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// GET /platform/organizations
router.get("/organizations", async (req, res) => {
    try {
        const organizations = await prisma.organization.findMany({
            orderBy: { name: "asc" },
        });

        return res.json({ organizations });
    } catch (err) {
        console.error("List organizations error", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// POST /platform/organizations/:organizationId/admins
router.post("/organizations/:organizationId/admins", async (req, res) => {
    const { organizationId } = req.params;
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "email and password are required" });
    }

    try {
        const orgId = Number(organizationId);
        // console.log(orgId);
        if (!Number.isFinite(orgId)) {
            return res.status(400).json({ message: "organizationId must be a number" });
        }

        const organization = await prisma.organization.findUnique({
            where: { id: orgId },
        });

        if (!organization) {
            return res.status(404).json({ message: "Organization not found" });
        }

        const adminRole = await prisma.role.findUnique({
            where: { name: "ADMIN" },
        });

        if (!adminRole) {
            return res.status(500).json({ message: "ADMIN role not found (seed roles first)" });
        }

        const existing = await prisma.user.findFirst({
            where: { email, organizationId: orgId },
        });

        if (existing) {
            return res.status(409).json({
                message: "User with this email already exists in this organization",
            });
        }

        const rounds = Number(process.env.PASSWORD_HASH_ROUNDS || 12);
        const passwordHash = await bcrypt.hash(password, rounds);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                organizationId: orgId,
                roleId: adminRole.id,
                departmentId: null, // admins are never department-scoped
            },
            include: { role: true },
        });

        return res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                organizationId: user.organizationId,
                role: user.role.name,
                departmentId: user.departmentId,
            },
        });
    } catch (err) {
        console.error("Create tenant admin error", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;