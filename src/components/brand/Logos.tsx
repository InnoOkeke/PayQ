import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * PayQ Official Brand Logo
 * 512x512 PNG monogram rendered cleanly across navigation, footer, and AI Copilot surfaces.
 */
export function PayQLogo({ className = "rounded-xl", size = 36 }: LogoProps) {
  return (
    <img
      src="/payq-logo.png"
      alt="PayQ Logo"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`object-contain shrink-0 select-none ${className}`}
    />
  );
}

// Backward-compatible aliases
export const LogoAiGateway = PayQLogo;
export const LogoVerifiedShield = PayQLogo;
