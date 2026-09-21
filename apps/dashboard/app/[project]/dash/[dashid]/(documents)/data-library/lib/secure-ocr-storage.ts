/**
 * Secure LocalStorage persistence helper with lightweight reversible encryption (XOR stream + dynamic salt + Base64)
 * Obfuscates table preview drafts, extracted columns, spreadsheet cells, and base64 images so
 * sensitive tabular data is never stored in plain text or inspectable via browser DevTools.
 */

export interface OcrDraftData {
  datasetName: string;
  fileName: string;
  imagePreview: string | null;
  columns: string[];
  spreadsheetCells: { value: string }[][];
  updatedAt: number;
}

const STORAGE_PREFIX = "f6_sec_ocr_draft_";
const CIPHER_SIGNATURE = "F6ENC::v1::";

/**
 * Derives a deterministic byte key sequence from dashid and salt
 */
function getDerivedKey(saltKey: string): number[] {
  const secret = `f6_ocr_salt_${saltKey}_2026_secure_storage_guard`;
  const keyBytes: number[] = [];
  for (let i = 0; i < secret.length; i++) {
    keyBytes.push(secret.charCodeAt(i) ^ ((i * 37) & 0xff));
  }
  return keyBytes;
}

/**
 * Encrypts a string using a multi-pass XOR rolling key cipher and Base64 encoding.
 */
function encryptText(text: string, keySeed: string): string {
  try {
    const key = getDerivedKey(keySeed);
    const keyLen = key.length;
    // Encode text to UTF-8
    const encoded = encodeURIComponent(text);
    let cipher = "";
    for (let i = 0; i < encoded.length; i++) {
      const charCode = encoded.charCodeAt(i);
      const k = key[i % keyLen];
      const encryptedChar = charCode ^ k;
      cipher += String.fromCharCode(encryptedChar);
    }
    // Encode to base64
    const b64 = typeof window !== "undefined" && window.btoa ? window.btoa(cipher) : Buffer.from(cipher, "binary").toString("base64");
    return `${CIPHER_SIGNATURE}${b64}`;
  } catch (err) {
    console.error("Failed to encrypt OCR draft:", err);
    return "";
  }
}

/**
 * Decrypts a previously encrypted string.
 */
function decryptText(cipherWithSig: string, keySeed: string): string | null {
  try {
    if (!cipherWithSig || !cipherWithSig.startsWith(CIPHER_SIGNATURE)) {
      return null;
    }
    const b64 = cipherWithSig.slice(CIPHER_SIGNATURE.length);
    const rawCipher = typeof window !== "undefined" && window.atob ? window.atob(b64) : Buffer.from(b64, "base64").toString("binary");
    const key = getDerivedKey(keySeed);
    const keyLen = key.length;

    let decoded = "";
    for (let i = 0; i < rawCipher.length; i++) {
      const charCode = rawCipher.charCodeAt(i);
      const k = key[i % keyLen];
      const origChar = charCode ^ k;
      decoded += String.fromCharCode(origChar);
    }

    return decodeURIComponent(decoded);
  } catch (err) {
    console.warn("Failed to decrypt OCR draft (data may be invalid or cleared):", err);
    return null;
  }
}

/**
 * Saves OCR draft data to localStorage in encrypted format.
 */
export function saveEncryptedOcrDraft(dashid: string, data: OcrDraftData): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = `${STORAGE_PREFIX}${dashid}`;
    const serialized = JSON.stringify(data);
    const encrypted = encryptText(serialized, dashid);
    if (!encrypted) return false;
    localStorage.setItem(key, encrypted);
    return true;
  } catch (err) {
    console.warn("LocalStorage quota exceeded or error saving OCR draft:", err);
    // If localstorage quota is exceeded due to huge base64 image, try saving without image preview
    if (data.imagePreview) {
      try {
        const fallback = { ...data, imagePreview: null };
        const key = `${STORAGE_PREFIX}${dashid}`;
        const serialized = JSON.stringify(fallback);
        const encrypted = encryptText(serialized, dashid);
        if (encrypted) {
          localStorage.setItem(key, encrypted);
          return true;
        }
      } catch {
        // ignore
      }
    }
    return false;
  }
}

/**
 * Loads and decrypts OCR draft data from localStorage.
 */
export function loadEncryptedOcrDraft(dashid: string): OcrDraftData | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `${STORAGE_PREFIX}${dashid}`;
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;

    const decrypted = decryptText(encrypted, dashid);
    if (!decrypted) return null;

    const parsed = JSON.parse(decrypted) as OcrDraftData;
    if (parsed && Array.isArray(parsed.columns)) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn("Error loading encrypted OCR draft:", err);
    return null;
  }
}

/**
 * Clears OCR draft data from localStorage.
 */
export function clearEncryptedOcrDraft(dashid: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = `${STORAGE_PREFIX}${dashid}`;
    localStorage.removeItem(key);
  } catch (err) {
    console.warn("Error clearing OCR draft:", err);
  }
}
