import { Router } from "express";
import {
    registerUser,
    verifyOTP,
    resendOtp,
    loginUser,
    refreshAccessToken,
    logoutUser,
    getCurrentUser,
    changePassword,
    forgotPassword,
    resetPassword,
    changeEmail,
    verifyEmailChange,
    deleteAccount,
} from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

// ==================== AUTHENTICATION ROUTES ====================
router.post("/register", registerUser);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOtp);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", verifyJWT, logoutUser);
router.get("/me", verifyJWT, getCurrentUser);

// ==================== PASSWORD & EMAIL ROUTES ====================
router.post("/change-password", verifyJWT, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-email", verifyJWT, changeEmail);
router.post("/verify-email-change", verifyJWT, verifyEmailChange);
router.delete("/delete-account", verifyJWT, deleteAccount);

export default router;
