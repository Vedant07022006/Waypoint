import ApiError from "../utils/ApiError.js";

/**
 * authorize(...roles)
 * Usage: router.post('/route', protect, authorize('owner', 'team_lead'), controller)
 * Must be used AFTER the protect (verifyJWT) middleware, which attaches req.user.
 */
const authorize = (...roles) => {
    const normalizedTargetRoles = roles.map((r) => r.toLowerCase().trim());

    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, "Unauthorized request"));
        }

        const userRole = (req.user.role || "").toLowerCase().trim();

        if (!normalizedTargetRoles.includes(userRole)) {
            return next(
                new ApiError(
                    403,
                    `Access denied. This action is restricted to [${roles.join(", ")}]. Your current role is: ${req.user.role || "unknown"}`
                )
            );
        }

        next();
    };
};

export default authorize;
