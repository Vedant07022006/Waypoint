import bcrypt from "bcrypt";
import validator from "validator";
import jwt from 'jsonwebtoken';

import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import generateOtp from "../utils/generateOtp.js";

import { User } from "../models/user.model.js";
import { OTP } from "../models/OTP.model.js";
import { RefreshToken } from "../models/RefreshToken.model.js";
import { Session } from "../models/Session.model.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import { sendOtpEmail } from "../services/email.service.js";

// REGISTER
export const registerUser = asyncHandler(async (req, res) => {
    let { fullName, username, email, password } = req.body;

    // 1. VALIDATION
    if (!fullName || !username || !email || !password) {
        throw new ApiError(400, "All fields are required");
    }

    fullName = fullName.trim();
    username = username.toLowerCase().trim();
    email = email.toLowerCase().trim();

    if (!validator.isEmail(email)) {
        throw new ApiError(400, "Invalid email address");
    }

    if (
        !validator.isStrongPassword(password, {
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
        })
    ) {
        throw new ApiError(
            400,
            "Password must contain uppercase, lowercase, number and special character"
        );
    }

    // 2. CHECK VERIFIED USERS
    const verifiedUsernameExists = await User.findOne({
        username,
        isVerified: true,
    });

    if (verifiedUsernameExists) {
        throw new ApiError(409, "Username already taken");
    }

    const verifiedEmailExists = await User.findOne({
        email,
        isVerified: true,
    });

    if (verifiedEmailExists) {
        throw new ApiError(409, "Email already registered");
    }

    // 3. REMOVE OLD UNVERIFIED USERS
    await User.deleteMany({
        isVerified: false,
        $or: [{ username }, { email }],
    });

    // 4. HASH PASSWORD
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. GENERATE OTP
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // 6. CREATE USER
    const user = await User.create({
        fullName,
        username,
        email,
        passwordHash,
        isVerified: false,
        authProvider: "local",
    });

    // 7. STORE OTP
    await OTP.create({
        userId: user._id,
        email,
        otpCode: otp,
        purpose: "REGISTER",
        expiresAt: otpExpiry,
    });

    // 8. SEND EMAIL
    try {
        await sendOtpEmail(email, otp, "REGISTER");
    } catch (error) {
        // Rollback created user and OTP if email fails
        await User.findByIdAndDelete(user._id);
        await OTP.deleteMany({ userId: user._id });
        throw new ApiError(500, "Failed to send verification email. Please try again.");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, null, "OTP sent successfully"));
});

// VERIFY OTP
export const verifyOTP = asyncHandler(async (req, res) => {
    let { email, otp } = req.body;

    // 1. VALIDATION
    if (!email || !otp) {
        throw new ApiError(400, "Email and OTP are required");
    }

    email = email.toLowerCase().trim();

    // 2. FIND USER
    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.isVerified) {
        throw new ApiError(400, "Account already verified");
    }

    // 3. FIND LATEST UNUSED OTP
    const otpRecord = await OTP.findOne({
        userId: user._id,
        purpose: "REGISTER",
        isUsed: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
        throw new ApiError(404, "OTP not found");
    }

    if (otpRecord.otpCode !== otp.toString()) {
        throw new ApiError(400, "Invalid OTP");
    }

    if (otpRecord.expiresAt < new Date()) {
        throw new ApiError(400, "OTP expired");
    }

    // 4. VERIFY USER & UPDATE LAST LOGIN
    const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
            $set: {
                isVerified: true,
                lastLogin: new Date(),
            },
        },
        { new: true }
    );

    // 5. MARK OTP AS USED
    await OTP.findByIdAndUpdate(otpRecord._id, {
        $set: { isUsed: true },
    });

    // 6. GENERATE JWT TOKENS
    const accessToken = generateAccessToken(updatedUser);
    const refreshToken = generateRefreshToken(updatedUser);

    // 7. STORE REFRESH TOKEN
    await RefreshToken.create({
        userId: updatedUser._id,
        tokenHash: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // 8. CREATE SESSION
    await Session.create({
        userId: updatedUser._id,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] || null,
        lastActivity: new Date(),
    });

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken,
                    user: {
                        id: updatedUser._id,
                        fullName: updatedUser.fullName,
                        username: updatedUser.username,
                        email: updatedUser.email,
                    },
                },
                "Account verified successfully"
            )
        );
});

