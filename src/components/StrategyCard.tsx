import { useNavigate } from "react-router-dom";

interface StrategyCardProps {
  id: string;
  title: string;
  category: string;
  description: string; // HTML content
  views: number;
  likes: number;
  isLiked: boolean;
  onClick: () => void;
  onInvest: () => void;
}

const StrategyCard = ({
  id,
  title,
  category,
  description,
  views,
  likes,
  isLiked,
  onClick,
  onInvest,
}: StrategyCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      className="bg-card p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer flex flex-col justify-between h-full"
      onClick={onClick}
    >
      {/* Title & Category */}
      <div>
        <h3 className="font-montserrat text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="font-roboto text-sm text-muted-foreground mb-2">
          {category}
        </p>

        {/* Render HTML safely */}
        <div
          className="font-roboto text-sm text-muted-foreground mb-4 line-clamp-3 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: description }}
        />
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-auto">
        <div className="flex space-x-4 text-sm text-muted-foreground">
          <span>👁️ {views}</span>
          <span>❤️ {likes}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/strategy-detail/${id}`);
          }}
          className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default StrategyCard;
