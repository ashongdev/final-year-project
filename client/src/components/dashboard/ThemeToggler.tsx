import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { motion } from "framer-motion";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const ThemeToggler = () => {
  const { theme, setTheme } = useTheme();
  const selectedTheme = theme ?? "system";
  const themeOptions = ["system", "light", "dark"] as const;
  const selectedThemeIndex = Math.max(
    themeOptions.indexOf(selectedTheme as (typeof themeOptions)[number]),
    0,
  );

  return (
    <ToggleGroup
      type="single"
      value={selectedTheme}
      onValueChange={(value) => {
        if (value) setTheme(value);
      }}
      variant="default"
      size="sm"
      className="relative rounded-full border border-border bg-background/80 p-1"
    >
      <motion.span
        aria-hidden="true"
        animate={{ x: `${selectedThemeIndex * 100}%` }}
        transition={{ type: "spring", stiffness: 450, damping: 35 }}
        className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-foreground"
      />
      <ToggleGroupItem
        value="system"
        aria-label="Use system theme"
        className="relative z-10 rounded-full px-2.5 text-muted-foreground data-[state=on]:bg-transparent data-[state=on]:text-background"
      >
        <Laptop className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="light"
        aria-label="Use light theme"
        className="relative z-10 rounded-full px-2.5 text-muted-foreground data-[state=on]:bg-transparent data-[state=on]:text-background"
      >
        <Sun className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="dark"
        aria-label="Use dark theme"
        className="relative z-10 rounded-full px-2.5 text-muted-foreground data-[state=on]:bg-transparent data-[state=on]:text-background"
      >
        <Moon className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default ThemeToggler;
