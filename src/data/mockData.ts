export interface BusinessIdea {
  id: string;
  title: string;
  category: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  description: string;
  tags: string[];
  slides?: string[];
  isLiked?: boolean;
  createdAt: string;
  benefits?: string[];
  useCases?: string[];
  icon?: string;
  price?: number;
  currency?: string;
  hasPurchased?: boolean;
  presentation_url?: string; // Added for PDF support
}

export interface AffiliateBook {
  category: string;
  title: string;
  url: string;
  author?: string;
}

export const mockIdeas: BusinessIdea[] = [
  {
    id: '1',
    title: '5 Ways AI Can Transform Retail',
    category: 'Retail',
    thumbnail: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=450&fit=crop',
    views: 2345,
    likes: 312,
    comments: 18,
    description: 'Explore how artificial intelligence is revolutionizing the retail industry with practical applications and real-world examples. Implement personalized recommendations, optimize inventory management, and enhance customer experience through AI-powered solutions.',
    tags: ['AI', 'Retail', 'Technology', 'Innovation'],
    createdAt: '2024-12-01',
    benefits: ['Increase sales by 30%', 'Reduce inventory costs', 'Improve customer satisfaction', 'Automate repetitive tasks'],
    useCases: ['Personalized product recommendations', 'Dynamic pricing strategies', 'Inventory optimization', 'Customer service chatbots', 'Fraud detection'],
    icon: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=400&fit=crop',
    price: 200,
    currency: 'RWF',
    hasPurchased: false,
    slides: [
      'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=450&fit=crop',
      'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=450&fit=crop',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=450&fit=crop',
    ],
    presentation_url: 'https://example.com/presentation1.pdf' // Added for PDF support
  },
  {
    id: '2',
    title: 'SaaS Startup Blueprint: From Idea to Launch',
    category: 'SaaS',
    thumbnail: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=450&fit=crop',
    views: 1876,
    likes: 203,
    comments: 12,
    description: 'A comprehensive guide to building and launching a successful SaaS startup from concept to market.',
    tags: ['SaaS', 'Startup', 'Business', 'Launch'],
    createdAt: '2024-11-28',
    presentation_url: 'https://example.com/presentation2.pdf' // Added for PDF support
  },
  {
    id: '3',
    title: 'Digital Marketing Strategies for 2025',
    category: 'Marketing',
    thumbnail: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=450&fit=crop',
    views: 3421,
    likes: 445,
    comments: 31,
    description: 'Stay ahead of the curve with cutting-edge digital marketing strategies that will dominate 2025.',
    tags: ['Marketing', 'Digital', 'Strategy', '2025'],
    createdAt: '2024-11-25',
    presentation_url: 'https://example.com/presentation3.pdf' // Added for PDF support
  },
  {
    id: '4',
    title: 'E-commerce Automation Tools',
    category: 'E-commerce',
    thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=450&fit=crop',
    views: 1654,
    likes: 189,
    comments: 9,
    description: 'Discover the best automation tools to streamline your e-commerce operations and boost profits.',
    tags: ['E-commerce', 'Automation', 'Tools', 'Efficiency'],
    createdAt: '2024-11-22',
    presentation_url: 'https://example.com/presentation4.pdf' // Added for PDF support
  },
  {
    id: '5',
    title: 'Fintech Innovations Reshaping Banking',
    category: 'Fintech',
    thumbnail: 'https://images.unsplash.com/photo-1483058712412-4245e9b90334?w=800&h=450&fit=crop',
    views: 2890,
    likes: 356,
    comments: 23,
    description: 'Explore the latest fintech innovations that are transforming traditional banking and financial services.',
    tags: ['Fintech', 'Banking', 'Innovation', 'Finance'],
    createdAt: '2024-11-20',
    presentation_url: 'https://example.com/presentation5.pdf' // Added for PDF support
  },
  {
    id: '6',
    title: 'Sustainable Business Models',
    category: 'Sustainability',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=450&fit=crop',
    views: 1432,
    likes: 167,
    comments: 14,
    description: 'Learn how to build profitable business models that prioritize environmental sustainability.',
    tags: ['Sustainability', 'Business', 'Environment', 'Green'],
    createdAt: '2024-11-18',
    presentation_url: 'https://example.com/presentation6.pdf' // Added for PDF support
  },
];

export const affiliateBooks: AffiliateBook[] = [
  {
    category: "Entrepreneurship",
    title: "The Lean Startup",
    url: "https://amazon.com/lean-startup",
    author: "Eric Ries"
  },
  {
    category: "Entrepreneurship", 
    title: "Zero to One",
    url: "https://amazon.com/zero-to-one",
    author: "Peter Thiel"
  },
  {
    category: "Marketing",
    title: "Building a StoryBrand",
    url: "https://amazon.com/building-storybrand",
    author: "Donald Miller"
  },
  {
    category: "Marketing",
    title: "Purple Cow",
    url: "https://amazon.com/purple-cow",
    author: "Seth Godin"
  },
  {
    category: "Productivity",
    title: "Deep Work",
    url: "https://amazon.com/deep-work",
    author: "Cal Newport"
  },
  {
    category: "Productivity",
    title: "Atomic Habits",
    url: "https://amazon.com/atomic-habits",
    author: "James Clear"
  }
];

export const categories = [
  'All',
  'AI',
  'Retail',
  'SaaS',
  'Marketing',
  'E-commerce',
  'Fintech',
  'Sustainability',
  'Healthcare',
  'Education'
];

export const featuredBenefits = [
  {
    icon: '📈',
    title: 'Expert-curated',
    description: 'Each idea vetted by industry experts.'
  },
  {
    icon: '🌐',
    title: 'Global Trends',
    description: 'Stay ahead with world market insights.'
  },
  {
    icon: '⚡',
    title: 'Daily Updates',
    description: 'Fresh business ideas delivered every day.'
  },
  {
    icon: '💡',
    title: 'Actionable Insights',
    description: 'Practical steps to implement each idea.'
  }
];