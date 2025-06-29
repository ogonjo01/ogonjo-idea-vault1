// src/types/businessIdea.ts

export interface BusinessIdea {
  id: string;
  title: string;
  category: string;
  description: string;
  thumbnail_url: string; // <--- ENSURE THIS IS HERE AND CORRECT
  presentation_url: string | null;
  views: number;
  likes: number;
  comments: number;
  created_at: string;
  created_by: string;
  isLiked?: boolean;

  // Optional properties from your previous interface (only include if you need them):
  tags?: string[];
  slides?: string[];
  benefits?: string[];
  useCases?: string[];
  icon?: string;
  price?: number;
  currency?: string;
  hasPurchased?: boolean;
}