// src/components/Recommendations.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Define the type for a simplified BusinessIdea for recommendations
interface RecommendedIdea {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string | null; // Use thumbnail_url as per BusinessIdea type
  category: string;
  tags?: string[] | string | null; // Match BusinessIdea type
}

// Define the props interface for the Recommendations component
interface RecommendationsProps {
  currentIdeaId: string;
  currentIdeaCategory: string;
  currentIdeaTags: string[]; // Assuming tags are passed as a string array
}

const Recommendations: React.FC<RecommendationsProps> = ({
  currentIdeaId,
  currentIdeaCategory,
  currentIdeaTags,
}) => {
  const [recommendations, setRecommendations] = useState<RecommendedIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch ideas that are in the same category or share similar tags
        let query = supabase
          .from('business_ideas')
          .select('id, title, description, thumbnail_url, category, tags') // Select required fields
          .neq('id', currentIdeaId); // Exclude the current idea

        // Prioritize category match if available
        if (currentIdeaCategory) {
          query = query.eq('category', currentIdeaCategory);
        } else if (currentIdeaTags && currentIdeaTags.length > 0) {
          // If no category, try to match by tags (using 'cs' for contains string array)
          // Note: Full-text search or more complex tag matching might require Supabase functions
          query = query.overlaps('tags', currentIdeaTags);
        }

        query = query.limit(4); // Limit the number of recommendations

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }

        setRecommendations(data || []);
      } catch (err: any) {
        console.error("Error fetching recommendations:", err.message);
        setError("Failed to load recommendations.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [currentIdeaId, currentIdeaCategory, currentIdeaTags]); // Re-fetch if these props change

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground text-sm">Loading recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500 text-sm">
        <p>{error}</p>
    
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <p>No similar ideas found at the moment.</p>
        <p className="mt-2">Check back later or explore other categories.</p>
        <p className="mt-2">You can also create a new idea to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recommendations.map((idea) => (
        <Card
          key={idea.id}
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate(`/presentation/${idea.id}`)}
        >
          <CardContent className="flex items-center p-4">
            {/* Display thumbnail or a placeholder */}
            <img
              src={idea.thumbnail_url || `https://placehold.co/60x60/4ADE80/FFFFFF?text=${idea.title.charAt(0)}`}
              alt={idea.title}
              className="w-16 h-16 rounded-md object-cover mr-4"
              onError={(e) => { e.currentTarget.src = `https://placehold.co/60x60/e0e0e0/555555?text=${idea.title.charAt(0)}`; }}
            />
            <div className="flex-1">
              <h3 className="font-montserrat font-semibold text-lg">{idea.title}</h3>
              <p className="font-roboto text-muted-foreground text-sm line-clamp-2">{idea.description}</p>
              <p className="font-roboto text-xs text-primary mt-1">{idea.category}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Recommendations;
