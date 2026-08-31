import { useTheme } from "../../hooks/useTheme.js";
import { IconButton } from "../ui/IconButton.jsx";

const NEXT_LABEL = {
  system: "Match system theme — click for light",
  light: "Light theme — click for dark",
  dark: "Dark theme — click to match system",
};

const ICON = {
  system: "monitor",
  light: "sun",
  dark: "moon",
};

/**
 * Cycles system → light → dark.
 *
 * "System" is a real, selectable state rather than an implicit default, because
 * a member whose phone flips to dark at sunset should not have to remember what
 * they picked here at noon.
 */
export function ThemeToggle({ size = "md" }) {
  const { theme, cycleTheme } = useTheme();

  return (
    <IconButton
      icon={ICON[theme] ?? "monitor"}
      label={NEXT_LABEL[theme] ?? "Change theme"}
      size={size}
      onClick={cycleTheme}
    />
  );
}

export default ThemeToggle;
