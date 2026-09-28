import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import connectDB from "./src/config/db.js";
import userRoutes from "./src/routes/user.routes.js";

const app = express();
const port = process.env.PORT || 5000;

// Connect to DB
connectDB();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Routes
app.use("/api/v1/users", userRoutes);

app.get("/", (req, res) => {
    res.send("Backend is Running Healthy!");
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    return res.status(statusCode).json({
        statusCode,
        success: false,
        message,
        errors: err.errors || [],
    });
});

