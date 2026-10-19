export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateID(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return dateString;
  }
}

// ponytail: Normalize Indonesian WhatsApp phone numbers to international standard without '+' for wa.me links
export function normalizeWhatsAppNumber(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("0")) {
    return `62${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith("620")) {
    return `62${cleaned.slice(3)}`;
  }
  return cleaned;
}

export function formatWhatsAppUrl(phone?: string | null): string {
  const normalized = normalizeWhatsAppNumber(phone);
  return normalized ? `https://wa.me/${normalized}` : "";
}

