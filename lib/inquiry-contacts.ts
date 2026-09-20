export type InquiryContacts = {
  name: string;
  phone: string;
  company: string;
};

const KEY = "zp-inquiry-contacts";

export function readInquiryContacts(): InquiryContacts | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as InquiryContacts) : null;
  } catch {
    return null;
  }
}

export function writeInquiryContacts(contacts: InquiryContacts) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(contacts));
}
