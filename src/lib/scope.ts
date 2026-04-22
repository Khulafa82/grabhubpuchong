export const SERVICE_SCOPE_OPTIONS = [
  { value: "grabcar", label: "GrabCar" },
  { value: "grabfood", label: "GrabFood" },
  { value: "both", label: "Both" },
] as const;

export const LOCATION_SCOPE_OPTIONS = [
  { value: "klang_valley", label: "Klang Valley" },
  { value: "outside_klang_valley", label: "Outside Klang Valley" },
  { value: "sabah_sarawak", label: "Sabah & Sarawak" },
  { value: "klang_and_outside", label: "Klang + Outside" },
  { value: "klang_and_sabah", label: "Klang + Sabah" },
  { value: "outside_and_sabah", label: "Outside + Sabah" },
  { value: "all", label: "All" },
] as const;

export const ACCOUNT_SCOPE_OPTIONS = [
  { value: "new", label: "New" },
  { value: "reactivation", label: "Reactivation" },
  { value: "both", label: "Both" },
] as const;

export const CHANNEL_SCOPE_OPTIONS = [
  { value: "walk_in", label: "Walk-in" },
  { value: "online", label: "Online" },
  { value: "both", label: "Both" },
] as const;

const toMap = (arr: ReadonlyArray<{ value: string; label: string }>) =>
  Object.fromEntries(arr.map((o) => [o.value, o.label]));

export const SERVICE_SCOPE_LABEL = toMap(SERVICE_SCOPE_OPTIONS);
export const LOCATION_SCOPE_LABEL = toMap(LOCATION_SCOPE_OPTIONS);
export const ACCOUNT_SCOPE_LABEL = toMap(ACCOUNT_SCOPE_OPTIONS);
export const CHANNEL_SCOPE_LABEL = toMap(CHANNEL_SCOPE_OPTIONS);

export interface StaffScope {
  assigned_service_scope: string | null;
  assigned_location_scope: string | null;
  assigned_application_scope: string | null;
  assigned_channel_scope: string | null;
}

export const scopeLabel = (
  kind: "service" | "location" | "account" | "channel",
  v?: string | null,
): string => {
  if (!v) return "—";
  const m =
    kind === "service"
      ? SERVICE_SCOPE_LABEL
      : kind === "location"
      ? LOCATION_SCOPE_LABEL
      : kind === "account"
      ? ACCOUNT_SCOPE_LABEL
      : CHANNEL_SCOPE_LABEL;
  return m[v] ?? v;
};