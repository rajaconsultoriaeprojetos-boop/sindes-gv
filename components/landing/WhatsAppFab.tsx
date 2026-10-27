"use client";

import { MessageCircle } from "lucide-react";
import { SINDES_WHATSAPP_URL } from "@/lib/whatsapp-sindes";

export default function WhatsAppFab() {
  return (
    <a
      href={SINDES_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-fab fixed z-[55] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_28px_rgba(37,211,102,0.45)] transition hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E3A43] max-sm:bottom-[max(1rem,env(safe-area-inset-bottom))] max-sm:right-[max(1rem,env(safe-area-inset-right))] sm:bottom-6 sm:right-6"
      aria-label="Falar no WhatsApp do SINDES"
    >
      <MessageCircle className="h-7 w-7" aria-hidden="true" strokeWidth={2} />
    </a>
  );
}
