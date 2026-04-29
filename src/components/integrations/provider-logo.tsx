import { cn } from "@/lib/utils";

type ProviderBrand = {
  label: string;
  logoUrl: string;
  background: string;
  border: string;
  shadow: string;
  logoSize?: string;
};

const providerBrands: Record<string, ProviderBrand> = {
  openai: {
    label: "OpenAI",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/6/66/OpenAI_logo_2025_%28symbol%29.svg",
    background: "#ffffff",
    border: "#d8e3ea",
    shadow: "0 10px 28px -22px rgba(17, 20, 24, 0.55)",
    logoSize: "62%",
  },
  anthropic: {
    label: "Anthropic Claude",
    logoUrl: "https://cdn.simpleicons.org/anthropic",
    background: "#f6f1ea",
    border: "#e1d7cb",
    shadow: "0 10px 28px -22px rgba(33, 28, 24, 0.55)",
  },
  google: {
    label: "Google Gemini",
    logoUrl: "https://cdn.simpleicons.org/googlegemini",
    background: "#f4f7ff",
    border: "#d9e3ff",
    shadow: "0 10px 28px -22px rgba(79, 88, 200, 0.55)",
  },
  mistral: {
    label: "Mistral AI",
    logoUrl: "https://cdn.simpleicons.org/mistralai",
    background: "#fff4e8",
    border: "#ffd8a8",
    shadow: "0 10px 28px -22px rgba(216, 91, 0, 0.55)",
  },
  stability: {
    label: "Stability AI",
    logoUrl: "https://dl.svgcdn.com/svg/logos/stability-ai-icon.svg",
    background: "#f7f7f5",
    border: "#deded8",
    shadow: "0 10px 28px -22px rgba(17, 20, 24, 0.45)",
    logoSize: "62%",
  },
  amazon: {
    label: "Amazon Bedrock",
    logoUrl: "https://www.awsicon.com/static/images/Service-Icons/Artificial-Intelligence/64/svg/Bedrock.svg",
    background: "#fff7e8",
    border: "#ffd99a",
    shadow: "0 10px 28px -22px rgba(220, 126, 0, 0.55)",
    logoSize: "70%",
  },
};

const fallbackBrand: ProviderBrand = {
  label: "AI provider",
  logoUrl: "https://cdn.simpleicons.org/icloud/6b7785",
  background: "#f3f7fb",
  border: "#d9e4ed",
  shadow: "0 10px 28px -22px rgba(17, 20, 24, 0.45)",
};

function normalizeProvider(provider: string) {
  return provider.trim().toLowerCase();
}

export function getProviderBrand(provider: string) {
  return providerBrands[normalizeProvider(provider)] ?? fallbackBrand;
}

export function ProviderLogo({
  provider,
  className,
  decorative = true,
}: {
  provider: string;
  className?: string;
  decorative?: boolean;
}) {
  const brand = getProviderBrand(provider);

  return (
    <span
      className={cn(
        "relative inline-grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white",
        "transition duration-200 group-hover/provider:-translate-y-0.5 group-hover/provider:shadow-md",
        className,
      )}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : `${brand.label} logo`}
      title={brand.label}
      style={{
        backgroundColor: brand.background,
        borderColor: brand.border,
        boxShadow: brand.shadow,
      }}
    >
      <span
        className="absolute inset-0 bg-center bg-no-repeat"
        aria-hidden="true"
        style={{
          backgroundImage: `url("${brand.logoUrl}")`,
          backgroundSize: brand.logoSize ?? "58%",
        }}
      />
      <span className="sr-only">{brand.label}</span>
    </span>
  );
}
