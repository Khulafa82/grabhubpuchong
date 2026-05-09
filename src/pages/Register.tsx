import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Car, Bike, MapPin, RefreshCw, UserPlus, ChevronLeft, ChevronRight,
  Check, AlertCircle, Loader2, ShieldCheck, XCircle, Footprints,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/site/Logo";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type UserRole = "GrabCar" | "GrabFood" | "";
type AccountStatus = "new" | "reactivation" | "";
type LocationChoice = "Klang Valley" | "Outside Klang Valley" | "Sabah & Sarawak" | "";

const stepTitles = [
  "Registration Type",
  "Operating Location",
  "Account Status",
  "Eligibility Check",
  "Vehicle Information",
  "Personal Information",
];

const MALAYSIAN_STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang",
  "Perak", "Perlis", "Pulau Pinang", "Sabah", "Sarawak", "Selangor",
  "Terengganu", "Kuala Lumpur", "Labuan", "Putrajaya",
];

const GRABCAR_LICENSES = [
  { v: "Full License D", label: "I have a Full License (D)", ok: true },
  { v: "License P", label: "I only have a P License", ok: false },
  { v: "No License", label: "I don't have a license", ok: false },
  { v: "License L", label: "I only have L License", ok: false },
];

const GRABFOOD_LICENSES = [
  { v: "Full License B2 / B Full", label: "I have a Full License (B2 / B Full)", ok: true },
  { v: "License P", label: "I only have a P License", ok: true },
  { v: "No License", label: "I don't have a license", ok: false },
  { v: "License L", label: "I only have L License", ok: false },
];

interface RegisterProps {
  walkIn?: boolean;
}

