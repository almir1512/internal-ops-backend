const express = require("express");
const bcrypt = require("bcrypt");
const prisma = require("../prisma");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

// All routes below: authenticated + ADMIN only
router.use(auth, requireRole("ADMIN"));

// POST /admin/departments
router.post("/departments", async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }

    try {
        const organizationId = req.currentUser.organizationId;

        const existing = await prisma.department.findFirst({
            where: { name, organizationId },
        });
        if (existing) {
            return res.status(409).json({ message: "Department already exists in this organization" });
        }

        const department = await prisma.department.create({
            data: {
                name,
                organizationId,
            },
        });

        return res.status(201).json({ department });
    } catch (err) {
        console.error("Create department error", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// GET /admin/departments
router.get("/departments", async (req, res) => {
    try {
        const organizationId = req.currentUser.organizationId;
        const departments = await prisma.department.findMany({
            where: { organizationId },
            orderBy: { name: "asc" },
        });
        return res.json({ departments });
    } catch (err) {
        console.error("List departments error", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
// POST /admin/service-types
router.post("/service-types", async (req, res) => {
    const { name, description, departmentId, isActive = true } = req.body;

    if (!name || !departmentId) {
        return res.status(400).json({ message: "name and departmentId are required" });
    }

    try {
        const organizationId = req.currentUser.organizationId;

        // Ensure department belongs to this org
        const department = await prisma.department.findFirst({
            where: { id: Number(departmentId), organizationId },
        });
        if (!department) {
            return res.status(400).json({ message: "Invalid departmentId for this organization" });
        }

        const existing = await prisma.serviceType.findFirst({
            where: { name, organizationId },
        });
        if (existing) {
            return res.status(409).json({ message: "Service type already exists in this organization" });
        }

        const serviceType = await prisma.serviceType.create({
            data: {
                name,
                description,
                isActive,
                organizationId,
                departmentId: department.id,
            },
        });

        return res.status(201).json({ serviceType });
    } catch (err) {
        console.error("Create service type error", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// GET /admin/service-types
router.get("/service-types", async (req, res) => {
    try {
        const organizationId = req.currentUser.organizationId;

        const serviceTypes = await prisma.serviceType.findMany({
            where: { organizationId },
            include: { department: true },
            orderBy: { name: "asc" },
        });

        return res.json({ serviceTypes });
    } catch (err) {
        console.error("List service types error", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// POST /admin/users
router.post("/users", async (req, res) => {
    const { email, password, roleName, departmentId } = req.body;

    if (!email || !password || !roleName) {
        return res
            .status(400)
            .json({ message: "email, password, and roleName are required" });
    }

    try {
        const organizationId = req.currentUser.organizationId;
        const rounds = Number(process.env.PASSWORD_HASH_ROUNDS || 12);

        // 🔒 Allowed roles that can be created via this route
        const ALLOWED_ROLES = ["REQUESTER", "APPROVER"];

        if (!ALLOWED_ROLES.includes(roleName)) {
            return res.status(403).json({
                message: `Creation of role '${roleName}' is not allowed`
            });
        }

        // Fetch role
        const role = await prisma.role.findUnique({
            where: { name: roleName },
        });

        if (!role) {
            return res.status(400).json({ message: "Invalid roleName" });
        }

        // 🔒 Department rules
        let department = null;

        if (roleName === "APPROVER") {
            // APPROVER must have a department
            if (departmentId == null || departmentId === "") {
                return res.status(400).json({
                    message: "departmentId is required for APPROVER role",
                });
            }

            department = await prisma.department.findFirst({
                where: {
                    id: Number(departmentId),
                    organizationId,
                },
            });

            if (!department) {
                return res.status(400).json({
                    message: "Invalid departmentId for this organization",
                });
            }
        } else if (roleName === "REQUESTER") {
            // REQUESTER should not be department-scoped to ignore any departmentId
            department = null;
        }

        // 🔒 Prevent duplicate users in same org
        const existing = await prisma.user.findFirst({
            where: { email, organizationId },
        });

        if (existing) {
            return res.status(409).json({
                message: "User with this email already exists in this organization",
            });
        }

        const passwordHash = await bcrypt.hash(password, rounds);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                organizationId,
                roleId: role.id,
                departmentId: department ? department.id : null,
            },
            include: {
                role: true,
                department: true,
            },
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
        console.error("Create user error", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;