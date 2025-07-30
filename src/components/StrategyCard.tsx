import { useState } from 'react';

interface StrategyCardProps {
  id: string;
  title: string;
  category: string;
  description: string;
  views: number;
  likes: number;
  isLiked: boolean;
  onClick: () => void;
  onInvest: () => void;
}

const StrategyCard = ({ id, title, category, description, views, likes, isLiked, onClick, onInvest }: StrategyCardProps) => {
  return (
    <div className="bg-card p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <h3 className="font-montserrat text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="font-roboto text-sm text-muted-foreground mb-2">{category}</p>
      <p className="font-roboto text-sm text-muted-foreground mb-4 line-clamp-3">{description}</p>
      <div className="flex justify-between items-center">
        <div className="flex space-x-4 text-sm text-muted-foreground">
          <span>👁️ {views}</span>
          <span>❤️ {likes}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onInvest(); }}
          className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 transition-colors"
        >
          Invest Now
        </button>
      </div>
    </div>
  );
};

export default StrategyCard;