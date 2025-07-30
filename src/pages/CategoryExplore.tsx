
// ogonjo-web-app/src/pages/CategoryExplore.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BUSINESS_CATEGORIES } from '../constants/businessCategories';
import '../styles/CategoryExplore.css';

const CategoryExplore: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="category-explore-container">
      <h1>Explore Business Categories</h1>
      <div className="category-grid">
        {BUSINESS_CATEGORIES.map(category => (
          <div
            key={category}
            className="category-card"
            onClick={() => navigate('/idea-list', { state: { title: category, filterType: 'category', categoryName: category } })}
          >
            <i className="ion-folder-open-outline" />
            <p>{category}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryExplore;