import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessIdeas } from '@/hooks/useBusinessIdeas';
import { Button } from '@/components/ui/button';
//import Header from '@/components/Header';
//import Footer from '@/components/Footer';
import IdeaCard from '@/components/IdeaCard';
import { categories } from '@/data/mockData';
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
<div className="my-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400">
  <p className="font-roboto text-sm">Advertisement</p> {/* You can keep this label or remove it */}
  <ins className="adsbygoogle"
       style={{ display: 'block', textAlign: 'center', minHeight: '100px' }} // Use React style object
       data-ad-client="ca-pub-7769353221684341"
       data-ad-slot="7980803429"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>
       (window.adsbygoogle = window.adsbygoogle || []).push({});
  </script>
</div>
  return (
    <div className="min-h-screen flex flex-col bg-background">
     

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="font-montserrat text-4xl font-bold mb-4 text-foreground mb-2">
          Business Ideas Dashboard
        
        </h1>
         <p className="text-xl mb-8 font-roboto">Join thousands of entrepreneurs who are already using OGONJO to discover and validate their next big business opportunity.</p>

        {searchQuery && (
          <p className="font-roboto text-muted-foreground mb-6">
            Showing results for "{searchQuery}" • {filteredIdeas.length} found
          </p>
        )}
<div className="my-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400">
  <p className="font-roboto text-sm">Advertisement</p> {/* You can keep this label or remove it */}
  <ins className="adsbygoogle"
       style={{ display: 'block', textAlign: 'center', minHeight: '100px' }} // Use React style object
       data-ad-client="ca-pub-7769353221684341"
       data-ad-slot="7980803429"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>
       (window.adsbygoogle = window.adsbygoogle || []).push({});
  </script>
</div>
        {/* Category Buttons */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={selectedCategory === cat ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat)}
              className={`font-roboto transition-colors ${
                selectedCategory === cat
                  ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
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
                thumbnail={idea.thumbnail_url}
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

        
<div className="my-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400">
  <p className="font-roboto text-sm">Advertisement</p> {/* You can keep this label or remove it */}
  <ins className="adsbygoogle"
       style={{ display: 'block', textAlign: 'center', minHeight: '100px' }} // Use React style object
       data-ad-client="ca-pub-7769353221684341"
       data-ad-slot="7980803429"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>
       (window.adsbygoogle = window.adsbygoogle || []).push({});
  </script>
</div>
        {/* Integrated Business Canvas Interactive Guide */}
        <BusinessCanvasGuide />

      </main>

     
    </div>
  );
};

export default Dashboard;
