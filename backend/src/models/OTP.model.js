import mongoose, { Schema } from "mongoose";

const otpSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        otpCode: {
            type: String,
            required: true,
        },
        purpose: {
            type: String,
            enum: ["REGISTER", "PASSWORD_RESET", "EMAIL_CHANGE"],
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        isUsed: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

export const OTP = mongoose.model("OTP", otpSchema);
