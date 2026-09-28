// backend/src/utils/token.js
import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user._id || user.id,
            email: user.email,
            username: user.username,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d",
        }
    );
};

export const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            id: user._id || user.id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
        }
    );
};
