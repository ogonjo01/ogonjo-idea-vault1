// src/components/IdeaCard.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Heart, MessageCircle, FileText } from 'lucide-react';

interface IdeaCardProps {
  id: string;
  title: string;
  category: string;
  thumbnail: string; // Correct prop name as per our discussion and your table schema
  views: number; // Corresponds to 'views' column
  likes: number; // Corresponds to 'likes' column
  comments: number; // Corresponds to 'comments' column
  isLiked?: boolean;
  onClick?: () => void;
}

// Generate random pastel color for fallback thumbnail
const getRandomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 85%)`;
};

export default function IdeaCard({
  title,
  category,
  thumbnail, // Destructured correctly
  views,
  likes,
  comments = 0,
  isLiked = false,
  onClick,
}: IdeaCardProps) {
  return (
    <Card
      className="group cursor-pointer transition-shadow hover:shadow-lg border"
      onClick={onClick}
    >
      <CardHeader className="p-0">
        <div className="relative aspect-video rounded-t-lg flex items-center justify-center overflow-hidden">
          {thumbnail ? ( // Render image if thumbnail URL is provided
            <img
              src={thumbnail}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : ( // Fallback to a colorful box with a default icon if no thumbnail
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: getRandomColor() }}>
              <FileText className="h-12 w-12 text-gray-700" />
            </div>
          )}

          <div className="absolute top-2 left-2">
            <Badge className="bg-background/90 text-primary text-xs">
              {category}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2">
          {title}
        </h3>
        <div className="flex items-center text-sm text-muted-foreground space-x-4">
          <div className="flex items-center space-x-1">
            <Eye className="h-4 w-4" /><span>{views}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Heart className={`h-4 w-4 ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
            <span>{likes}</span>
          </div>
          {/* REMOVED THE DUPLICATE SPAN FOR LIKES HERE */}
          <div className="flex items-center space-x-1">
            <MessageCircle className="h-4 w-4" /><span>{comments}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}