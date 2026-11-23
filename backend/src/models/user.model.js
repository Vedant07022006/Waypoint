import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // allows null/undefined values to remain unique
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["owner", "team_lead", "developer", "reviewer", "developer_reviewer"],
      default: "developer",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    // ── ML Service Fields ────────────────────────────────────────────────────
    // Populated on every commit — used by TF-IDF expertise profiling (Phase 7)
    commitHistory: [
      {
        files: [{ type: String }],
        message: { type: String },
        _id: false,
      },
    ],
    // Live workload counter — incremented on assignment, decremented on completion
    currentOpenReviews: {
      type: Number,
      default: 0,
    },
    // Optional manually tagged areas of expertise (e.g. ["auth", "payments"])
    expertiseTags: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", userSchema);
