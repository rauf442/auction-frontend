import React from "react";
import clsx from "clsx"; // optional, makes class merging cleaner

interface BadgeProps {
  className?: string;
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export const Badge: React.FC<BadgeProps> = ({
  className = "",
  children,
  variant = "default",
}) => {
  const baseClasses =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive:
      "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground",
  };

  return (
    <div className={clsx(baseClasses, variants[variant], className)}>
      {children}
    </div>
  );
};
