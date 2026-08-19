import { motion } from "framer-motion";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ComponentPropsWithoutRef<typeof motion.button> {
  children: ReactNode;
  icon?: ReactNode;
  isLoading?: boolean;
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-500",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  danger:
    "bg-negative-600 text-white hover:bg-negative-500 focus-visible:outline-negative-500",
  ghost:
    "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
};

export function Button({
  children,
  className = "",
  disabled,
  icon,
  isLoading = false,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <motion.button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      type={type}
      whileTap={{ scale: 0.97 }}
      {...props}
    >
      {icon}
      <span>{isLoading ? "Processando" : children}</span>
    </motion.button>
  );
}
