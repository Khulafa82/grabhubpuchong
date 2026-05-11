/**
 * Malaysian mobile phone number validation utilities.
 * Format: 60 + prefix (10/11/12/13/14/16/17/18/19) + 7-8 digits.
 */

export const MALAYSIA_PHONE_REGEX =
  /^60(10|11|12|13|14|16|17|18|19)[0-9]{7,8}$/;

export const MALAYSIA_PHONE_PLACEHOLDER = "6010447856";

export const MALAYSIA_PHONE_HELPER_EN =
  "Enter a valid Malaysian mobile number starting with 60";

export const MALAYSIA_PHONE_HELPER_BM =
  "Masukkan nombor telefon Malaysia yang sah bermula dengan 60";

export const MALAYSIA_PHONE_ERROR_EN =
  "Please enter a valid Malaysian mobile number";

export const MALAYSIA_PHONE_ERROR_BM =
  "Sila masukkan nombor telefon Malaysia yang sah";

/** Strip every non-digit (spaces, dashes, brackets, plus, letters). */
export const normalizeMalaysiaPhone = (phone: string): string => {
  return (phone ?? "").replace(/\D/g, "");
};

/** Returns true only for a valid Malaysian mobile number. */
export const isValidMalaysiaPhone = (phone: string): boolean => {
  const normalized = normalizeMalaysiaPhone(phone);
  return MALAYSIA_PHONE_REGEX.test(normalized);
};

/** Cap typed input at 13 digits to prevent overly long numbers. */
export const sanitizeMalaysiaPhoneInput = (raw: string): string => {
  return normalizeMalaysiaPhone(raw).slice(0, 13);
};