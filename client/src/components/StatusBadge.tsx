import { Badge } from "./ui/badge";

interface StatusBadgeProps {
  active: boolean;
  activeText?: string;
  inactiveText?: string;
  className?: string;
}

export function StatusBadge({
  active,
  activeText = "Active",
  inactiveText = "Inactive",
  className = "",
}: StatusBadgeProps) {
  return (
    <Badge
      variant={active ? "default" : "secondary"}
      className={
        active
          ? `bg-green-100 text-green-800 hover:bg-green-100 ${className}`
          : `bg-gray-100 text-gray-700 hover:bg-gray-100 ${className}`
      }
    >
      {active ? activeText : inactiveText}
    </Badge>
  );
}
