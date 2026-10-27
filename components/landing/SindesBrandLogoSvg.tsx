/**
 * Marca Sindes-GV — quatro círculos translúcidos + wordmark (cruz central removida até traçado fiel ao PNG oficial).
 * Cores: #5D25AA, #FCB065, #1E6FD9, #E84C6F
 */
type Props = {
  /** Texto claro no hero escuro; escuro em fundo claro */
  variant?: "onDark" | "onLight";
  className?: string;
  showWordmark?: boolean;
};

/** Posições calibradas contra media/sindes-logo-fonte-hd.png */
const CIRCLES = [
  { cx: 198, cy: 168, r: 108, fill: "#5D25AA" },
  { cx: 168, cy: 268, r: 86, fill: "#1E6FD9" },
  { cx: 302, cy: 158, r: 80, fill: "#FCB065" },
  { cx: 314, cy: 262, r: 84, fill: "#E84C6F" },
] as const;

export default function SindesBrandLogoSvg({
  variant = "onDark",
  className = "",
  showWordmark = true,
}: Props) {
  const wordFill = variant === "onDark" ? "#FFFFFF" : "#0E3A43";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 448"
      role="img"
      aria-label="Sindes-GV"
      className={className}
      shapeRendering="geometricPrecision"
    >
      <g className="sindes-logo-mark" opacity={0.62}>
        {CIRCLES.map((c) => (
          <circle key={`${c.cx}-${c.cy}`} cx={c.cx} cy={c.cy} r={c.r} fill={c.fill} />
        ))}
      </g>
      {showWordmark ? (
        <text
          x={256}
          y={412}
          textAnchor="middle"
          fontFamily="Inter, Arial, Helvetica, sans-serif"
          fontSize={52}
          fontWeight={700}
          letterSpacing="-0.03em"
          fill={wordFill}
        >
          Sindes-GV
        </text>
      ) : null}
    </svg>
  );
}
