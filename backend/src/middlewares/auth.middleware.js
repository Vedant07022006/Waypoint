import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const verifyJWT = asyncHandler(async (req, _, next) => {
    // 1. EXTRACT TOKEN FROM COOKIES OR AUTH HEADER
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, "Unauthorized request");
    }

    // 2. VERIFY TOKEN
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
        throw new ApiError(401, "Invalid or expired access token");
    }

    // 3. FETCH USER FROM MONGODB (Excluding passwordHash)
    const user = await User.findById(decoded.id || decoded._id).select(
        "-passwordHash"
    );

    if (!user) {
        throw new ApiError(401, "Invalid access token");
    }

    if (!user.isActive) {
        throw new ApiError(403, "Account is deactivated");
    }

    // 4. ATTACH USER TO REQUEST
    req.user = user;

    next();
});

export default verifyJWT;
