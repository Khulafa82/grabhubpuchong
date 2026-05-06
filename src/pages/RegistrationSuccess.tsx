import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/Logo";

const RegistrationSuccess = () => {
  const [params] = useSearchParams();
  const isWalkIn = params.get("walk_in") === "1";
  return (
  <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
    <div className="w-full max-w-lg">
      <div className="flex justify-center mb-6"><Logo /></div>
      <Card className="p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-brand/10 text-brand mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal mt-5">
          {isWalkIn ? "Thank you. Your walk-in registration has been submitted." : "Thank you for registering with Grab Hub Puchong."}
        </h1>
        <p className="text-charcoal/70 mt-3">
          {isWalkIn
            ? "Our staff will assist you shortly."
            : "Our dedicated team will contact you shortly via WhatsApp to proceed with your application."}
        </p>
        {!isWalkIn && (
        <div className="mt-6 p-4 bg-brand/5 rounded-xl flex items-start gap-3 text-left">
          <MessageCircle className="w-5 h-5 text-brand mt-0.5 shrink-0" />
          <div className="text-sm text-charcoal/75">
            Please keep your phone accessible and check your <strong>WhatsApp</strong> for updates from our team.
          </div>
        </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 mt-7">
          <Button asChild className="flex-1 gradient-brand"><Link to={isWalkIn ? "/walk-in-registration" : "/register"}>Register Another Application</Link></Button>
          <Button asChild variant="outline" className="flex-1"><Link to="/">Back to Home</Link></Button>
        </div>
      </Card>
    </div>
  </div>
  );
};
export default RegistrationSuccess;
