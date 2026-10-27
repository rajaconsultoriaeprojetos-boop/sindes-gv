"use client";

type Props = {
  className?: string;
  variant?: "light" | "dark" | "green";
};

export default function EcgDivider({ className = "", variant = "light" }: Props) {
  const stroke =
    variant === "dark" ? "#1F8A70" : variant === "green" ? "#1F8A70" : "rgba(31, 138, 112, 0.45)";

  return (
    <div className={`relative h-10 w-full overflow-hidden ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-[200%] max-w-none ecg-line-motion"
      >
        <path
          d="M0 20 H200 L220 20 L240 8 L260 32 L280 20 H480 L500 20 L520 6 L540 34 L560 20 H760 L780 20 L800 10 L820 30 L840 20 H1040 L1060 20 L1080 8 L1100 32 L1120 20 H2400"
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
