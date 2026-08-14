"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
  required = true,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full px-0 py-3 pr-8 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm placeholder:text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors bg-transparent"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-neutral-300 hover:text-neutral-600 transition-colors"
      >
        {visible ? (
          <EyeOff size={16} strokeWidth={1.5} />
        ) : (
          <Eye size={16} strokeWidth={1.5} />
        )}
      </button>
    </div>
  );
}
