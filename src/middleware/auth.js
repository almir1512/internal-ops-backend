const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

async function authMiddleware(req, res, next) {
    const header = req.headers["authorization"] || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "Missing or invalid Authorization header" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        if (payload.type !== "access") {
            return res.status(401).json({ message: "Invalid token type" });
        }

        // Optionally re‑fetch user to ensure they still exist and are active
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            include: { role: true },
        });

        if (!user || !user.isActive) {
            return res.status(401).json({ message: "User not found or inactive" });
        }

        req.currentUser = {
            id: user.id,
            email: user.email,
            organizationId: user.organizationId,
            role: user.role.name,
            departmentId: user.departmentId,
        };

        next();
    } catch (err) {
        console.error("Auth error", err);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

module.exports = authMiddleware;