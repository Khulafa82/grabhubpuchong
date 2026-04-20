import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  role: string | null;
  status: string | null;
}

const Settings = () => {
  const { user, refreshProfile } = useAuth();
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("id, full_name, email, phone_number, role, status")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        setError(error.message);
      } else if (data) {
        const p = data as Profile;
        setData(p);
        setEmail(p.email ?? "");
        setPhone(p.phone_number ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase
      .from("staff_profiles")
      .update({ email, phone_number: phone })
      .eq("id", data.id);
    if (error) {
      toast.error(`Update failed: ${error.message}`);
    } else {
      toast.success("Profile updated");
      setData({ ...data, email, phone_number: phone });
      await refreshProfile();
    }
    setSaving(false);
  };

  const dirty = data && (email !== (data.email ?? "") || phone !== (data.phone_number ?? ""));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Biodata & Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your contact information.</p>
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading profile…</div>
        ) : error ? (
          <div className="text-sm text-destructive">Failed to load: {error}</div>
        ) : !data ? (
          <div className="text-sm text-muted-foreground">No profile found for the current account.</div>
        ) : (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={data.full_name ?? ""} disabled />
                <p className="text-xs text-muted-foreground">Contact IT to change.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <div className="flex h-10 items-center"><Badge variant="outline" className="bg-brand/10 text-brand border-brand/20">{data.role ?? "—"}</Badge></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Account status</Label>
              <div className="flex h-10 items-center">
                <Badge variant="outline" className={data.status === "active" ? "bg-brand/10 text-brand border-brand/20" : "bg-muted text-muted-foreground border-border"}>
                  {data.status ?? "—"}
                </Badge>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={save} disabled={!dirty || saving} className="gradient-brand">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save changes
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Settings;
