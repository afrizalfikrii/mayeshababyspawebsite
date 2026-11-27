import { Link } from "react-router";

interface BrandLogoProps {
  href?: string;
  logoSrc?: string;
  className?: string;
  size?: "default" | "sm" | "lg";
  hideTaglineOnMobile?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export default function BrandLogo({
  href = "/",
  logoSrc = "/logo-mayesha.png",
  className = "",
  size = "default",
  hideTaglineOnMobile = false,
  onClick,
}: BrandLogoProps) {
  const iconClass =
    size === "sm" ? "h-9 w-9" : size === "lg" ? "h-14 w-14" : "h-9 w-9 md:h-11 md:w-11";
  const titleClass =
    size === "sm"
      ? "text-[22px]"
      : size === "lg"
      ? "text-[32px]"
      : "text-[22px] sm:text-[24px] md:text-[28px]";

  return (
    <Link
      to={href}
      onClick={onClick}
      aria-label="Mayesha, Mom, Kids and Baby Spa - ke beranda"
      className={`group inline-flex items-center gap-2.5 md:gap-3 min-h-[44px] rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94A83] focus-visible:ring-offset-2 select-none ${className}`}
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
          className={`font-['DM_Sans',sans-serif] font-medium text-[#6B3A1E] mt-1 text-[12px] leading-[16px] tracking-wide ${
            hideTaglineOnMobile ? "hidden md:block" : ""
          }`}
        >
          Mom, Kids &amp; Baby Spa
        </span>
      </span>
    </Link>
  );
}
