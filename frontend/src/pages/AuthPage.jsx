import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/common/Button";
import { ShieldCheck, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

export const AuthPage = () => {
  const { login, register, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" | "register" | "verify"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("DEVELOPER");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Incorrect username or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(fullName, email, username, password, role);
      setSuccessMsg("Account created! A verification code has been dispatched to your email.");
      setMode("verify");
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      setSuccessMsg("Email verified! You can now sign in.");
      setMode("login");
    } catch (err) {
      setError(err.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await resendOtp(email);
      setSuccessMsg("A new verification code has been dispatched.");
    } catch (err) {
      setError(err.message || "Could not resend code.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col justify-center items-center py-12 px-4 text-[#e6edf3]">
      {/* GitHub Logo */}
      <div className="mb-6 text-center">
        <img src="/logo.svg" alt="Waypoint" className="w-12 h-12 rounded-lg mx-auto shadow-md" />
        <h2 className="text-2xl font-light text-[#e6edf3] tracking-tight mt-4">
          {mode === "login"
            ? "Sign in to Waypoint"
            : mode === "register"
              ? "Create your account"
              : "Two-step verification"}
        </h2>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* Alerts */}
        {error && (
          <div className="p-3 rounded-md bg-[rgba(248,81,73,0.15)] border border-[rgba(248,81,73,0.4)] text-[#f85149] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-md bg-[rgba(46,160,67,0.15)] border border-[rgba(46,160,67,0.4)] text-[#3fb950] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* GitHub Sign In Card */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-md p-5 text-xs shadow-md">
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-[#e6edf3] mb-1">
                  Username or email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-8 px-3 rounded-md bg-[#0d1117] border border-[#30363d] text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#e6edf3]">Password</label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-8 pl-3 pr-9 rounded-md bg-[#0d1117] border border-[#30363d] text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#7d8590] hover:text-[#e6edf3] transition-colors focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" variant="primary" loading={loading} className="w-full h-8 mt-2">
                Sign in
              </Button>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block font-semibold text-[#e6edf3] mb-1">Full name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Om Kathiriya"
                  className="w-full h-8 px-3 rounded-md bg-[#0d1117] border border-[#30363d] text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-[#e6edf3] mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="omkathiriya"
                    className="w-full h-8 px-3 rounded-md bg-[#0d1117] border border-[#30363d] text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#e6edf3] mb-1">Workspace role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full h-8 px-2 rounded-md bg-[#0d1117] border border-[#30363d] text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                  >
                    <option value="DEVELOPER">Developer</option>
                    <option value="REVIEWER">Reviewer</option>
                    <option value="DEVELOPER_REVIEWER">Developer & Reviewer (Dual Role)</option>
                    <option value="TEAM_LEAD">Team Lead</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#e6edf3] mb-1">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-8 px-3 rounded-md bg-[#0d1117] border border-[#30363d] text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#e6edf3] mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full h-8 pl-3 pr-9 rounded-md bg-[#0d1117] border border-[#30363d] text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#7d8590] hover:text-[#e6edf3] transition-colors focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" variant="primary" loading={loading} className="w-full h-8 mt-2">
                Create account
              </Button>
            </form>
          )}

          {mode === "verify" && (
            <form onSubmit={handleVerifyOtp} className="space-y-3.5 text-center">
              <ShieldCheck className="w-8 h-8 text-[#58a6ff] mx-auto" />
              <p className="text-xs text-[#7d8590]">
                Enter the 6-digit code sent to <strong className="text-[#e6edf3]">{email}</strong>
              </p>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.trim())}
                  placeholder="123456"
                  className="w-full text-center tracking-[0.5em] font-mono text-lg py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <Button type="submit" variant="primary" loading={loading} className="w-full h-8">
                Verify
              </Button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-[#58a6ff] hover:underline"
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-[#7d8590] hover:text-[#e6edf3]"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          )}
        </div>

        {/* GitHub Sub-Card (Switch mode) */}
        {mode !== "verify" && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4 text-center text-xs">
            {mode === "login" ? (
              <span>
                New to Waypoint?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  className="text-[#58a6ff] hover:underline"
                >
                  Create an account.
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className="text-[#58a6ff] hover:underline"
                >
                  Sign in.
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
