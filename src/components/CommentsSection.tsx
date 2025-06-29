// src/components/CommentsSection.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

// Re-define these types here or import them from a shared types file (e.g., src/types/comment.ts)
export interface CommentProfile {
  full_name: string | null;
  email: string | null;
}

export interface IdeaComment {
  id: string;
  content: string;
  created_at: string;
  profiles: CommentProfile | null;
}

interface CommentsSectionProps {
  comments: IdeaComment[]; // Using the specific type
  ideaCommentsCount: number;
  onCommentSubmit: (comment: string) => Promise<void>;
}

const CommentsSection = ({ comments, ideaCommentsCount, onCommentSubmit }: CommentsSectionProps) => {
  const [comment, setComment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    await onCommentSubmit(comment);
    setComment(''); // Clear the input field after submission
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="font-montserrat font-semibold text-xl text-foreground mb-6">
          Comments ({ideaCommentsCount})
        </h2>

        {/* Add Comment */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <Textarea
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="font-roboto"
            rows={3}
          />
          <Button
            type="submit"
            disabled={!comment.trim()}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-roboto"
          >
            Post Comment
          </Button>
        </form>

        <Separator className="mb-6" />

        {/* Dynamic Comments List */}
        <div className="space-y-6">
          {comments.length === 0 ? (
            <p className="font-roboto text-sm text-muted-foreground text-center">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex space-x-4">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <span className="font-roboto font-medium text-sm">
                    {c.profiles?.full_name ? c.profiles.full_name.substring(0, 2).toUpperCase() : 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-roboto font-medium text-sm">
                      {c.profiles?.full_name || 'Anonymous'}
                    </span>
                    <span className="font-roboto text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-roboto text-sm text-foreground">
                    {c.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CommentsSection;