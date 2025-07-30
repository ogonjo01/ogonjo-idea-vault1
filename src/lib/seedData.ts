import { supabase } from '../services/supabase'

export const seedBusinessIdeas = async () => {
  const seedIdeas = [
    {
      title: "AI-Powered Personal Shopping Assistant",
      description: "A comprehensive mobile application that leverages artificial intelligence to revolutionize personal shopping experiences. The app analyzes user preferences, purchase history, browsing behavior, and style preferences to provide highly personalized product recommendations across multiple e-commerce platforms. Features include price comparison, trend analysis, and budget management tools.",
      category: "Technology",
      difficulty: "intermediate" as const,
      market_size: "$50B+",
      investment_needed: "$100K - $500K",
      timeline: "12-18 months",
      tags: ["AI", "E-commerce", "Mobile App", "Machine Learning"],
      thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop",
      views: 1250,
      likes: 89,
      is_featured: true,
    },
    {
      title: "Sustainable Food Packaging Startup",
      description: "Innovative biodegradable and compostable food packaging solutions using cutting-edge materials like mushroom-based packaging, seaweed wraps, and plant-based plastics. Target restaurants, food delivery services, and grocery stores looking to reduce their environmental impact while maintaining food safety standards.",
      category: "Sustainability",
      difficulty: "advanced" as const,
      market_size: "$25B+",
      investment_needed: "$500K - $2M",
      timeline: "18-24 months",
      tags: ["Sustainability", "Food Tech", "Environment", "Innovation"],
      thumbnail: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&h=300&fit=crop",
      views: 980,
      likes: 145,
      is_featured: true,
    },
    {
      title: "Local Skill-Sharing Platform",
      description: "A community-based platform where people can share skills and learn from neighbors. Combines the best of Airbnb and Udemy for local skills like cooking, gardening, home repair, musical instruments, languages, and crafts. Features include peer-to-peer learning, skill verification, and community building tools.",
      category: "Education",
      difficulty: "beginner" as const,
      market_size: "$5B+",
      investment_needed: "$50K - $100K",
      timeline: "6-12 months",
      tags: ["Community", "Education", "Sharing Economy", "Local"],
      thumbnail: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop",
      views: 2100,
      likes: 203,
      is_featured: false,
    },
    {
      title: "Smart Home Energy Optimizer",
      description: "An advanced IoT system that automatically optimizes home energy consumption by learning usage patterns and intelligently controlling smart devices. Integrates with existing smart home ecosystems and uses AI to reduce energy bills by up to 30% while maintaining optimal comfort levels.",
      category: "Technology",
      difficulty: "advanced" as const,
      market_size: "$15B+",
      investment_needed: "$200K - $1M",
      timeline: "15-20 months",
      tags: ["IoT", "Smart Home", "Energy", "AI"],
      thumbnail: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop",
      views: 1650,
      likes: 122,
      is_featured: true,
    },
    {
      title: "Virtual Fitness Coach for Seniors",
      description: "A specialized fitness application designed specifically for seniors featuring AI-powered form correction, fall prevention exercises, and seamless health monitoring integration. Works with healthcare providers to create personalized, safe workout routines with real-time feedback and progress tracking.",
      category: "Healthcare",
      difficulty: "intermediate" as const,
      market_size: "$30B+",
      investment_needed: "$150K - $750K",
      timeline: "12-18 months",
      tags: ["Healthcare", "Fitness", "AI", "Seniors"],
      thumbnail: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
      views: 890,
      likes: 76,
      is_featured: false,
    },
    {
      title: "Micro-Investment Platform for Teens",
      description: "An educational mobile app that teaches teenagers about investing through micro-investments and gamification. Parents can set up supervised accounts while teens learn about stocks, bonds, ETFs, and financial literacy through interactive challenges, quizzes, and small real investments.",
      category: "Finance",
      difficulty: "intermediate" as const,
      market_size: "$10B+",
      investment_needed: "$300K - $1M",
      timeline: "12-15 months",
      tags: ["Finance", "Education", "Mobile App", "Youth"],
      thumbnail: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=300&fit=crop",
      views: 1420,
      likes: 168,
      is_featured: true,
    },
    {
      title: "Remote Team Collaboration Suite",
      description: "An integrated platform combining project management, time tracking, video conferencing, and team collaboration tools specifically designed for distributed teams. Features AI-powered productivity insights, automated meeting summaries, and wellness monitoring to enhance remote work efficiency.",
      category: "Technology",
      difficulty: "advanced" as const,
      market_size: "$45B+",
      investment_needed: "$400K - $1.5M",
      timeline: "16-22 months",
      tags: ["Remote Work", "Productivity", "SaaS", "Collaboration"],
      thumbnail: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=300&fit=crop",
      views: 1890,
      likes: 134,
      is_featured: true,
    },
    {
      title: "Subscription Box for Pet Wellness",
      description: "Monthly subscription service delivering personalized pet health products, supplements, toys, and treats based on pet age, breed, size, and specific health conditions. Includes virtual vet consultations, health tracking, and customized nutrition plans.",
      category: "E-commerce",
      difficulty: "beginner" as const,
      market_size: "$8B+",
      investment_needed: "$75K - $250K",
      timeline: "8-12 months",
      tags: ["Subscription", "Pet Care", "Health", "E-commerce"],
      thumbnail: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop",
      views: 672,
      likes: 83,
      is_featured: false,
    }
  ]

  try {
    const { data, error } = await supabase
      .from('business_ideas')
      .insert(seedIdeas)
      .select('*')

    if (error) throw error
    
    console.log('Successfully seeded business ideas:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error seeding business ideas:', error)
    return { success: false, error }
  }
}

// Function to check if seeding is needed
export const checkAndSeedIfNeeded = async () => {
  try {
    const { data, error } = await supabase
      .from('business_ideas')
      .select('id')
      .limit(1)

    if (error) throw error

    // If no ideas exist, seed the database
    if (!data || data.length === 0) {
      console.log('No business ideas found, seeding database...')
      return await seedBusinessIdeas()
    }

    console.log('Business ideas already exist in database')
    return { success: true, message: 'Database already seeded' }
  } catch (error) {
    console.error('Error checking database:', error)
    return { success: false, error }
  }
}