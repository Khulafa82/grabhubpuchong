/**
 * Strict customer field validation shared across registration,
 * walk-in, customer edit, and admin manual creation flows.
 */

import {
  isValidMalaysiaPhone,
  normalizeMalaysiaPhone,
  sanitizeMalaysiaPhoneInput,
  MALAYSIA_PHONE_PLACEHOLDER,
  MALAYSIA_PHONE_HELPER_EN,
  MALAYSIA_PHONE_HELPER_BM,
  MALAYSIA_PHONE_ERROR_EN,
  MALAYSIA_PHONE_ERROR_BM,
} from "@/lib/phone";

export {
  isValidMalaysiaPhone,
  normalizeMalaysiaPhone,
  sanitizeMalaysiaPhoneInput,
  MALAYSIA_PHONE_PLACEHOLDER,
  MALAYSIA_PHONE_HELPER_EN,
  MALAYSIA_PHONE_HELPER_BM,
  MALAYSIA_PHONE_ERROR_EN,
  MALAYSIA_PHONE_ERROR_BM,
};

/* ---------------- Full name ---------------- */

export const FULL_NAME_REGEX = /^[A-Z@'./\-\s]{3,100}$/;

export const FULL_NAME_ERROR_EN =
  "Please enter your full name as per IC using uppercase letters only.";
export const FULL_NAME_ERROR_BM =
  "Sila masukkan nama penuh seperti IC menggunakan huruf besar sahaja.";

/** Uppercase, strip disallowed chars, cap at 100. */
export const normalizeName = (name: string): string => {
  return (name ?? "")
    .toUpperCase()
    .replace(/[^A-Z@'./\-\s]/g, "")
    .slice(0, 100);
};

export const isValidFullName = (name: string): boolean => {
  const cleaned = normalizeName(name).trim();
  return FULL_NAME_REGEX.test(cleaned);
};

/* ---------------- IC number ---------------- */

export const IC_ERROR_EN =
  "Please enter a valid 12-digit Malaysian IC number without dash.";
export const IC_ERROR_BM =
  "Sila masukkan nombor IC Malaysia yang sah, 12 digit tanpa dash.";

/** Digits only, capped at 12. */
export const normalizeIC = (ic: string): string => {
  return (ic ?? "").replace(/\D/g, "").slice(0, 12);
};

export const isValidMalaysiaIC = (ic: string): boolean => {
  const cleaned = normalizeIC(ic);
  if (!/^\d{12}$/.test(cleaned)) return false;
  const month = Number(cleaned.substring(2, 4));
  const day = Number(cleaned.substring(4, 6));
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  return true;
};

/* ---------------- Gmail ---------------- */

export const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

export const GMAIL_ERROR_EN =
  "Please enter a valid Gmail address ending with @gmail.com.";
export const GMAIL_ERROR_BM =
  "Sila masukkan alamat Gmail yang sah dan berakhir dengan @gmail.com.";

export const normalizeEmail = (email: string): string => {
  return (email ?? "").trim().toLowerCase().replace(/\s+/g, "");
};

export const isValidGmail = (email: string): boolean => {
  return GMAIL_REGEX.test(normalizeEmail(email));
};