// RESEND OTP
export const resendOtp = asyncHandler(async (req, res) => {
    let { email, purpose } = req.body;

    // 1. VALIDATION
    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    email = email.toLowerCase().trim();
    purpose = purpose || "REGISTER";

    if (!["REGISTER", "PASSWORD_RESET"].includes(purpose)) {
        throw new ApiError(400, "Invalid OTP purpose");
    }

    // 2. FIND USER
    const user = await User.findOne({ email });

    if (!user) {
        // Return success response to prevent email/user enumeration
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    null,
                    "If this email exists, a new OTP has been sent"
                )
            );
    }

    // 3. CHECK STATUS BASED ON PURPOSE
    if (purpose === "REGISTER" && user.isVerified) {
        throw new ApiError(400, "Account already verified");
    }

    if (purpose === "PASSWORD_RESET" && user.authProvider !== "local") {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    null,
                    "If this email exists, a new OTP has been sent"
                )
            );
    }

    // 4. INVALIDATE EXISTING UNUSED OTPS FOR THIS PURPOSE
    await OTP.deleteMany({
        userId: user._id,
        purpose,
        isUsed: false,
    });

    // 5. GENERATE NEW OTP
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 6. STORE OTP IN DATABASE
    const createdOtp = await OTP.create({
        userId: user._id,
        email,
        otpCode: otp,
        purpose,
        expiresAt: otpExpiry,
    });

    // 7. SEND OTP EMAIL
    try {
        await sendOtpEmail(email, otp, purpose);
    } catch (error) {
        // Rollback created OTP if email sending fails
        await OTP.findByIdAndDelete(createdOtp._id);
        throw new ApiError(500, "Failed to send OTP email. Please try again.");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "If this email exists, a new OTP has been sent"
            )
        );
});

// LOGIN
export const loginUser = asyncHandler(async (req, res) => {
    let { username, email, password } = req.body;

    // 1. VALIDATION
    if ((!email && !username) || !password) {
        throw new ApiError(400, "Email or username and password are required");
    }

    // Build dynamic query for either email or username
    const queryConditions = [];
    if (email) queryConditions.push({ email: email.toLowerCase().trim() });
    if (username) queryConditions.push({ username: username.toLowerCase().trim() });

    // 2. FIND USER
    const user = await User.findOne({
        $or: queryConditions,
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (!user.isVerified) {
        throw new ApiError(401, "Please verify your account first");
    }

    if (!user.passwordHash) {
        throw new ApiError(
            400,
            "This account was registered using Google. Please log in with Google."
        );
    }

    // 3. COMPARE PASSWORD
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    // 4. GENERATE TOKENS
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // 5. STORE REFRESH TOKEN
    await RefreshToken.create({
        userId: user._id,
        tokenHash: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // 6. CREATE SESSION
    await Session.create({
        userId: user._id,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] || null,
        lastActivity: new Date(),
    });

    // 7. UPDATE LAST LOGIN
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken,
                    user: {
                        id: user._id,
                        fullName: user.fullName,
                        username: user.username,
                        email: user.email,
                    },
                },
                "Login successful"
            )
        );
});

