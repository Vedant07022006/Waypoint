import rateLimit from "express-rate-limit";

// General API rate limiter: 500 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
    errors: [],
  },
});

// Stricter limiter for authentication routes (login / register / otp)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes",
    errors: [],
  },
});
