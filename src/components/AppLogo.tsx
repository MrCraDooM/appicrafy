import { Badge } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  /** Size of the icon box. Defaults to "md" (w-8 h-8) */
  size?: "sm" | "md" | "lg";
  /** Show text label next to the icon */
  showLabel?: boolean;
  /** Override text colour — defaults to foreground */
  labelClassName?: string;
  className?: string;
  /** When rendered on the gradient brand panel, use white variant */
  variant?: "default" | "brand";
}

const sizeMap = {
  sm: { box: "w-7 h-7", icon: "w-3.5 h-3.5", text: "text-base" },
  md: { box: "w-8 h-8", icon: "w-4 h-4", text: "text-lg" },
  lg: { box: "w-10 h-10", icon: "w-5 h-5", text: "text-xl" }
};

export function AppLogo({
  size = "md",
  showLabel = true,
  labelClassName,
  className,
  variant = "default"
}: AppLogoProps) {
  const s = sizeMap[size];

  const boxClass =
  variant === "brand" ?
  `${s.box} bg-brand-foreground/20 rounded-lg flex items-center justify-center flex-shrink-0` :
  `${s.box} brand-gradient rounded-lg flex items-center justify-center flex-shrink-0`;

  const iconClass =
  variant === "brand" ? `${s.icon} text-brand-foreground` : `${s.icon} text-brand-foreground`;

  const textClass =
  variant === "brand" ?
  `font-bold ${s.text} text-brand-foreground` :
  `font-bold ${s.text} text-foreground`;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={boxClass}>
        <Badge className="" />
      </div>
      {showLabel &&
      <span className={cn(textClass, labelClassName)}>AppicraFy</span>
      }
    </div>);

}