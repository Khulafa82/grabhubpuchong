import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Car, Bike, MapPin, RefreshCw, UserPlus, ChevronLeft, ChevronRight, Check, AlertCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Logo } from "@/components/site/Logo";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type Type = "grabcar" | "grabfood" | "";
type Status = "new" | "reactivation" | "";

const stepTitles = [
  "Registration Type",
  "Operating Location",
  "Account Status",
  "Eligibility",
  "Vehicle Info",
  "Personal Information",
];

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<Type>("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<Status>("");
  const [eligibility, setEligibility] = useState({ blueIc: "", license: "", record: "" });
  const [vehicle, setVehicle] = useState({ psv: "", carAvailable: "", carModel: "", carYear: "", motor: "", motorDetails: "" });
  const [personal, setPersonal] = useState({ name: "", ic: "", email: "", phone: "", state: "" });

  const total = stepTitles.length;
  const next = () => setStep((s) => Math.min(total, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const canNext = (() => {
    if (step === 1) return type !== "";
    if (step === 2) return location !== "";
    if (step === 3) return status !== "";
    if (step === 4) return eligibility.blueIc && eligibility.license && eligibility.record;
    if (step === 5) return type === "grabcar" ? vehicle.psv && vehicle.carAvailable : vehicle.motor;
    return true;
  })();

  const validateFinal = (): string | null => {
    if (!personal.name.trim()) return "Full name is required.";
    if (!/^\d{12}$/.test(personal.ic.trim())) return "IC number must be exactly 12 digits.";
    if (!personal.phone.trim()) return "Phone number is required.";
    if (!type) return "Registration type is required.";
    if (!location) return "Operating location is required.";
    if (!status) return "Account status is required.";
    return null;
  };

  const submit = async () => {
    const err = validateFinal();
    if (err) {
      toast({ title: "Please check the form", description: err, variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const eligibility_status =
      eligibility.blueIc === "Yes" && eligibility.record === "No" ? "eligible" : "review";

    const payload: Record<string, unknown> = {
      full_name: personal.name.trim(),
      ic_number: personal.ic.trim(),
      email_address: personal.email.trim() || null,
      phone_number: personal.phone.trim(),
      user_role: type === "grabcar" ? "grabcar" : "grabfood",
      location_choice: location,
      state: personal.state.trim() || null,
      account_status: status,
      blue_ic_status: eligibility.blueIc || null,
      license_type: eligibility.license || null,
      criminal_record_status: eligibility.record || null,
      eligibility_status,
    };

    if (type === "grabcar") {
      payload.psv_license_status = vehicle.psv || null;
      payload.has_car = vehicle.carAvailable === "Yes";
      payload.car_model = vehicle.carModel || null;
      payload.car_year = vehicle.carYear ? Number(vehicle.carYear) || vehicle.carYear : null;
      payload.vehicle_type = "car";
      payload.vehicle_model = vehicle.carModel || null;
    } else {
      payload.has_motorcycle = vehicle.motor === "Yes";
      payload.motorcycle_details = vehicle.motorDetails || null;
      payload.vehicle_type = "motorcycle";
      payload.vehicle_model = vehicle.motorDetails || null;
    }

    const { error } = await supabase.from("customers").insert(payload);

    setSubmitting(false);

    if (error) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    navigate("/registration-success");
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-background border-b border-border">
        <div className="container h-16 flex items-center justify-between">
          <Logo />
          <Button asChild variant="ghost" size="sm"><Link to="/">Cancel</Link></Button>
        </div>
      </header>

      <div className="container max-w-3xl py-10">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-semibold text-charcoal">Step {step} of {total}</span>
            <span className="text-charcoal/60">{stepTitles[step - 1]}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
            <div className="h-full gradient-brand transition-all duration-500" style={{ width: `${(step / total) * 100}%` }} />
          </div>
          <div className="hidden md:flex justify-between mt-3">
            {stepTitles.map((t, i) => (
              <div key={t} className={`text-[11px] ${i + 1 <= step ? "text-brand font-semibold" : "text-charcoal/40"}`}>
                {i + 1}. {t}
              </div>
            ))}
          </div>
        </div>

        <Card className="p-8">
          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Choose registration type</h2>
              <p className="text-sm text-charcoal/60 mt-1">What would you like to register for?</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                {[{ v: "grabcar", icon: Car, t: "GrabCar Driver" }, { v: "grabfood", icon: Bike, t: "GrabFood Rider" }].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setType(o.v as Type)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${type === o.v ? "border-brand bg-brand/5" : "border-border hover:border-brand/40"}`}
                  >
                    <o.icon className={`w-8 h-8 ${type === o.v ? "text-brand" : "text-charcoal/40"}`} />
                    <div className="font-semibold text-charcoal mt-3">{o.t}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Operating location</h2>
              <p className="text-sm text-charcoal/60 mt-1">Where will you be operating?</p>
              <RadioGroup value={location} onValueChange={setLocation} className="mt-6 grid gap-3">
                {["Klang Valley", "Outside Klang Valley", "Sabah & Sarawak"].map((o) => (
                  <label key={o} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${location === o ? "border-brand bg-brand/5" : "border-border"}`}>
                    <RadioGroupItem value={o} /><MapPin className="w-4 h-4 text-brand" /><span className="font-medium">{o}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Account status</h2>
              <p className="text-sm text-charcoal/60 mt-1">Are you a new applicant or reactivating?</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                {[{ v: "new", icon: UserPlus, t: "New Account", d: "Brand new application" },
                  { v: "reactivation", icon: RefreshCw, t: "Reactivation", d: "Restore existing account", disabled: type === "grabfood" }].map((o) => (
                  <button
                    key={o.v}
                    disabled={o.disabled}
                    onClick={() => !o.disabled && setStatus(o.v as Status)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                      o.disabled ? "opacity-50 cursor-not-allowed border-border" :
                      status === o.v ? "border-brand bg-brand/5" : "border-border hover:border-brand/40"
                    }`}
                  >
                    <o.icon className={`w-7 h-7 ${status === o.v ? "text-brand" : "text-charcoal/40"}`} />
                    <div className="font-semibold text-charcoal mt-3">{o.t}</div>
                    <div className="text-xs text-charcoal/60 mt-1">{o.d}</div>
                    {o.disabled && (
                      <div className="text-[11px] text-destructive mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Not available for GrabFood</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Eligibility check</h2>
              <p className="text-sm text-charcoal/60 mt-1">Please answer the following.</p>
              <div className="mt-6 space-y-5">
                <div>
                  <Label>Do you hold a Blue IC?</Label>
                  <RadioGroup className="flex gap-4 mt-2" value={eligibility.blueIc} onValueChange={(v) => setEligibility({ ...eligibility, blueIc: v })}>
                    {["Yes", "No"].map((o) => <label key={o} className="flex items-center gap-2"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                </div>
                <div>
                  <Label>Driving license type</Label>
                  <RadioGroup className="flex flex-wrap gap-4 mt-2" value={eligibility.license} onValueChange={(v) => setEligibility({ ...eligibility, license: v })}>
                    {["B2", "B", "D", "DA", "Other"].map((o) => <label key={o} className="flex items-center gap-2"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                </div>
                <div>
                  <Label>Any criminal record?</Label>
                  <RadioGroup className="flex gap-4 mt-2" value={eligibility.record} onValueChange={(v) => setEligibility({ ...eligibility, record: v })}>
                    {["No", "Yes"].map((o) => <label key={o} className="flex items-center gap-2"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && type === "grabcar" && (
            <div>
              <h2 className="text-2xl font-bold text-charcoal">PSV license & vehicle</h2>
              <div className="mt-6 space-y-5">
                <div>
                  <Label>Do you have a PSV license?</Label>
                  <RadioGroup className="flex gap-4 mt-2" value={vehicle.psv} onValueChange={(v) => setVehicle({ ...vehicle, psv: v })}>
                    {["Yes", "No", "In progress"].map((o) => <label key={o} className="flex items-center gap-2"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                </div>
                <div>
                  <Label>Do you have a car?</Label>
                  <RadioGroup className="flex gap-4 mt-2" value={vehicle.carAvailable} onValueChange={(v) => setVehicle({ ...vehicle, carAvailable: v })}>
                    {["Yes", "No"].map((o) => <label key={o} className="flex items-center gap-2"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                </div>
                {vehicle.carAvailable === "Yes" && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label>Car model</Label><Input className="mt-1.5" value={vehicle.carModel} onChange={(e) => setVehicle({ ...vehicle, carModel: e.target.value })} /></div>
                    <div><Label>Car year</Label><Input className="mt-1.5" value={vehicle.carYear} onChange={(e) => setVehicle({ ...vehicle, carYear: e.target.value })} /></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 5 && type === "grabfood" && (
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Vehicle information</h2>
              <div className="mt-6 space-y-5">
                <div>
                  <Label>Do you own a motorcycle?</Label>
                  <RadioGroup className="flex gap-4 mt-2" value={vehicle.motor} onValueChange={(v) => setVehicle({ ...vehicle, motor: v })}>
                    {["Yes", "No"].map((o) => <label key={o} className="flex items-center gap-2"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                </div>
                {vehicle.motor === "Yes" && (
                  <div><Label>Motorcycle details (model, cc, year)</Label><Input className="mt-1.5" value={vehicle.motorDetails} onChange={(e) => setVehicle({ ...vehicle, motorDetails: e.target.value })} /></div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6 */}
          {step === 6 && (
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Personal information</h2>
              <p className="text-sm text-charcoal/60 mt-1">We'll contact you using these details.</p>
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Label>Full name</Label><Input className="mt-1.5" value={personal.name} onChange={(e) => setPersonal({ ...personal, name: e.target.value })} /></div>
                <div><Label>IC number</Label><Input className="mt-1.5" value={personal.ic} onChange={(e) => setPersonal({ ...personal, ic: e.target.value })} /></div>
                <div><Label>State</Label><Input className="mt-1.5" value={personal.state} onChange={(e) => setPersonal({ ...personal, state: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" className="mt-1.5" value={personal.email} onChange={(e) => setPersonal({ ...personal, email: e.target.value })} /></div>
                <div><Label>Mobile number</Label><Input className="mt-1.5" value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} /></div>
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button variant="outline" onClick={back} disabled={step === 1}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {step < total ? (
              <Button onClick={next} disabled={!canNext} className="gradient-brand">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
            ) : (
              <Button onClick={submit} className="gradient-brand"><Check className="w-4 h-4 mr-1" /> Submit Registration</Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
export default Register;