const Register = ({ walkIn = false }: RegisterProps = {}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [userRole, setUserRole] = useState<UserRole>("");
  const [locationChoice, setLocationChoice] = useState<LocationChoice>("");
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("");

  const [blueIc, setBlueIc] = useState<"" | "Yes" | "No">("");
  const [licenseType, setLicenseType] = useState("");
  const [criminal, setCriminal] = useState<"" | "clean" | "has_record">("");

  const [psv, setPsv] = useState<"" | "have_psv" | "no_psv">("");
  const [carAvailable, setCarAvailable] = useState<"" | "Yes" | "No">("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");

  const [hasMotor, setHasMotor] = useState<"" | "Yes" | "No">("");
  const [motorDetails, setMotorDetails] = useState("");

  const [fullName, setFullName] = useState("");
  const [icNumber, setIcNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [stateVal, setStateVal] = useState("");

  const total = stepTitles.length;

  const goTo = (n: number) => {
    if (n > maxStepReached) {
      toast({ title: "Please complete previous steps first." });
      return;
    }
    setStep(n);
  };
  const advance = (n: number) => {
    setStep(n);
    setMaxStepReached((m) => Math.max(m, n));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  // eligibility checks
  const licenseOk = (() => {
    if (!licenseType) return false;
    const list = userRole === "GrabCar" ? GRABCAR_LICENSES : GRABFOOD_LICENSES;
    return list.find((l) => l.v === licenseType)?.ok ?? false;
  })();
  const eligibilityPassed = blueIc === "Yes" && licenseOk && criminal === "clean";
  const eligibilityFailed =
    (blueIc === "No") ||
    (criminal === "has_record") ||
    (licenseType !== "" && !licenseOk);

  const canNext = (() => {
    if (step === 1) return userRole !== "";
    if (step === 2) return locationChoice !== "";
    if (step === 3) return accountStatus !== "";
    if (step === 4) return eligibilityPassed;
    if (step === 5) {
      if (userRole === "GrabCar") {
        if (!psv || !carAvailable) return false;
        if (carAvailable === "Yes" && (!carModel.trim() || !carYear.trim())) return false;
        return true;
      }
      return hasMotor === "Yes";
    }
    return true;
  })();

  const validateFinal = (): string | null => {
    if (!fullName.trim()) return "Full name is required.";
    if (!/^\d{12}$/.test(icNumber.trim())) return "IC number must be exactly 12 digits, no dashes.";
    if (!/^[\w.+-]+@gmail\.com$/i.test(email.trim())) return "Email must be a valid Gmail address.";
    if (!/^601\d+$/.test(phone.trim())) return "Mobile number must start with 601.";
    if (!stateVal) return "State is required.";
    return null;
  };

  const submit = async () => {
    const err = validateFinal();
    if (err) {
      toast({ title: "Please check the form", description: err, variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      full_name: fullName.trim().toUpperCase(),
      ic_number: icNumber.trim(),
      email_address: email.trim() || null,
      phone_number: phone.trim(),
      user_role: userRole,
      location_choice: locationChoice,
      state: stateVal,
      account_status: accountStatus,
      blue_ic_status: blueIc === "Yes",
      license_type: licenseType,
      criminal_record_status: criminal,
      walk_in_flag: walkIn,
      priority_status: walkIn ? "walk_in_priority" : "normal",
    };

    if (userRole === "GrabCar") {
      payload.psv_license_status = psv;
      payload.has_car = carAvailable === "Yes";
      payload.car_model = carAvailable === "Yes" ? carModel.trim() || null : null;
      payload.car_year = carAvailable === "Yes" && carYear.trim()
        ? Number(carYear) || carYear.trim()
        : null;
      payload.vehicle_type = "Car";
      payload.vehicle_model = carAvailable === "Yes" ? carModel.trim() || null : null;
    } else {
      payload.has_motorcycle = hasMotor === "Yes";
      payload.motorcycle_details = motorDetails.trim() || null;
      payload.vehicle_type = "Motorcycle";
      payload.vehicle_model = motorDetails.trim() || null;
    }

    const { data, error } = await supabase.functions.invoke("register-customer", {
      body: payload,
    });
    setSubmitting(false);

    if (error || (data && (data as { error?: string }).error)) {
      const msg =
        (data as { message?: string } | null)?.message ||
        "Could not submit your registration. Please try again.";
      toast({ title: "Registration failed", description: msg, variant: "destructive" });
      return;
    }
    navigate(walkIn ? "/registration-success?walk_in=1" : "/registration-success");
  };

  // Step 1 selection auto-advance
  const selectRole = (r: UserRole) => {
    setUserRole(r);
    // reset downstream choices that depend on role
    setLocationChoice("");
    setAccountStatus("");
    setLicenseType("");
    setTimeout(() => advance(2), 150);
  };

  const selectLocation = (loc: LocationChoice) => {
    setLocationChoice(loc);
    setTimeout(() => advance(3), 150);
  };

  const selectAccountStatus = (s: AccountStatus) => {
    setAccountStatus(s);
    setTimeout(() => advance(4), 150);
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
        {walkIn && (
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold border border-brand/20">
              <Footprints className="w-3.5 h-3.5" /> Walk-in Registration
            </span>
            <span className="text-xs text-charcoal/60">In-person submission at Grab Hub Puchong</span>
          </div>
        )}
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-semibold text-charcoal">Step {step} of {total}</span>
            <span className="text-charcoal/60">{stepTitles[step - 1]}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full gradient-brand transition-all duration-500"
              style={{ width: `${(step / total) * 100}%` }}
            />
          </div>
          <div className="hidden md:flex justify-between mt-3 gap-2">
            {stepTitles.map((t, i) => {
              const n = i + 1;
              const isActive = n === step;
              const isCompleted = n < step || (n <= maxStepReached && n !== step);
              const clickable = n <= maxStepReached;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!clickable}
                  onClick={() => goTo(n)}
                  className={`text-[11px] text-left transition-colors ${
                    isActive
                      ? "text-brand font-semibold"
                      : isCompleted
                      ? "text-charcoal/70 hover:text-brand"
                      : "text-charcoal/40 cursor-not-allowed"
                  }`}
                >
                  {n}. {t}
                </button>
              );
            })}
          </div>
        </div>

        <Card className="p-8">
          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Step 1: Choose Registration Type</h2>
              <p className="text-sm text-charcoal/60 mt-1">Select what you want to register for.</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                {[
                  {
                    v: "GrabCar" as const, icon: Car, t: "GrabCar Driver",
                    d: "Earn income by driving passengers using your own or someone else's car.",
                  },
                  {
                    v: "GrabFood" as const, icon: Bike, t: "GrabFood Rider",
                    d: "Earn income by delivering food. Only Klang Valley is supported in this hub.",
                  },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => selectRole(o.v)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                      userRole === o.v
                        ? "border-brand bg-brand/5"
                        : "border-border hover:border-brand/40"
                    }`}
                  >
                    <o.icon className={`w-8 h-8 ${userRole === o.v ? "text-brand" : "text-charcoal/40"}`} />
                    <div className="font-semibold text-charcoal mt-3">{o.t}</div>
                    <div className="text-xs text-charcoal/60 mt-2 leading-relaxed">{o.d}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Step 2: Operating Location</h2>
              <p className="text-sm text-charcoal/60 mt-1">Where will you be operating?</p>
              <div className="mt-6 grid gap-3">
                {([
                  { v: "Klang Valley", helper: "" },
                  {
                    v: "Outside Klang Valley",
                    helper:
                      "Apply at Grab Hub Puchong for Klang Valley only. Complete 30 trips in KL/Selangor first before operating outside Klang Valley.",
                  },
                  {
                    v: "Sabah & Sarawak",
                    helper: "Please Register at hub at Sabah & Sarawak",
                  },
                ] as const).map((o) => {
                  const disabled = userRole === "GrabFood" && o.v !== "Klang Valley";
                  const selected = locationChoice === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && selectLocation(o.v)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        disabled
                          ? "opacity-60 cursor-not-allowed border-border bg-surface-muted/40"
                          : selected
                          ? "border-brand bg-brand/5"
                          : "border-border hover:border-brand/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className={`w-4 h-4 ${selected ? "text-brand" : "text-charcoal/50"}`} />
                        <span className="font-medium text-charcoal">{o.v}</span>
                      </div>
                      {disabled && o.helper && (
                        <div className="text-[12px] text-charcoal/60 mt-2 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                          <span>{o.helper}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Step 3: Account Status</h2>
              <p className="text-sm text-charcoal/60 mt-1">Are you a new applicant or reactivating?</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => selectAccountStatus("new")}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${
                    accountStatus === "new" ? "border-brand bg-brand/5" : "border-border hover:border-brand/40"
                  }`}
                >
                  <UserPlus className={`w-7 h-7 ${accountStatus === "new" ? "text-brand" : "text-charcoal/40"}`} />
                  <div className="font-semibold text-charcoal mt-3">New Account</div>
                  <div className="text-xs text-charcoal/60 mt-1">Brand new application</div>
                </button>

                {userRole === "GrabCar" ? (
                  <button
                    type="button"
                    onClick={() => selectAccountStatus("reactivation")}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                      accountStatus === "reactivation"
                        ? "border-brand bg-brand/5"
                        : "border-border hover:border-brand/40"
                    }`}
                  >
                    <RefreshCw className={`w-7 h-7 ${accountStatus === "reactivation" ? "text-brand" : "text-charcoal/40"}`} />
                    <div className="font-semibold text-charcoal mt-3">Reactivation</div>
                    <div className="text-xs text-charcoal/60 mt-1">Restore existing account</div>
                  </button>
                ) : (
                  <div className="p-6 rounded-2xl border-2 border-border bg-surface-muted/40 opacity-80">
                    <AlertCircle className="w-7 h-7 text-amber-600" />
                    <div className="font-semibold text-charcoal mt-3">Reactivation Not Supported</div>
                    <div className="text-xs text-charcoal/60 mt-1 leading-relaxed">
                      GrabFood reactivation is not supported here. Please use the Grab Driver app or visit Grab HQ.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Step 4: Eligibility Check</h2>
              <p className="text-sm text-charcoal/60 mt-1">Please answer the following.</p>

              <div className="mt-6 space-y-6">
                <div>
                  <Label>Are you a Malaysian citizen with a Blue IC?</Label>
                  <RadioGroup
                    className="flex gap-4 mt-2"
                    value={blueIc}
                    onValueChange={(v) => setBlueIc(v as "Yes" | "No")}
                  >
                    {["Yes", "No"].map((o) => (
                      <label key={o} className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value={o} /> {o}
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Label>Driving License</Label>
                  <RadioGroup
                    className="grid gap-2 mt-2"
                    value={licenseType}
                    onValueChange={setLicenseType}
                  >
                    {(userRole === "GrabCar" ? GRABCAR_LICENSES : GRABFOOD_LICENSES).map((o) => (
                      <label
                        key={o.v}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                          licenseType === o.v ? "border-brand bg-brand/5" : "border-border"
                        }`}
                      >
                        <RadioGroupItem value={o.v} /> {o.label}
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Label>Do you have any criminal record or issues?</Label>
                  <RadioGroup
                    className="flex flex-col gap-2 mt-2"
                    value={criminal}
                    onValueChange={(v) => setCriminal(v as "clean" | "has_record")}
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="clean" /> No, I am clean
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="has_record" /> Yes, I have a record
                    </label>
                  </RadioGroup>
                </div>

                {eligibilityFailed && (
                  <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                    <div className="text-sm text-destructive">
                      Sorry, you do not meet the eligibility requirements for Grab registration.
                    </div>
                  </div>
                )}

                {eligibilityPassed && (
                  <div className="p-4 rounded-xl border border-brand/30 bg-brand/5 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-brand mt-0.5 shrink-0" />
                    <div className="text-sm text-charcoal/80">You meet the eligibility requirements. You may continue.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5 — GrabCar */}
          {step === 5 && userRole === "GrabCar" && (
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Step 5: PSV License & Vehicle Information</h2>
              <div className="mt-6 space-y-6">
                <div>
                  <Label>Do you have a PSV (Public Service Vehicle) License?</Label>
                  <RadioGroup
                    className="flex gap-4 mt-2"
                    value={psv}
                    onValueChange={(v) => setPsv(v as "have_psv" | "no_psv")}
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="have_psv" /> Yes
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="no_psv" /> No
                    </label>
                  </RadioGroup>
                </div>

                <div>
                  <Label>Do you have a car available for GrabCar?</Label>
                  <RadioGroup
                    className="flex gap-4 mt-2"
                    value={carAvailable}
                    onValueChange={(v) => setCarAvailable(v as "Yes" | "No")}
                  >
                    {["Yes", "No"].map((o) => (
                      <label key={o} className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value={o} /> {o}
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                {carAvailable === "Yes" && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Car Model</Label>
                      <Input className="mt-1.5" value={carModel} onChange={(e) => setCarModel(e.target.value)} />
                    </div>
                    <div>
                      <Label>Year of Manufacture / Purchase</Label>
                      <Input
                        className="mt-1.5"
                        inputMode="numeric"
                        value={carYear}
                        onChange={(e) => setCarYear(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5 — GrabFood */}
          {step === 5 && userRole === "GrabFood" && (
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Step 5: Vehicle Information</h2>
              <div className="mt-6 space-y-6">
                <div>
                  <Label>Do you have a motorcycle?</Label>
                  <RadioGroup
                    className="flex gap-4 mt-2"
                    value={hasMotor}
                    onValueChange={(v) => setHasMotor(v as "Yes" | "No")}
                  >
                    {["Yes", "No"].map((o) => (
                      <label key={o} className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value={o} /> {o}
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                {hasMotor === "Yes" && (
                  <div>
                    <Label>Motorcycle details (model, cc, year) — optional</Label>
                    <Input className="mt-1.5" value={motorDetails} onChange={(e) => setMotorDetails(e.target.value)} />
                  </div>
                )}

                {hasMotor === "No" && (
                  <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                    <div className="text-sm text-destructive">
                      You need to have a motorcycle to apply as a GrabFood Rider.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6 */}
          {step === 6 && (
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Step 6: Personal Information</h2>
              <p className="text-sm text-charcoal/60 mt-1">We'll contact you using these details.</p>
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Full Name</Label>
                  <Input
                    className="mt-1.5 uppercase"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="AS PER IC"
                  />
                </div>
                <div>
                  <Label>IC Number (12 digits, no dash)</Label>
                  <Input
                    className="mt-1.5"
                    inputMode="numeric"
                    maxLength={12}
                    value={icNumber}
                    onChange={(e) => setIcNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 900101145678"
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Select value={stateVal} onValueChange={setStateVal}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {MALAYSIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Email Address (Gmail only)</Label>
                  <Input
                    type="email"
                    className="mt-1.5"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                  />
                </div>
                <div>
                  <Label>Mobile Number (start with 601)</Label>
                  <Input
                    className="mt-1.5"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 60123456789"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button variant="outline" onClick={back} disabled={step === 1}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {step < total ? (
              <Button
                onClick={() => canNext && advance(step + 1)}
                disabled={!canNext}
                className="gradient-brand"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={submitting} className="gradient-brand">
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Submitting…</>
                ) : (
                  <><Check className="w-4 h-4 mr-1" /> Submit Registration</>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Register;
