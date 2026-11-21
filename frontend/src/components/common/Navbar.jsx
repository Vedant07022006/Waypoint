import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../services/socket";
import {
  GitPullRequest,
  BookOpen,
  Bell,
  LogOut,
  Search,
  Plus,
  Radio,
  Terminal,
} from "lucide-react";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [socketConnected, setSocketConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    if (socket.connected) setSocketConnected(true);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    const handlePRUpdate = (data) => {
      addNotification({
        id: Date.now(),
        title: `PR #${data.prId?.slice(-4) || ""}`,
        message: `Status changed to ${data.status}`,
        timestamp: new Date(),
      });
    };

    const handlePrecheckResult = (data) => {
      addNotification({
        id: Date.now(),
        title: "Pre-check",
        message: `${data.checkStatus} with ${data.issues?.length || 0} issue(s)`,
        timestamp: new Date(),
      });
    };

    const handleSLAAlert = (data) => {
      addNotification({
        id: Date.now(),
        title: "SLA Warning",
        message: `Stage ${data.stageType} reached escalation level ${data.escalationCount || 1}`,
        timestamp: new Date(),
      });
    };

    socket.on("pr_status_changed", handlePRUpdate);
    socket.on("precheck_result", handlePrecheckResult);
    socket.on("sla_breached", handleSLAAlert);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("pr_status_changed", handlePRUpdate);
      socket.off("precheck_result", handlePrecheckResult);
      socket.off("sla_breached", handleSLAAlert);
    };
  }, []);

  const addNotification = (item) => {
    setNotifications((prev) => [item, ...prev.slice(0, 19)]);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#010409] border-b border-[#30363d] text-[#e6edf3]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: GitHub Logo & Nav items */}
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2.5 text-white hover:opacity-85 transition-opacity">
              <img src="/logo.svg" alt="Waypoint" className="w-7 h-7 rounded-md" />
              <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                Waypoint
                <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 rounded border border-[#30363d] bg-[#161b22] text-[#7d8590]">
                  DAG Review
                </span>
              </span>
            </Link>

            {/* Global Search box */}
            <div className="hidden lg:flex items-center ml-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type / to search"
                  readOnly
                  className="w-56 h-7 pl-7 pr-3 text-xs bg-[#161b22] border border-[#30363d] rounded-md text-[#7d8590] placeholder-[#7d8590] cursor-pointer"
                />
                <Search className="w-3.5 h-3.5 text-[#7d8590] absolute left-2 top-2 pointer-events-none" />
                <span className="absolute right-2 top-1.5 text-[10px] font-mono px-1 border border-[#30363d] rounded text-[#7d8590] bg-[#0d1117]">
                  /
                </span>
              </div>
            </div>

            {/* GitHub Primary Nav */}
            <nav className="flex items-center gap-1 text-xs font-semibold pl-2">
              <Link
                to="/dashboard"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  location.pathname === "/dashboard"
                    ? "text-white font-semibold bg-[#21262d]"
                    : "text-[#c9d1d9] hover:text-white hover:bg-[#21262d]"
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/repos"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  location.pathname.startsWith("/repos")
                    ? "text-white font-semibold bg-[#21262d]"
                    : "text-[#c9d1d9] hover:text-white hover:bg-[#21262d]"
                }`}
              >
                Repositories
              </Link>
            </nav>
          </div>

          {/* Right: Engine Status, Notifications, User */}
          <div className="flex items-center gap-3">
            {/* Live Socket Engine Indicator */}
            <div
              className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-md border ${
                socketConnected
                  ? "border-[#238636]/40 text-[#3fb950] bg-[#238636]/10"
                  : "border-[#d29922]/40 text-[#d29922] bg-[#d29922]/10"
              }`}
              title="Real-time WebSocket connection to backend"
            >
              <span className={`w-2 h-2 rounded-full ${socketConnected ? "bg-[#3fb950] animate-pulse" : "bg-[#d29922]"}`} />
              <span className="hidden sm:inline">{socketConnected ? "Engine Live" : "Connecting"}</span>
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 rounded-md text-[#c9d1d9] hover:text-white hover:bg-[#21262d] transition-colors border border-transparent hover:border-[#30363d]"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#1f6feb]" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-[#161b22] rounded-md shadow-2xl border border-[#30363d] z-50 text-xs text-[#e6edf3]">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d]">
                    <span className="font-semibold text-[#e6edf3]">Notifications</span>
                    <button
                      onClick={() => setNotifications([])}
                      className="text-[11px] text-[#58a6ff] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-[#21262d]">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-[#7d8590]">All caught up!</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-3 hover:bg-[#1c2128]">
                          <div className="font-medium text-[#e6edf3]">{n.title}</div>
                          <div className="text-[#7d8590] text-[11px] mt-0.5">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar & Menu */}
            {user && (
              <div className="flex items-center gap-2.5 pl-2 border-l border-[#30363d]">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 hover:opacity-85 transition-opacity"
                  title="View your profile"
                >
                  <div className="w-7 h-7 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center font-bold text-xs text-[#58a6ff]">
                    {(user.fullName || user.username || "U")[0].toUpperCase()}
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#e6edf3] leading-none">
                        {user.username}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                          user.role?.toLowerCase() === "team_lead" || user.role?.toLowerCase() === "owner"
                            ? "bg-[rgba(168,85,247,0.15)] text-[#c084fc] border border-[rgba(168,85,247,0.3)]"
                            : user.role?.toLowerCase() === "developer_reviewer"
                            ? "bg-[rgba(234,179,8,0.15)] text-[#eab308] border border-[rgba(234,179,8,0.3)]"
                            : user.role?.toLowerCase() === "reviewer"
                            ? "bg-[rgba(46,160,67,0.15)] text-[#3fb950] border border-[rgba(46,160,67,0.3)]"
                            : "bg-[rgba(56,139,253,0.15)] text-[#58a6ff] border border-[rgba(56,139,253,0.3)]"
                        }`}
                      >
                        {user.role?.toLowerCase() === "team_lead" ? "Team Lead" : user.role?.toLowerCase() === "developer_reviewer" ? "Dev & Reviewer" : user.role?.toLowerCase() === "reviewer" ? "Reviewer" : "Developer"}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#7d8590] leading-tight mt-0.5 truncate max-w-[120px]">
                      {user.fullName || user.email}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={logout}
                  className="p-1 rounded text-[#7d8590] hover:text-[#f85149] hover:bg-[#21262d] transition-colors ml-1"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
