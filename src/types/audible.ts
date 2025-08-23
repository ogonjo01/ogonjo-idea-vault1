// src/types/audible.ts
export interface AudibleBook {
  id: string;
  title: string;
  author: string;
  short_description?: string | null;
  summary_text?: string | null;
  image_url?: string | null;               // optional
  audible_affiliate_link?: string | null;
  category?: string | null;
  views?: number | null;
  created_at?: string | null;
  audio_preview_url?: string | null;
  affiliate_clicks?: number | null;
}
