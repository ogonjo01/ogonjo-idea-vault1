import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Heart, MessageCircle, Download } from 'lucide-react';
import { BusinessIdea } from '@/types/businessIdea';

interface PresentationHeaderProps {
  idea: BusinessIdea;
  onLike: () => void;
  onDownload: () => void;
}

const PresentationHeader = ({
  idea,
  onLike,
  onDownload
}: PresentationHeaderProps) => {
  // Safely handle tags (array or undefined)
  const tags = Array.isArray(idea.tags) ? idea.tags : [];

  // Safely handle optional properties with defaults
  const isLiked = idea.isLiked ?? false;
  const views = idea.views || 0;
  const likes = idea.likes || 0;
  const comments = idea.comments || 0;
  const category = idea.category || 'Uncategorized';
  const description = idea.description || '';

  return (
    <div className="mb-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div className="flex-1">
          <h1 className="font-montserrat font-bold text-3xl lg:text-4xl text-foreground mb-3">
            {idea.title}
          </h1>
          <div className="flex items-center gap-4 mb-4">
            <Badge variant="secondary" className="font-roboto">
              {category}
            </Badge>
            <div className="flex items-center gap-4 text-sm text-muted-foreground font-roboto">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{views.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className={`h-4 w-4 ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
                <span>{likes.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>{comments.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <p className="font-roboto text-muted-foreground text-lg">
            {description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
          <Button 
            onClick={onLike}
            variant={isLiked ? "default" : "outline"}
            className="font-roboto"
          >
            <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
            {isLiked ? 'Liked' : 'Like'}
          </Button>
          <Button 
            onClick={onDownload}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-roboto"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Safely render tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Badge 
              key={`${tag}-${index}`} 
              variant="outline" 
              className="font-roboto text-xs"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default PresentationHeader;