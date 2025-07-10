// src/pages/Dashboard.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessIdeas } from '@/hooks/useBusinessIdeas';
import { Button } from '@/components/ui/button';
//import Header from '@/components/Header'; // Keep commented if not used
//import Footer from '@/components/Footer'; // Keep commented if not used
import IdeaCard from '@/components/IdeaCard';
// REMOVED: import { categories } from '@/data/mockData';
// NEW: Import the new BUSINESS_CATEGORIES
import { BUSINESS_CATEGORIES } from '@/constants/businessCategories'; // Adjust path if necessary, e.g., ../constants/businessCategories

import { AlertTriangle } from 'lucide-react';
import { BusinessIdea } from '@/types/businessIdea';

// Import the new BusinessCanvasGuide component
import BusinessCanvasGuide from '@/components/BusinessCanvasGuide';

const Dashboard = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const { user, loading: authLoading } = useAuth();
  const {
    ideas,
    loading: ideasLoading,
    error,
    searchIdeas,
    refetch
  } = useBusinessIdeas();

  const initialLoad = useRef(true);
  const searchDebounceRef = useRef<number>();

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [authLoading, user, navigate]);

  // Debounce search
  useEffect(() => {
    if (authLoading) return;
    window.clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => {
      if (searchQuery.trim()) {
        searchIdeas(searchQuery);
      } else if (!initialLoad.current) {
        refetch();
      }
      setSelectedCategory('All');
      initialLoad.current = false;
    }, 300);
    return () => window.clearTimeout(searchDebounceRef.current);
  }, [searchQuery, authLoading, searchIdeas, refetch]);

  // Filter by category
  const filteredIdeas = useMemo(() => {
    if (selectedCategory === 'All') return ideas;
    return ideas.filter(
      (i) => i.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [ideas, selectedCategory]);

  const handleIdeaClick = (id: string) => {
    navigate(`/presentation/${id}`);
  };

  // Loading state
  if (authLoading || ideasLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="animate-spin w-16 h-16 border-4 border-t-primary border-primary/20 rounded-full" />
        <p className="mt-4 font-roboto text-muted-foreground">
          Loading business ideas...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="font-montserrat text-xl text-foreground mb-2">
          Unable to Load Business Ideas
        </h3>
        <p className="font-roboto text-muted-foreground mb-6">
          {error.includes('timed out')
            ? 'The request timed out. Check your connection.'
            : error}
        </p>
        <div className="space-x-3">
          <Button onClick={() => window.location.reload()} className="font-roboto">
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="font-roboto"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header and Footer are commented out, assuming they are handled by a parent layout */}
      {/* <Header /> */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div
          className="relative rounded-lg overflow-hidden mb-8"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=1200&q=80')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '260px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 flex flex-col items-center justify-center h-full py-12 px-4 text-center">
            <h1 className="font-montserrat text-4xl font-bold mb-4 text-white drop-shadow-lg">
              Ignite Your Vision, Shape the Future
            </h1>
            <p className="text-xl mb-6 font-roboto text-gray-200 max-w-2xl drop-shadow">
              Every breakthrough starts with a single idea. OGONJO empowers you to turn inspiration into impact—because the world changes when you dare to build.
            </p>
          </div>
        </div>

        {searchQuery && (
          <p className="font-roboto text-muted-foreground mb-6">
            Showing results for "{searchQuery}" • {filteredIdeas.length} found
          </p>
        )}

        {/* Category Buttons - Now using BUSINESS_CATEGORIES */}
        <div className="flex flex-wrap gap-2 mb-8">
          {/* Add "All" button first */}
          <Button
            key="All"
            size="sm"
            variant={selectedCategory === 'All' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('All')}
            className={`font-roboto transition-colors ${
              selectedCategory === 'All'
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground' // Use primary for 'All'
                : 'hover:bg-secondary'
            }`}
          >
            All
          </Button>
          {BUSINESS_CATEGORIES.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={selectedCategory === cat ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat)}
              className={`font-roboto transition-colors ${
                selectedCategory === cat
                  ? 'bg-accent hover:bg-accent/90 text-accent-foreground' // Use accent for selected category
                  : 'hover:bg-secondary'
              }`}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Ideas Grid */}
        {filteredIdeas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                id={idea.id}
                title={idea.title}
                category={idea.category}
                thumbnail={idea.thumbnail_url} // Assuming thumbnail is correctly passed from DB
                views={idea.views}
                likes={idea.likes}
                comments={idea.comments}
                isLiked={idea.isLiked}
                onClick={() => handleIdeaClick(idea.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="font-montserrat text-xl text-foreground mb-2">
              No ideas found
            </h3>
            <p className="font-roboto text-muted-foreground mb-4 max-w-md mx-auto">
              {searchQuery
                ? `No business ideas match "${searchQuery}".`
                : `No ideas in "${selectedCategory}" category.`}
            </p>
            {(searchQuery || selectedCategory !== 'All') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory('All');
                  navigate('/dashboard');
                }}
                className="font-roboto"
              >
                View All Ideas
              </Button>

            )}
          </div>
        )}

        {/* Footer stats - keep if needed, otherwise remove */}
        {filteredIdeas.length > 0 && (
          <p className="mt-12 text-center font-roboto text-sm text-muted-foreground">
            Showing {filteredIdeas.length} of {ideas.length} ideas
          </p>
        )}
        {/* Integrated Business Canvas Interactive Guide */}
        <BusinessCanvasGuide />

      </main>

      {/* <Footer /> */}
    </div>
  );
};

export default Dashboard;
