import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BusinessIdea } from '@/types/businessIdea';

interface RecommendationsProps {
  currentPdfUrl: string;
}

const COLORS = [
  'bg-red-100 text-red-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-yellow-100 text-yellow-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
];

const getRandomColorClass = () => {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
};

const Recommendations = ({ currentPdfUrl }: RecommendationsProps) => {
  const [relatedIdeas, setRelatedIdeas] = useState<BusinessIdea[]>([]);

  useEffect(() => {
    const fetchRelatedIdeas = async () => {
      const { data, error } = await supabase
        .from('business_ideas')
        .select('*')
        .neq('presentation_url', currentPdfUrl)
        .limit(5);

      if (!error && data) {
        setRelatedIdeas(data);
      }
    };

    fetchRelatedIdeas();
  }, [currentPdfUrl]);

  return (
    <div className="space-y-4">
      {relatedIdeas.map((idea) => {
        const colorClass = getRandomColorClass();

        return (
          <Link
            to={`/presentation/${idea.id}`}
            key={idea.id}
            className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted transition"
          >
            {/* Colored preview box */}
            <div
              className={`w-12 h-14 rounded-md flex items-center justify-center font-bold text-xs ${colorClass}`}
            >
              PDF
            </div>

            {/* Title & Description */}
            <div className="flex-1">
              <p className="text-sm font-medium break-words leading-snug">
                {idea.title}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {idea.description}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default Recommendations;
