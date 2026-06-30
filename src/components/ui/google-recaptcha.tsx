import { useEffect, useRef } from "react";

/**
 * Google reCAPTCHA v2 Checkbox.
 *
 * Uses Google's official documented TEST site key, which renders the real
 * "I'm not a robot" widget and always returns a passing token.
 * See: https://developers.google.com/recaptcha/docs/faq
 */
const RECAPTCHA_TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
const SCRIPT_ID = "google-recaptcha-v2-script";

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark";
        }
      ) => number;
      reset: (widgetId?: number) => void;
    };
  }
}

interface GoogleRecaptchaProps {
  onVerify: (token: string | null) => void;
}

export const GoogleRecaptcha = ({ onVerify }: GoogleRecaptchaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled) return;
      if (!window.grecaptcha || !containerRef.current) return;
      if (widgetIdRef.current !== null) return;
      try {
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: RECAPTCHA_TEST_SITE_KEY,
          callback: (token: string) => onVerify(token),
          "expired-callback": () => onVerify(null),
          "error-callback": () => onVerify(null),
        });
      } catch {
        /* already rendered */
      }
    };

    const waitForGrecaptcha = () => {
      if (cancelled) return;
      if (window.grecaptcha && typeof window.grecaptcha.render === "function") {
        renderWidget();
      } else {
        setTimeout(waitForGrecaptcha, 150);
      }
    };

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    waitForGrecaptcha();

    return () => {
      cancelled = true;
    };
  }, [onVerify]);

  return <div ref={containerRef} className="g-recaptcha" />;
};

export default GoogleRecaptcha;