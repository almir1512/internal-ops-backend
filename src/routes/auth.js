// src/routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

function signAccessToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            organizationId: user.organizationId,
            role: user.role.name,
            departmentId: user.departmentId,
            email: user.email,
            type: "access",
        },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: process.env.JWT_ACCESS_TTL || "15m" }
    );
}

// POST /auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password, organizationId } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "email and password required" });
        }

        let user;

        // Tenant login: organizationId is required
        if (organizationId !== undefined && organizationId !== null && organizationId !== "") {
            user = await prisma.user.findFirst({
                where: {
                    email,
                    organizationId: Number(organizationId),
                    isActive: true,
                },
                include: { role: true },
            });
        } else {
            // Platform login: orgId must be NULL and role must be PLATFORM_ADMIN
            user = await prisma.user.findFirst({
                where: {
                    email,
                    organizationId: null,
                    isActive: true,
                },
                include: { role: true },
            });

            if (!user || user.role.name !== "PLATFORM_ADMIN") {
                return res.status(401).json({ message: "Invalid credentials" });
            }
        }

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const accessToken = signAccessToken(user);

        return res.json({
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                organizationId: user.organizationId, // null for platform admin
                role: user.role.name,
                departmentId: user.departmentId,
            },
        });
    } catch (err) {
        console.error("Login error", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// GET /auth/me
router.get("/me", authMiddleware, (req, res) => {
    // req.currentUser is set by authMiddleware
    return res.json({
        user: req.currentUser,
    });
});

module.exports = router;