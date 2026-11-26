import { Link } from "react-router";

interface BrandLogoProps {
  href?: string;
  logoSrc?: string;
  className?: string;
  size?: "default" | "sm" | "lg";
  onClick?: (e: React.MouseEvent) => void;
}

export default function BrandLogo({
  href = "/",
  logoSrc = "/logo-mayesha.png",
  className = "",
  size = "default",
  onClick,
}: BrandLogoProps) {
  const iconClass =
    size === "sm" ? "h-9 w-9" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const titleClass =
    size === "sm"
      ? "text-[22px]"
      : size === "lg"
      ? "text-[32px]"
      : "text-[26px] sm:text-[28px]";
  const subClass =
    size === "sm" ? "text-[10px]" : "text-[11px] sm:text-xs";

  return (
    <Link
      to={href}
      onClick={onClick}
      aria-label="Mayesha, Mom, Kids and Baby Spa - ke beranda"
      className={`group inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2 select-none ${className}`}
    >
      <img
        src={logoSrc}
        alt="Mayesha Logo"
        width={44}
        height={44}
        className={`${iconClass} shrink-0 object-contain`}
        onError={(e) => {
          const target = e.currentTarget;
          if (!target.src.endsWith("/logo.png")) {
            target.src = "/logo.png";
          }
        }}
      />

      <span className="flex flex-col leading-none">
        <span
          className={`font-['Playfair_Display',Georgia,serif] font-medium italic text-[#C94A83] group-hover:text-[#B73F73] transition-colors duration-150 ${titleClass}`}
          style={{ letterSpacing: "-0.01em" }}
        >
          Mayesha
        </span>
        <span
          className={`font-sans font-medium text-[#6B3A1E] mt-1 ${subClass} tracking-wide`}
        >
          Mom, Kids &amp; Baby Spa
        </span>
      </span>
    </Link>
  );
}
