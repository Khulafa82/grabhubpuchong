import { Link } from "react-router-dom";

export const Logo = ({ light = false }: { light?: boolean }) => (
  <Link to="/" className="flex items-center gap-2 group">
    <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-brand group-hover:scale-105 transition-transform">
      <span className="text-brand-foreground font-bold text-lg">G</span>
    </div>
    <div className="leading-tight">
      <div className={`font-bold text-base ${light ? "text-charcoal-foreground" : "text-charcoal"}`}>
        Grab Hub
      </div>
      <div className="text-xs text-brand font-semibold -mt-0.5">PUCHONG</div>
    </div>
  </Link>
);
