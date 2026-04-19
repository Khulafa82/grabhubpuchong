import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "./Logo";

export const Footer = () => (
  <footer className="bg-charcoal text-charcoal-foreground mt-20">
    <div className="container py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
      <div>
        <Logo light />
        <p className="text-sm text-charcoal-foreground/60 mt-4 leading-relaxed">
          Your trusted hub for GrabCar & GrabFood registration, reactivation and PSV guidance.
        </p>
      </div>
      <div>
        <h4 className="font-semibold mb-4">Quick Links</h4>
        <ul className="space-y-2 text-sm text-charcoal-foreground/70">
          <li><Link to="/about" className="hover:text-brand">About Us</Link></li>
          <li><Link to="/services" className="hover:text-brand">Services</Link></li>
          <li><Link to="/guide" className="hover:text-brand">Guide</Link></li>
          <li><Link to="/articles" className="hover:text-brand">Articles</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-4">Get Started</h4>
        <ul className="space-y-2 text-sm text-charcoal-foreground/70">
          <li><Link to="/register" className="hover:text-brand">Register Now</Link></li>
          <li><Link to="/contact" className="hover:text-brand">Contact Us</Link></li>
          <li><Link to="/staff-login" className="hover:text-brand">Staff Login</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-4">Contact</h4>
        <ul className="space-y-3 text-sm text-charcoal-foreground/70">
          <li className="flex gap-2"><MapPin size={16} className="text-brand mt-0.5" /> Puchong, Selangor</li>
          <li className="flex gap-2"><Phone size={16} className="text-brand mt-0.5" /> +60 — — ——— ——</li>
          <li className="flex gap-2"><Mail size={16} className="text-brand mt-0.5" /> hello@grabhubpuchong.my</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-charcoal-foreground/10">
      <div className="container py-5 text-xs text-charcoal-foreground/50 flex flex-col md:flex-row justify-between gap-2">
        <span>© {new Date().getFullYear()} Grab Hub Puchong. All rights reserved.</span>
        <span>Independent service hub. Not affiliated with Grab Holdings.</span>
      </div>
    </div>
  </footer>
);
