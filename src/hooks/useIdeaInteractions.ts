// src/hooks/useIdeaInteractions.ts
import { useState, useCallback } from 'react'; // <--- Make sure useCallback is imported
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Assuming you have this type defined somewhere, e.g., src/types/comment.ts
// If not, you'll need to define it:
// export interface CommentProfile {
//   full_name: string | null;
//   email: string | null;
// }
// export interface IdeaComment {
//   id: string;
//   content: string;
//   created_at: string;
//   profiles: CommentProfile | null;
// }

export function useIdeaInteractions() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const toggleLike = useCallback(async (ideaId: string, currentlyLiked: boolean): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to like ideas",
        variant: "destructive",
      });
      return currentlyLiked;
    }

    setLoading(true);
    try {
      if (currentlyLiked) {
        const { error: deleteError } = await supabase
          .from('idea_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('idea_id', ideaId);

        if (deleteError) throw deleteError;

        const { error: rpcError } = await supabase.rpc('decrement_likes', { idea_id_param: ideaId });
        if (rpcError) throw rpcError;

        toast({
          title: "Removed from liked",
          description: "Idea removed from your liked list",
        });
        return false;
      } else {
        const { error: insertError } = await supabase
          .from('idea_likes')
          .insert({ user_id: user.id, idea_id: ideaId });

        if (insertError) {
          if (insertError.code === '23505') {
             toast({
              title: "Already liked",
              description: "You have already liked this idea.",
              variant: "default",
            });
            return true;
          }
          throw insertError;
        }

        const { error: rpcError } = await supabase.rpc('increment_likes', { idea_id_param: ideaId });
        if (rpcError) throw rpcError;

        toast({
          title: "Added to liked",
          description: "Idea added to your liked list",
        });
        return true;
      }
    } catch (error: any) {
      console.error('Error toggling like:', error.message);
      toast({
        title: "Error",
        description: `Failed to update like status: ${error.message}`,
        variant: "destructive",
      });
      return currentlyLiked;
    } finally {
      setLoading(false);
    }
  }, [user, toast]); // Dependencies: user, toast

  const addComment = useCallback(async (ideaId: string, comment: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to comment",
        variant: "destructive",
      });
      return false;
    }

    if (!comment.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    try {
      const { error: insertError } = await supabase
        .from('idea_comments')
        .insert({
          user_id: user.id,
          idea_id: ideaId,
          content: comment.trim()
        });

      if (insertError) throw insertError;

      const { error: rpcError } = await supabase.rpc('increment_comments', { idea_id_param: ideaId });
      if (rpcError) throw rpcError;

      toast({
        title: "Comment posted",
        description: "Your comment has been added successfully",
      });

      return true;
    } catch (error: any) {
      console.error('Error adding comment:', error.message);
      toast({
        title: "Error",
        description: `Failed to post comment: ${error.message}`,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]); // Dependencies: user, toast

  // Re-adding the full select for profiles now that simpler query works and we memoize
  const getComments = useCallback(async (ideaId: string): Promise<any[]> => { // Changed type to any[] for now, but use IdeaComment[] if defined
    try {
      const { data, error } = await supabase
        .from('idea_comments')
        .select(`
          id,
          content,
          created_at,
          profiles:profiles!idea_comments_user_id_fkey (
            full_name,
            email
          )
        `)
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching comments:', error);
        throw error;
      }
      console.log("Fetched comments (full):", data); // Log the full data
      return data;
    } catch (error: any) {
      console.error('Error fetching comments (full query):', error.message);
      toast({
        title: "Error",
        description: `Failed to load comments: ${error.message}`,
        variant: "destructive",
      });
      return [];
    }
  }, [toast]); // Dependencies: toast (supabase is stable)

  const incrementViews = useCallback(async (ideaId: string) => {
    try {
      const { error } = await supabase.rpc('increment_views', { idea_id_param: ideaId });
      if (error) throw error;
    } catch (error: any) {
      console.error('Error incrementing views:', error.message);
    }
  }, []); // Dependencies: empty array as it doesn't depend on external props/state

  return {
    toggleLike,
    addComment,
    getComments,
    incrementViews,
    loading,
  };
}