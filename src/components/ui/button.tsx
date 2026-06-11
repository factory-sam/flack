import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "border border-[color-mix(in_oklch,var(--accent)_45%,var(--line))] bg-[color-mix(in_oklch,var(--accent)_28%,var(--surface-2))] text-[var(--text)] shadow-sm shadow-black/20 hover:border-[var(--accent)] hover:bg-[color-mix(in_oklch,var(--accent)_36%,var(--surface-2))]",
        ghost: "border border-[var(--line)] bg-transparent text-[var(--muted)] hover:border-[var(--line-strong)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]",
        danger: "bg-[var(--danger)] text-white shadow-sm shadow-black/20 hover:brightness-110"
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        default: "h-9 px-3",
        icon: "h-9 w-9 p-0"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