// REFRESH ACCESS TOKEN
export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token required");
    }

    let decoded;

    try {
        decoded = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    } catch {
        throw new ApiError(401, "Invalid or expired refresh token");
    }

    // 1. FIND USER
    const user = await User.findById(decoded.id || decoded._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // 2. FIND STORED UNREVOKED REFRESH TOKEN
    const storedToken = await RefreshToken.findOne({
        userId: user._id,
        tokenHash: incomingRefreshToken,
        revoked: false,
    });

    if (!storedToken) {
        throw new ApiError(401, "Refresh token mismatch or revoked");
    }

    if (storedToken.expiresAt < new Date()) {
        throw new ApiError(401, "Refresh token expired");
    }

    // 3. REVOKE OLD REFRESH TOKEN (Rotation)
    await RefreshToken.findByIdAndUpdate(storedToken._id, {
        $set: {
            revoked: true,
            revokedAt: new Date(),
        },
    });

    // 4. GENERATE NEW TOKENS
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // 5. STORE NEW REFRESH TOKEN
    await RefreshToken.create({
        userId: user._id,
        tokenHash: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // 6. UPDATE SESSION ACTIVITY
    await Session.updateMany(
        { userId: user._id },
        { $set: { lastActivity: new Date() } }
    );

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken },
                "Access token refreshed successfully"
            )
        );
});

// LOGOUT
export const logoutUser = asyncHandler(async (req, res) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized request");
    }

    const userId = req.user._id || req.user.id;

    // 1. REVOKE ALL ACTIVE REFRESH TOKENS FOR THIS USER
    await RefreshToken.updateMany(
        { userId, revoked: false },
        {
            $set: {
                revoked: true,
                revokedAt: new Date(),
            },
        }
    );

    // 2. DELETE ACTIVE SESSIONS
    await Session.deleteMany({ userId });

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, null, "User logged out successfully"));
});

// GET CURRENT USER
export const getCurrentUser = asyncHandler(async (req, res) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized request");
    }

    const userId = req.user._id || req.user.id;

    // Fetch user excluding sensitive password hash using .lean() for a plain JS object
    const fullUser = await User.findById(userId)
        .select("-passwordHash")
        .lean();

    if (!fullUser) {
        throw new ApiError(404, "User not found");
    }

    // Adapt properties for frontend naming compatibility
    const responseData = {
        ...fullUser,
        id: fullUser._id,
        education: fullUser.educations || fullUser.education || [],
        experience: fullUser.experiences || fullUser.experience || [],
    };

    return res
        .status(200)
        .json(new ApiResponse(200, responseData, "User fetched successfully"));
});

// CHANGE PASSWORD
export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new ApiError(400, "Current password and new password are required");
    }

    const userId = req.user._id || req.user.id;

    const user = await User.findById(userId).select("passwordHash authProvider");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.authProvider !== "local" || !user.passwordHash) {
        throw new ApiError(400, "Password change is not available for Google accounts");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isMatch) {
        throw new ApiError(401, "Current password is incorrect");
    }

    if (currentPassword === newPassword) {
        throw new ApiError(400, "New password must be different from current password");
    }

    if (
        !validator.isStrongPassword(newPassword, {
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
        })
    ) {
        throw new ApiError(
            400,
            "Password must contain uppercase, lowercase, number and special character"
        );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(userId, {
        $set: { passwordHash },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Password changed successfully"));
});

// FORGOT PASSWORD — send OTP 
export const forgotPassword = asyncHandler(async (req, res) => {
    let { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });

    if (!user || user.authProvider !== "local") {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    null,
                    "If this email exists, an OTP has been sent"
                )
            );
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.deleteMany({
        userId: user._id,
        purpose: "PASSWORD_RESET",
        isUsed: false,
    });

    const createdOtp = await OTP.create({
        userId: user._id,
        email,
        otpCode: otp,
        purpose: "PASSWORD_RESET",
        expiresAt: otpExpiry,
    });

    try {
        await sendOtpEmail(email, otp, "PASSWORD_RESET");
    } catch (error) {
        await OTP.findByIdAndDelete(createdOtp._id);
        throw new ApiError(500, "Failed to send OTP email. Please try again.");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "If this email exists, an OTP has been sent"
            )
        );
});

