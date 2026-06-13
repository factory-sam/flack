import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  "w-full border border-[var(--line)] bg-[var(--panel)] text-sm text-[var(--text)] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--accent)_22%,transparent)] disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      density: {
        compact: "h-8 rounded-md px-2.5 text-xs",
        default: "h-9 rounded-md px-3",
        roomy: "h-10 rounded-lg px-3"
      }
    },
    defaultVariants: {
      density: "default"
    }
  }
);

const textareaVariants = cva(
  "w-full resize-none border border-[var(--line)] bg-[var(--panel)] text-sm text-[var(--text)] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--accent)_22%,transparent)] disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      density: {
        compact: "rounded-md px-2.5 py-2 text-xs",
        default: "rounded-lg px-3 py-2.5",
        roomy: "rounded-xl px-3 py-3"
      }
    },
    defaultVariants: {
      density: "default"
    }
  }
);

export function Input({
  className,
  density,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & VariantProps<typeof inputVariants>) {
  return <input {...props} className={cn(inputVariants({ density, className }))} />;
}

export function Textarea({
  className,
  density,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & VariantProps<typeof textareaVariants>) {
  return <textarea {...props} className={cn(textareaVariants({ density, className }))} />;
}

export { inputVariants, textareaVariants };
