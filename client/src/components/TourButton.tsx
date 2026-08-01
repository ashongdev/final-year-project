import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

interface TourButtonProps {
  onClick: () => void;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

const TourButton = ({
  onClick,
  variant = "ghost",
  size = "sm",
  className = "",
  showLabel = true,
}: TourButtonProps) => {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={`gap-2 ${className}`}
      aria-label="Start product tour"
    >
      <HelpCircle className="h-4 w-4" />
      {showLabel && <span className="hidden sm:inline">Take a Tour</span>}
    </Button>
  );
};

export default TourButton;
