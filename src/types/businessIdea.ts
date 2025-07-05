// src/types/businessIdea.ts

// This interface should match your 'business_ideas' table schema in Supabase
export interface BusinessIdea {
  id: string;
  title: string;
  description: string;
  category: string;

  // Core business idea details
  difficulty: 'beginner' | 'intermediate' | 'advanced' | string; // Assuming these specific string values, or just string
  market_size: string; // e.g., "$1B+"
  investment_needed: string; // e.g., "$10k - $50k"
  timeline: string; // e.g., "3-6 months"
  tags?: string[]; // Changed to optional array of strings

  // Media and presentation
  thumbnail_url?: string | null; // Updated from 'thumbnail', made optional as it might be missing
  presentation_url: string | null; // URL to the PDF

  // Engagement and metadata
  views: number;
  likes: number;
  comments: number;
  isLiked?: boolean; // New: Indicates if the current user has liked it
  is_featured: boolean; // Existing: Indicates if it's a featured idea

  // Creator and timestamps
  author_id: string | null; // Supabase user UUID for the original creator
  created_by?: string; // New: Could be a display name or a different identifier for the creator
  created_at: string;
  updated_at?: string; // Make optional if not always present or handled differently

  // New features for a professional platform
  slides?: string[]; // New: URLs or paths to individual presentation slides (if applicable)
  benefits?: string[]; // New: Key benefits of the business idea
  useCases?: string[]; // New: Potential use cases or applications
  icon?: string; // New: URL or name of an icon associated with the idea
  price?: number; // New: Potential price or cost associated with the idea/solution
  currency?: string; // New: Currency for the price
  hasPurchased?: boolean; // New: Indicates if the current user has "purchased" or unlocked this idea

  // Added properties for new links
  youtube_link?: string | null; // URL for a related YouTube video
  full_book_link?: string | null; // URL for a comprehensive guide or book
  affiliate_links?: string | null; // Comma-separated string of affiliate book links
}
