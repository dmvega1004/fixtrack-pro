import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

interface EmployeeAvatarProps {
  name: string;
  className?: string;
}

export function EmployeeAvatar({ name, className }: EmployeeAvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary",
        className,
      )}
      aria-hidden
    >
      {getInitials(name)}
    </span>
  );
}
