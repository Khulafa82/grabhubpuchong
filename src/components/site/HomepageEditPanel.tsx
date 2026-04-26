import { useEffect, useState } from "react";
import { Eye, Loader2, Save, X, Upload } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  HomepageContent,
  SectionKey,
  upsertHomepageSection,
  logHomepageEdit,
  uploadHomepageImage,
} from "@/lib/homepageContent";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: HomepageContent;
  onSaved: (next: HomepageContent) => void;
}

export const HomepageEditPanel = ({ open, onOpenChange, initial, onSaved }: Props) => {
  const { profile } = useAuth();
  const [draft, setDraft] = useState<HomepageContent>(initial);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setPreviewing(false);
    }
  }, [open, initial]);

  const updateHero = (patch: Partial<HomepageContent["hero"]>) =>
    setDraft((d) => ({ ...d, hero: { ...d.hero, ...patch } }));
  const updateAbout = (patch: Partial<HomepageContent["about"]>) =>
    setDraft((d) => ({ ...d, about: { ...d.about, ...patch } }));
  const updateCta = (patch: Partial<HomepageContent["cta"]>) =>
    setDraft((d) => ({ ...d, cta: { ...d.cta, ...patch } }));

  const handleImageUpload = async (
    file: File | null,
    section: "hero" | "about",
  ) => {
    if (!file) return;
    setUploading(section);
    try {
      const url = await uploadHomepageImage(file);
      if (section === "hero") updateHero({ card_image_url: url });
      else updateAbout({ image_url: url });
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleCancel = () => {
    setDraft(initial);
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const sections: SectionKey[] = ["hero", "about", "cta"];
      const changed: SectionKey[] = sections.filter(
        (k) => JSON.stringify(initial[k]) !== JSON.stringify(draft[k]),
      );
      if (!changed.length) {
        toast.info("No changes to save");
        setSaving(false);
        return;
      }
      for (const key of changed) {
        await upsertHomepageSection(key, draft[key], profile.id);
        await logHomepageEdit({
          section: key,
          performedBy: profile.id,
          performedByRole: profile.role,
          oldValue: initial[key],
          newValue: draft[key],
        });
      }
      toast.success("Homepage updated");
      onSaved(draft);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>Edit Homepage</SheetTitle>
          <SheetDescription>
            Changes save to the live homepage and are logged in the audit trail.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {previewing ? (
            <Card className="p-6 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-brand font-semibold">Hero</div>
                <h2 className="text-2xl font-bold mt-1">
                  {draft.hero.headline_lead}{" "}
                  <span className="text-brand">{draft.hero.headline_accent}</span>
                </h2>
                <p className="text-sm text-charcoal/65 mt-2">{draft.hero.subtitle}</p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-brand font-semibold">About</div>
                <h3 className="text-lg font-bold mt-1">{draft.about.title}</h3>
                <p className="text-sm text-charcoal/65 mt-1">{draft.about.body}</p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-brand font-semibold">CTA</div>
                <h3 className="text-lg font-bold mt-1">{draft.cta.title}</h3>
                <p className="text-sm text-charcoal/65 mt-1">{draft.cta.subtitle}</p>
              </div>
            </Card>
          ) : (
            <Tabs defaultValue="hero" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="hero">Hero</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="cta">CTA</TabsTrigger>
              </TabsList>

              <TabsContent value="hero" className="space-y-4 mt-4">
                <Field label="Badge text">
                  <Input value={draft.hero.badge} onChange={(e) => updateHero({ badge: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Headline lead">
                    <Input value={draft.hero.headline_lead} onChange={(e) => updateHero({ headline_lead: e.target.value })} />
                  </Field>
                  <Field label="Headline accent">
                    <Input value={draft.hero.headline_accent} onChange={(e) => updateHero({ headline_accent: e.target.value })} />
                  </Field>
                </div>
                <Field label="Subtitle">
                  <Textarea rows={3} value={draft.hero.subtitle} onChange={(e) => updateHero({ subtitle: e.target.value })} />
                </Field>
                <Field label="Bullet points (one per line)">
                  <Textarea
                    rows={4}
                    value={draft.hero.bullets.join("\n")}
                    onChange={(e) =>
                      updateHero({
                        bullets: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Primary button text">
                    <Input value={draft.hero.primary_cta_text} onChange={(e) => updateHero({ primary_cta_text: e.target.value })} />
                  </Field>
                  <Field label="Primary button link">
                    <Input value={draft.hero.primary_cta_href} onChange={(e) => updateHero({ primary_cta_href: e.target.value })} />
                  </Field>
                  <Field label="Secondary button text">
                    <Input value={draft.hero.secondary_cta_text} onChange={(e) => updateHero({ secondary_cta_text: e.target.value })} />
                  </Field>
                  <Field label="Secondary button link">
                    <Input value={draft.hero.secondary_cta_href} onChange={(e) => updateHero({ secondary_cta_href: e.target.value })} />
                  </Field>
                </div>
                <Field label="Card title">
                  <Input value={draft.hero.card_title} onChange={(e) => updateHero({ card_title: e.target.value })} />
                </Field>
                <Field label="Card subtitle">
                  <Input value={draft.hero.card_subtitle} onChange={(e) => updateHero({ card_subtitle: e.target.value })} />
                </Field>
                <Field label="Hero card image">
                  <ImagePicker
                    url={draft.hero.card_image_url}
                    uploading={uploading === "hero"}
                    onUpload={(f) => handleImageUpload(f, "hero")}
                    onClear={() => updateHero({ card_image_url: null })}
                  />
                </Field>
              </TabsContent>

              <TabsContent value="about" className="space-y-4 mt-4">
                <Field label="Eyebrow">
                  <Input value={draft.about.eyebrow} onChange={(e) => updateAbout({ eyebrow: e.target.value })} />
                </Field>
                <Field label="Title">
                  <Input value={draft.about.title} onChange={(e) => updateAbout({ title: e.target.value })} />
                </Field>
                <Field label="Body">
                  <Textarea rows={5} value={draft.about.body} onChange={(e) => updateAbout({ body: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Button text">
                    <Input value={draft.about.cta_text} onChange={(e) => updateAbout({ cta_text: e.target.value })} />
                  </Field>
                  <Field label="Button link">
                    <Input value={draft.about.cta_href} onChange={(e) => updateAbout({ cta_href: e.target.value })} />
                  </Field>
                </div>
                <Field label="About image (optional)">
                  <ImagePicker
                    url={draft.about.image_url}
                    uploading={uploading === "about"}
                    onUpload={(f) => handleImageUpload(f, "about")}
                    onClear={() => updateAbout({ image_url: null })}
                  />
                </Field>
              </TabsContent>

              <TabsContent value="cta" className="space-y-4 mt-4">
                <Field label="Title">
                  <Input value={draft.cta.title} onChange={(e) => updateCta({ title: e.target.value })} />
                </Field>
                <Field label="Subtitle">
                  <Textarea rows={3} value={draft.cta.subtitle} onChange={(e) => updateCta({ subtitle: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Button text">
                    <Input value={draft.cta.button_text} onChange={(e) => updateCta({ button_text: e.target.value })} />
                  </Field>
                  <Field label="Button link">
                    <Input value={draft.cta.button_href} onChange={(e) => updateCta({ button_href: e.target.value })} />
                  </Field>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-between gap-2 bg-background">
          <Button variant="ghost" size="sm" onClick={() => setPreviewing((p) => !p)}>
            <Eye className="w-4 h-4 mr-1" /> {previewing ? "Back to Edit" : "Preview"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" className="gradient-brand" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save Changes
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold text-charcoal/70">{label}</Label>
    {children}
  </div>
);

const ImagePicker = ({
  url,
  uploading,
  onUpload,
  onClear,
}: {
  url: string | null;
  uploading: boolean;
  onUpload: (file: File | null) => void;
  onClear: () => void;
}) => (
  <div className="flex items-center gap-3">
    {url ? (
      <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
    ) : (
      <div className="w-16 h-16 rounded-lg bg-muted border border-border flex items-center justify-center text-xs text-muted-foreground">
        None
      </div>
    )}
    <div className="flex flex-col gap-1.5">
      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background hover:bg-accent text-xs font-medium cursor-pointer">
        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
        {uploading ? "Uploading…" : url ? "Replace" : "Upload"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
        />
      </label>
      {url && (
        <button type="button" className="text-xs text-destructive hover:underline" onClick={onClear}>
          Remove
        </button>
      )}
    </div>
  </div>
);