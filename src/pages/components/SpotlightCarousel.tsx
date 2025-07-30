
// src/components/SpotlightCarousel.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';

interface SpotlightItem {
  id: string;
  type: 'idea' | 'book' | 'quote';
  title: string;
  category?: string;
  imageUrl?: string;
}

const SpotlightCarousel: React.FC = () => {
  const [spotlightItems, setSpotlightItems] = useState<SpotlightItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const fetchSpotlightItems = async () => {
      const { data: ideas, error: ideaError } = await supabase
        .from('business_ideas')
        .select('id, title, category')
        .order('created_at', { ascending: false })
        .limit(3);
      const { data: books, error: bookError } = await supabase
        .from('book_summaries')
        .select('id, title, category')
        .order('views', { ascending: false })
        .limit(3);
      if (ideaError || bookError) console.error('Error fetching spotlight items:', ideaError || bookError);
      const items = [
        ...(ideas || []).map(item => ({ ...item, type: 'idea', imageUrl: `/placeholder-idea-${item.id}.jpg` } as SpotlightItem)),
        ...(books || []).map(item => ({ ...item, type: 'book', imageUrl: `/placeholder-book-${item.id}.jpg` } as SpotlightItem)),
      ].slice(0, 3); // Limit to 3 items
      setSpotlightItems(items);
    };

    fetchSpotlightItems();

    const channelSpotlight = supabase
      .channel('public:spotlight')
      .on('postgres_changes', { event: '*', schema: 'public', table: ['business_ideas', 'book_summaries'] }, () => fetchSpotlightItems())
      .subscribe();

    const interval = setInterval(() => {
      if (!hovered && spotlightItems.length > 0) {
        setCurrentIndex((prev) => (prev + 1) % spotlightItems.length);
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channelSpotlight);
      clearInterval(interval);
    };
  }, [hovered, spotlightItems.length]);

  const navigateToDetail = (item: SpotlightItem) => {
    if (item.type === 'idea') window.location.href = `/idea/${item.id}`;
    else if (item.type === 'book') window.location.href = `/book-summary/${item.id}`;
  };

  return (
    <div className="spotlight-carousel w-full max-w-4xl mx-auto py-6">
      {spotlightItems.length > 0 && (
        <div className="carousel-inner flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
          {spotlightItems.map((item, index) => (
            <div
              key={item.id}
              className="carousel-item flex-shrink-0 w-full md:w-1/3 p-4"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onClick={() => navigateToDetail(item)}
            >
              <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-300">
                <img src={item.imageUrl || '/default-placeholder.jpg'} alt={item.title} className="w-20 h-20 object-cover rounded-md mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-gray-800 text-center">{item.title}</h3>
                <p className="text-sm text-gray-600 text-center">{item.category}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpotlightCarousel;
