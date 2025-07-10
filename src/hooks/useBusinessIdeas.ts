// src/hooks/useBusinessIdeas.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; // Ensure this path is correct: src/lib/supabase.ts or supabaseClient.ts
import { BusinessIdea } from '@/types/businessIdea'; // Assuming you have this type
import { useToast } from '@/components/ui/use-toast'; // Correct path for shadcn/ui toast hook
import { useAuth } from './useAuth'; // Assuming useAuth is in the same hooks directory or similar path

export function useBusinessIdeas() {
  const [ideas, setIdeas] = useState<BusinessIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchIdeas = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      let supabaseQuery = supabase
        .from('business_ideas')
        .select(`
          id,
          title,
          category,
          description,
          thumbnail_url,
          presentation_url,
          views,
          likes,
          comments,
          created_at,
          created_by,
          idea_likes!left(user_id) // Fetch likes for current user if applicable
        `);

      if (query) {
        // Use full-text search with to_tsvector for better performance if possible,
        // otherwise ilike is fine for smaller datasets.
        supabaseQuery = supabaseQuery.or(
          `title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%` // Added category to search
        );
      }

      const { data, error: dbError } = await supabaseQuery.order('created_at', { ascending: false });

      if (dbError) {
        throw dbError;
      }

      // Process data to include isLiked status
      const processedIdeas: BusinessIdea[] = data.map((idea: any) => ({
        ...idea,
        isLiked: user ? idea.idea_likes.some((like: { user_id: string }) => like.user_id === user.id) : false,
      }));

      setIdeas(processedIdeas);
    } catch (err: any) {
      console.error('Error fetching ideas:', err.message);
      setError(err.message || 'Failed to fetch business ideas.');
      toast({
        title: "Error loading ideas",
        description: err.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]); // Include user and toast in dependencies for useCallback

  // Function to increment views - called from Presentation.tsx
  const incrementView = useCallback(async (ideaId: string) => {
    try {
      // FIX: Changed parameter name from 'p_idea_id' to 'idea_id_param'
      const { data, error: rpcError } = await supabase.rpc('increment_idea_views', { idea_id_param: ideaId });

      if (rpcError) {
        console.error('Error incrementing view count via RPC:', rpcError.message, 'Code:', rpcError.code, 'Details:', rpcError.details);
        // Do not throw here, just log, as it shouldn't block page load
      } else {
        console.log('View count incremented for idea:', ideaId, 'New views (RPC response):', data);
        // Optimistically update the local state for the specific idea
        setIdeas(prevIdeas =>
          prevIdeas.map(idea =>
            idea.id === ideaId ? { ...idea, views: idea.views + 1 } : idea
          )
        );
      }
    } catch (err: any) {
      console.error('Exception during view increment RPC call:', err);
    }
  }, []); // No dependencies needed for incrementView if it only calls an RPC

  useEffect(() => {
    fetchIdeas(); // Initial fetch when component mounts
  }, [fetchIdeas]); // Dependency array includes fetchIdeas as it's a useCallback

  const searchIdeas = useCallback((query: string) => {
    fetchIdeas(query);
  }, [fetchIdeas]);

  const refetch = useCallback(() => {
    fetchIdeas(); // Function to manually refetch all ideas
  }, [fetchIdeas]);

  return {
    ideas,
    loading,
    error,
    searchIdeas,
    refetch,
    incrementView, // Make sure to return this new function
  };
}
