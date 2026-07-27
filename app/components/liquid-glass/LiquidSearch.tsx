import { SearchIcon } from "lucide-react";
import {
  useId,
  type ChangeEventHandler,
  type InputHTMLAttributes,
} from "react";
import { LiquidGlassSurface } from "@/components/liquid-glass/LiquidGlassSurface";
import { cn } from "@/lib/utils";

export type LiquidSearchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & {
  width?: number;
  height?: number;
  containerClassName?: string;
  blur?: number;
  refractionLevel?: number;
  specularOpacity?: number;
  specularSaturation?: number;
};

/** Glass search field with liquid refraction when supported. */
export function LiquidSearch({
  width = 420,
  height = 56,
  className,
  containerClassName,
  placeholder = "Search",
  blur,
  refractionLevel,
  specularOpacity,
  specularSaturation,
  onChange,
  ...inputProps
}: LiquidSearchProps) {
  const id = useId();
  const radius = height / 2;

  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    onChange?.(e);
  };

  return (
    <LiquidGlassSurface
      width={width}
      height={height}
      radius={radius}
      blur={blur}
      refractionLevel={refractionLevel}
      specularOpacity={specularOpacity}
      specularSaturation={specularSaturation}
      className={cn("shadow-lg", containerClassName)}
    >
      <label
        htmlFor={id}
        className="flex h-full w-full cursor-text items-center gap-3 px-5 text-white/90"
      >
        <SearchIcon className="size-5 shrink-0 opacity-70" aria-hidden />
        <input
          id={id}
          type="search"
          placeholder={placeholder}
          aria-label={inputProps["aria-label"] ?? placeholder}
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent text-[15px] leading-none text-white/80 outline-none placeholder:text-white/40",
            className,
          )}
          onChange={handleChange}
          {...inputProps}
        />
      </label>
    </LiquidGlassSurface>
  );
}
