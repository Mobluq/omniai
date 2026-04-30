import Image from "next/image";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
  wordmark?: string;
};

export function AppLogo({
  className,
  markClassName,
  wordmarkClassName,
  showWordmark = true,
  wordmark = "OmniAI",
}: AppLogoProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#171314]",
          markClassName,
        )}
        aria-hidden={showWordmark ? "true" : undefined}
      >
        <Image
          src="/brand/omniai-logo.png"
          alt={showWordmark ? "" : "OmniAI"}
          width={96}
          height={96}
          className="h-full w-full object-contain"
          draggable={false}
        />
      </span>
      {showWordmark ? (
        <span
          className={cn(
            "truncate text-[1.02rem] font-semibold tracking-[-0.03em]",
            wordmarkClassName,
          )}
        >
          {wordmark}
        </span>
      ) : null}
    </span>
  );
}
