import { supabase } from "@/lib/supabase";

export const HOMEPAGE_EDITOR_ROLES = ["boss", "it_tech", "it_technician", "super_admin"] as const;

export const canEditHomepage = (role?: string | null) =>
  !!role && (HOMEPAGE_EDITOR_ROLES as readonly string[]).includes(role);

export interface HeroContent {
  badge: string;
  headline_lead: string;
  headline_accent: string;
  subtitle: string;
  bullets: string[];
  primary_cta_text: string;
  primary_cta_href: string;
  secondary_cta_text: string;
  secondary_cta_href: string;
  card_title: string;
  card_subtitle: string;
  card_image_url: string | null;
}

export interface AboutContent {
  eyebrow: string;
  title: string;
  body: string;
  cta_text: string;
  cta_href: string;
  image_url: string | null;
}

export interface CtaContent {
  title: string;
  subtitle: string;
  button_text: string;
  button_href: string;
}

export interface HomepageContent {
  hero: HeroContent;
  about: AboutContent;
  cta: CtaContent;
}

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  hero: {
    badge: "Now serving Klang Valley & beyond",
    headline_lead: "Start Your Grab Journey",
    headline_accent: "with Confidence",
    subtitle:
      "We help customers register, reactivate, and prepare GrabCar or GrabFood applications clearly and smoothly.",
    bullets: [
      "Step-by-step guidance",
      "Fast registration support",
      "Reactivation assistance",
      "Friendly team support",
    ],
    primary_cta_text: "Register Now",
    primary_cta_href: "/register",
    secondary_cta_text: "View Guide",
    secondary_cta_href: "/guide",
    card_title: "Grab Hub Puchong",
    card_subtitle: "Your dedicated registration & activation partner.",
    card_image_url: null,
  },
  about: {
    eyebrow: "About Us",
    title: "A dedicated hub for every applicant",
    body:
      "Grab Hub Puchong helps individuals start, reactivate, and prepare their GrabCar or GrabFood applications. We combine clarity, speed, and human support — so you never feel lost in the process.",
    cta_text: "Learn more about us",
    cta_href: "/about",
    image_url: null,
  },
  cta: {
    title: "Ready to Start Your Grab Journey?",
    subtitle: "Join applicants who successfully registered with our help.",
    button_text: "Register Now",
    button_href: "/register",
  },
};

export type SectionKey = keyof HomepageContent;

interface DbRow {
  section_key: string;
  content: Record<string, unknown>;
}

export const fetchHomepageContent = async (): Promise<HomepageContent> => {
  const { data, error } = await supabase
    .from("homepage_content")
    .select("section_key, content");
  if (error) {
    console.warn("[homepage] fetch failed, using defaults:", error.message);
    return DEFAULT_HOMEPAGE_CONTENT;
  }
  const rows = (data ?? []) as DbRow[];
  const merged: HomepageContent = JSON.parse(JSON.stringify(DEFAULT_HOMEPAGE_CONTENT));
  for (const row of rows) {
    if (row.section_key in merged) {
      // shallow-merge per section
      (merged as Record<string, unknown>)[row.section_key] = {
        ...(merged as Record<string, Record<string, unknown>>)[row.section_key],
        ...(row.content ?? {}),
      };
    }
  }
  return merged;
};

export const upsertHomepageSection = async <K extends SectionKey>(
  key: K,
  content: HomepageContent[K],
  updatedBy: string,
) => {
  const { error } = await supabase
    .from("homepage_content")
    .upsert(
      { section_key: key, content: content as unknown as Record<string, unknown>, updated_by: updatedBy },
      { onConflict: "section_key" },
    );
  if (error) throw error;
};

export const logHomepageEdit = async (params: {
  section: SectionKey;
  performedBy: string;
  performedByRole: string;
  oldValue: unknown;
  newValue: unknown;
}) => {
  const { section, performedBy, performedByRole, oldValue, newValue } = params;
  await supabase.from("activity_logs").insert({
    module: "homepage",
    action: "update_homepage_content",
    description: `Updated homepage section: ${section}`,
    performed_by: performedBy,
    performed_by_role: performedByRole,
    metadata: { section, old_value: oldValue, new_value: newValue },
  });
};

export const uploadHomepageImage = async (file: File): Promise<string> => {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("homepage-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("homepage-images").getPublicUrl(path);
  return data.publicUrl;
};