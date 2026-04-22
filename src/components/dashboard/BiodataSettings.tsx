import { useEffect, useRef, useState } from "react";
import { Loader2, Save, Upload, ShieldCheck, User as UserIcon, KeyRound, Calendar as CalIcon, MapPin, BadgeCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface FullProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  phone_number: string | null;
  role: string | null;
  status: string | null;
  availability_status: string | null;
  profile_photo_url: string | null;
  avatar_color: string | null;
  employment_status: string | null;
  branch_hub: string | null;
  joined_date: string | null;
  emergency_contact: string | null;
  notification_preferences: any | null;
  theme_preference: string | null;
  language_preference: string | null;
  email_verified: boolean | null;
  first_login_completed: boolean | null;
  profile_completed: boolean | null;
  account_locked: boolean | null;
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const SELECT_COLS =
  "id, full_name, username, email, phone_number, role, status, availability_status, profile_photo_url, avatar_color, employment_status, branch_hub, joined_date, emergency_contact, notification_preferences, theme_preference, language_preference, email_verified, first_login_completed, profile_completed, account_locked, last_login_at, created_at, updated_at";

const initialsOf = (name: string | null | undefined) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "U";

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "—");
const fmtDT = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");

interface Props {
  roleLabel: string;
}

export const BiodataSettings = ({ roleLabel }: Props) => {
  const { user, refreshProfile } = useAuth();
  const [data, setData] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // editable form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emergency, setEmergency] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("staff_profiles")
        .select(SELECT_COLS)
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setError(error.message);
      } else if (data) {
        const p = data as unknown as FullProfile;
        setData(p);
        setFullName(p.full_name ?? "");
        setEmail(p.email ?? "");
        setPhone(p.phone_number ?? "");
        setEmergency(p.emergency_contact ?? "");
        setPhotoUrl(p.profile_photo_url ?? "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const profileDirty =
    !!data &&
    (fullName !== (data.full_name ?? "") ||
      email !== (data.email ?? "") ||
      phone !== (data.phone_number ?? "") ||
      emergency !== (data.emergency_contact ?? "") ||
      photoUrl !== (data.profile_photo_url ?? ""));

  const saveProfile = async () => {
    if (!data) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      full_name: fullName.trim() || null,
      email: email.trim() || null,
      phone_number: phone.trim() || null,
      emergency_contact: emergency.trim() || null,
      profile_photo_url: photoUrl.trim() || null,
    };
    const { data: updated, error } = await supabase
      .from("staff_profiles")
      .update(payload)
      .eq("id", data.id)
      .select(SELECT_COLS)
      .maybeSingle();
    setSaving(false);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      return;
    }
    if (!updated) {
      toast.error("Save blocked. You may not have permission to edit this profile.");
      return;
    }
    setData(updated as unknown as FullProfile);
    toast.success("Profile updated");
    await refreshProfile();
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast.error(
        `Upload failed: ${upErr.message}. Tip: ensure an "avatars" storage bucket exists, or paste an image URL below.`,
      );
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    setPhotoUrl(url);
    // persist immediately
    const { data: updated, error: dbErr } = await supabase
      .from("staff_profiles")
      .update({ profile_photo_url: url })
      .eq("id", user.id)
      .select(SELECT_COLS)
      .maybeSingle();
    setUploading(false);
    if (dbErr || !updated) {
      toast.error(dbErr?.message ?? "Could not save photo URL");
      return;
    }
    setData(updated as unknown as FullProfile);
    toast.success("Profile photo updated");
    await refreshProfile();
  };

  const changePassword = async () => {
    if (!data?.email) {
      toast.error("No email on profile — cannot verify current password.");
      return;
    }
    if (!currentPw || !newPw || !confirmPw) {
      toast.error("Fill all password fields");
      return;
    }
    if (newPw.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("New passwords do not match");
      return;
    }
    setPwBusy(true);
    // Re-authenticate by signing in with current credentials.
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: currentPw,
    });
    if (signErr) {
      setPwBusy(false);
      toast.error("Current password is incorrect");
      return;
    }
    const { error: upErr } = await supabase.auth.updateUser({ password: newPw });
    setPwBusy(false);
    if (upErr) {
      toast.error(`Password update failed: ${upErr.message}`);
      return;
    }
    toast.success("Password changed successfully");
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Biodata & Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your profile, preferences and security.</p>
        </div>
        <Card className="p-10 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading profile…
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Biodata & Settings</h1>
        </div>
        <Card className="p-6 border-destructive/40 bg-destructive/5 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{error ?? "No profile found for the current account."}</div>
        </Card>
      </div>
    );
  }

  const avatarStyle = data.avatar_color ? { backgroundColor: data.avatar_color } : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Biodata & Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, preferences and security.</p>
      </div>

      {/* Profile Header Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          <div className="relative">
            <Avatar className="w-20 h-20">
              {photoUrl ? <AvatarImage src={photoUrl} alt={fullName || "Profile"} /> : null}
              <AvatarFallback
                className="text-lg font-semibold text-brand-foreground"
                style={avatarStyle ?? { background: "hsl(var(--brand))" }}
              >
                {initialsOf(fullName || data.full_name)}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-charcoal text-charcoal-foreground flex items-center justify-center shadow-sm disabled:opacity-50"
              aria-label="Upload photo"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-charcoal truncate">{data.full_name ?? "Unnamed"}</h2>
              {data.email_verified && (
                <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20 gap-1">
                  <BadgeCheck className="w-3 h-3" /> Verified
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-0.5 truncate">{data.email ?? "—"}</div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20">{roleLabel}</Badge>
              <Badge
                variant="outline"
                className={
                  data.status === "active"
                    ? "bg-brand/10 text-brand border-brand/20"
                    : "bg-muted text-muted-foreground border-border"
                }
              >
                {data.status ?? "—"}
              </Badge>
              {data.availability_status && (
                <Badge variant="outline" className="bg-charcoal/10 text-charcoal border-charcoal/20">
                  {data.availability_status}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2"><UserIcon className="w-4 h-4" /> Profile</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><ShieldCheck className="w-4 h-4" /> Security</TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile" className="space-y-6 m-0">
          {/* Personal Biodata (read-only-ish) */}
          <Card className="p-6">
            <h3 className="font-semibold text-charcoal mb-4">Personal biodata</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <Field label="Username" icon={UserIcon}>{data.username ?? "—"}</Field>
              <Field label="Role" icon={ShieldCheck}>{data.role ?? "—"}</Field>
              <Field label="Employment status" icon={BadgeCheck}>{data.employment_status ?? "—"}</Field>
              <Field label="Branch / Hub" icon={MapPin}>{data.branch_hub ?? "—"}</Field>
              <Field label="Joined date" icon={CalIcon}>{fmtDate(data.joined_date)}</Field>
              <Field label="Last login" icon={CalIcon}>{fmtDT(data.last_login_at)}</Field>
              <Field label="Profile completed" icon={BadgeCheck}>{data.profile_completed ? "Yes" : "No"}</Field>
              <Field label="First login completed" icon={BadgeCheck}>{data.first_login_completed ? "Yes" : "No"}</Field>
            </div>
          </Card>

          {/* Editable */}
          <Card className="p-6 space-y-5">
            <h3 className="font-semibold text-charcoal">Edit your details</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emergency">Emergency contact</Label>
                <Input id="emergency" value={emergency} onChange={(e) => setEmergency(e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="photo_url">Profile photo URL</Label>
                <Input
                  id="photo_url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://… (or use the upload button on your avatar)"
                />
                <p className="text-xs text-muted-foreground">
                  Upload via the camera button on your avatar, or paste a direct image URL.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveProfile} disabled={!profileDirty || saving} className="gradient-brand">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save changes
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-6 m-0">
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-brand" />
              <h3 className="font-semibold text-charcoal">Change password</h3>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              You must enter your current password before setting a new one.
            </p>
            <div className="grid gap-4 max-w-md">
              <div className="space-y-1.5">
                <Label htmlFor="cur_pw">Current password</Label>
                <Input
                  id="cur_pw"
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new_pw">New password</Label>
                <Input
                  id="new_pw"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conf_pw">Confirm new password</Label>
                <Input
                  id="conf_pw"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Button onClick={changePassword} disabled={pwBusy} className="gradient-brand">
                  {pwBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                  Update password
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-charcoal mb-4">Account flags</h3>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <Field label="Account locked">{data.account_locked ? "Yes" : "No"}</Field>
              <Field label="Email verified">{data.email_verified ? "Yes" : "No"}</Field>
              <Field label="Profile completed">{data.profile_completed ? "Yes" : "No"}</Field>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Field = ({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
      {Icon ? <Icon className="w-3 h-3" /> : null}
      {label}
    </div>
    <div className="text-sm text-charcoal break-words">{children}</div>
  </div>
);

const ToggleRow = ({
  icon: Icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-md bg-brand/10 text-brand flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-sm font-medium text-charcoal">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default BiodataSettings;
