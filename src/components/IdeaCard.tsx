// src/components/IdeaCard.tsx
interface BusinessIdea {
  id: number;
  title: string;
  category: string;
  description: string;
  likes: number;
  views: number;
  created_at: string;
}

interface IdeaCardProps {
  idea: BusinessIdea;
}

function IdeaCard({ idea }: IdeaCardProps) {
  return (
    <div className="idea-card">
      <h3>{idea.title}</h3>
      <div className="category">{idea.category}</div>
      <div className="description">{idea.description}</div>
      <div className="stats">
        <span>👍 {idea.likes}</span>
        <span>👀 {idea.views}</span>
      </div>
    </div>
  );
}

export default IdeaCard;