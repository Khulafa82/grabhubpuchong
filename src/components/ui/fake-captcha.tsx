import { useState } from "react";
import { Check, Loader2, ShieldCheck } from "lucide-react";

interface FakeCaptchaProps {
  verified: boolean;
  onVerify: (v: boolean) => void;
}

/**
 * Visual-only "I'm not a robot" checkbox.
 * Always passes after the user clicks it (no real verification).
 */
export const FakeCaptcha = ({ verified, onVerify }: FakeCaptchaProps) => {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (verified || loading) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onVerify(true);
    }, 600);
  };

  return (
    <div className="inline-flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3 shadow-sm select-none w-full max-w-xs">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={verified}
        aria-label="I'm not a robot"
        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
          verified ? "bg-green-500 border-green-500" : "bg-white border-gray-400 hover:border-brand"
        }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        ) : verified ? (
          <Check className="w-4 h-4 text-white" strokeWidth={3} />
        ) : null}
      </button>
      <span className="text-sm text-charcoal flex-1">I'm not a robot</span>
      <ShieldCheck className="w-6 h-6 text-brand/70" />
    </div>
  );
};

export default FakeCaptcha;