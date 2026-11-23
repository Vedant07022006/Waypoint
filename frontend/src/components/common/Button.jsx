import React from "react";
import { Loader2 } from "lucide-react";

export const Button = ({
  children,
  variant = "secondary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  className = "",
  ...props
}) => {
  const base = "inline-flex items-center justify-center font-medium rounded-md transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d1117] focus:ring-[#1f6feb] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none";

  const variants = {
    primary: "bg-[#238636] hover:bg-[#2ea043] active:bg-[#1f7f32] text-white border border-[rgba(240,246,252,0.1)] shadow-sm",
    secondary: "bg-[#21262d] hover:bg-[#30363d] active:bg-[#282e33] text-[#c9d1d9] hover:text-white border border-[#30363d] shadow-sm",
    success: "bg-[#238636] hover:bg-[#2ea043] text-white border border-[rgba(240,246,252,0.1)] shadow-sm",
    danger: "bg-[#21262d] hover:bg-[#da3633] active:bg-[#b62324] text-[#f85149] hover:text-white border border-[#30363d] shadow-sm",
    ghost: "bg-transparent hover:bg-[#21262d] text-[#7d8590] hover:text-[#c9d1d9]",
  };

  const sizes = {
    sm: "px-2.5 py-1 text-xs gap-1.5 h-7",
    md: "px-3 py-1.5 text-xs gap-1.5 h-8 font-medium",
    lg: "px-4 py-2 text-sm gap-2 h-9 font-medium",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5 text-current shrink-0" />
      ) : null}
      {children}
    </button>
  );
};
