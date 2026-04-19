import { Link } from "react-router-dom";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/Logo";

const RegistrationSuccess = () => (
  <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
    <div className="w-full max-w-lg">
      <div className="flex justify-center mb-6"><Logo /></div>
      <Card className="p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-brand/10 text-brand mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal mt-5">Registration successful!</h1>
        <p className="text-charcoal/65 mt-3">
          We've received your application. Our team will review it and get back to you shortly.
        </p>
        <div className="mt-6 p-4 bg-brand/5 rounded-xl flex items-start gap-3 text-left">
          <MessageCircle className="w-5 h-5 text-brand mt-0.5 shrink-0" />
          <div className="text-sm text-charcoal/75">
            Our team will contact you on <strong>WhatsApp</strong> using the number you provided. Please keep it active.
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-7">
          <Button asChild variant="outline" className="flex-1"><Link to="/register">Register Another</Link></Button>
          <Button asChild className="flex-1 gradient-brand"><Link to="/">Back to Home</Link></Button>
        </div>
      </Card>
    </div>
  </div>
);
export default RegistrationSuccess;