// RESET PASSWORD — verify OTP + set new password
export const resetPassword = asyncHandler(async (req, res) => {
    let { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        throw new ApiError(400, "Email, OTP and new password are required");
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const otpRecord = await OTP.findOne({
        userId: user._id,
        purpose: "PASSWORD_RESET",
        isUsed: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
        throw new ApiError(404, "OTP not found");
    }

    if (otpRecord.otpCode !== otp.toString()) {
        throw new ApiError(400, "Invalid OTP");
    }

    if (otpRecord.expiresAt < new Date()) {
        throw new ApiError(400, "OTP expired");
    }

    // Validate new password strength
    if (
        !validator.isStrongPassword(newPassword, {
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
        })
    ) {
        throw new ApiError(
            400,
            "Password must contain uppercase, lowercase, number and special character"
        );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 1. UPDATE USER PASSWORD
    await User.findByIdAndUpdate(user._id, {
        $set: { passwordHash },
    });

    // 2. MARK OTP AS USED
    await OTP.findByIdAndUpdate(otpRecord._id, {
        $set: { isUsed: true },
    });

    // 3. REVOKE ALL ACTIVE REFRESH TOKENS (force relogin)
    await RefreshToken.updateMany(
        { userId: user._id, revoked: false },
        {
            $set: {
                revoked: true,
                revokedAt: new Date(),
            },
        }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Password reset successfully"));
});

// CHANGE EMAIL — send OTP to new email
export const changeEmail = asyncHandler(async (req, res) => {
    let { newEmail } = req.body;

    if (!newEmail) {
        throw new ApiError(400, "New email is required");
    }

    newEmail = newEmail.toLowerCase().trim();

    if (!validator.isEmail(newEmail)) {
        throw new ApiError(400, "Invalid email address");
    }

    if (newEmail === req.user.email) {
        throw new ApiError(400, "New email must be different from current email");
    }

    const emailTaken = await User.findOne({
        email: newEmail,
        isVerified: true,
    });

    if (emailTaken) {
        throw new ApiError(409, "Email already in use");
    }

    const userId = req.user._id || req.user.id;
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.deleteMany({
        userId,
        purpose: "EMAIL_CHANGE",
        isUsed: false,
    });

    const createdOtp = await OTP.create({
        userId,
        email: newEmail,
        otpCode: otp,
        purpose: "EMAIL_CHANGE",
        expiresAt: otpExpiry,
    });

    try {
        await sendOtpEmail(newEmail, otp, "EMAIL_CHANGE");
    } catch (error) {
        await OTP.findByIdAndDelete(createdOtp._id);
        throw new ApiError(500, "Failed to send OTP email. Please try again.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, "OTP sent to new email"));
});

// VERIFY EMAIL CHANGE — confirm OTP + swap email
export const verifyEmailChange = asyncHandler(async (req, res) => {
    const { otp } = req.body;

    if (!otp) {
        throw new ApiError(400, "OTP is required");
    }

    const userId = req.user._id || req.user.id;

    const otpRecord = await OTP.findOne({
        userId,
        purpose: "EMAIL_CHANGE",
        isUsed: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
        throw new ApiError(404, "OTP not found. Please request email change again");
    }

    if (otpRecord.otpCode !== otp.toString()) {
        throw new ApiError(400, "Invalid OTP");
    }

    if (otpRecord.expiresAt < new Date()) {
        throw new ApiError(400, "OTP expired");
    }

    // Update user's email
    await User.findByIdAndUpdate(userId, {
        $set: { email: otpRecord.email },
    });

    // Mark OTP as used
    await OTP.findByIdAndUpdate(otpRecord._id, {
        $set: { isUsed: true },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Email updated successfully"));
});

// DELETE ACCOUNT
export const deleteAccount = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const userId = req.user._id || req.user.id;

    const user = await User.findById(userId).select("passwordHash authProvider");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.authProvider === "local") {
        if (!password) {
            throw new ApiError(400, "Password is required to delete account");
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
            throw new ApiError(401, "Incorrect password");
        }
    }

    // Cascade delete user-related documents
    await User.findByIdAndDelete(userId);
    await OTP.deleteMany({ userId });
    await RefreshToken.deleteMany({ userId });
    await Session.deleteMany({ userId });

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, null, "Account deleted successfully"));
});



