import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';

// Simulate AI API (replace with actual API call if available)
const enhanceBusinessIdeaContent = async (description: string, shortDescription: string, contentText: string, structuredIdeaContent: string) => {
  // Mock AI enhancement (replace with real API call, e.g., xAI API)
  const enhancedDescription = `Enhanced Overview: ${description}. This idea demonstrates strong market potential with a feasible implementation plan, ideal for entrepreneurs seeking innovative growth opportunities.`;
  const enhancedShortDescription = `Summary: ${shortDescription || 'A groundbreaking business idea with high potential.'} Suitable for diverse entrepreneurial applications.`;
  const enhancedContentText = `Detailed Narrative: ${contentText}. This concept leverages current market trends to deliver sustainable value, supported by a robust execution strategy.`;
  const enhancedStructuredContent = JSON.stringify({
    overview: `Overview: ${description}. A viable solution for modern markets.`,
    steps: structuredIdeaContent.split('\n').map((step, index) => ({
      step_number: index + 1,
      action: step.trim(),
      details: `Step ${index + 1} involves careful planning to ensure success.`,
    })),
    benefits: ['Increased revenue', 'Market differentiation', 'Scalability'],
    challenges: ['Initial investment', 'Market competition'],
  });
  return { enhancedDescription, enhancedShortDescription, enhancedContentText, enhancedStructuredContent };
};

const UploadInnovations = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    price: '',
    currency: 'USD',
    benefits: '',
    use_cases: '',
    icon: '',
    difficulty: 'beginner',
    market_size: '',
    investment_needed: '',
    timeline: '',
    thumbnail: '',
    is_featured: false,
    investment_nc: '',
    presentation_url: '',
    thumbnail_url: '',
    youtube_link: '',
    full_book_link: '',
    affiliate_links: '',
    content_text: '',
    short_description: '',
    structured_idea_content: '',
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate('/login');
    };
    checkAuth();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const value = e.target.value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('User not authenticated.');
      setLoading(false);
      return;
    }

    const { enhancedDescription, enhancedShortDescription, enhancedContentText, enhancedStructuredContent } =
      await enhanceBusinessIdeaContent(formData.description, formData.short_description, formData.content_text, formData.structured_idea_content);

    const data = {
      id: crypto.randomUUID(),
      title: formData.title,
      description: enhancedDescription,
      category: formData.category,
      tags: formData.tags,
      created_by: crypto.randomUUID(), // Placeholder; replace with logic if needed
      price: formData.price ? parseFloat(formData.price) : null,
      currency: formData.currency,
      benefits: formData.benefits ? formData.benefits.split(',').map(item => item.trim()) : null,
      use_cases: formData.use_cases ? formData.use_cases.split(',').map(item => item.trim()) : null,
      icon: formData.icon || null,
      difficulty: formData.difficulty,
      market_size: formData.market_size || null,
      investment_needed: formData.investment_needed || null,
      timeline: formData.timeline || null,
      thumbnail: formData.thumbnail || null,
      views: 0,
      likes: 0,
      comments: 0,
      is_featured: formData.is_featured,
      investment_nc: formData.investment_nc || null,
      user_id: user.id,
      author_id: user.id,
      presentation_url: formData.presentation_url || null,
      thumbnail_url: formData.thumbnail_url || null,
      youtube_link: formData.youtube_link || null,
      full_book_link: formData.full_book_link || null,
      affiliate_links: formData.affiliate_links || null,
      content_text: enhancedContentText,
      short_description: enhancedShortDescription,
      structured_idea_content: enhancedStructuredContent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from('business_ideas')
      .insert(data);

    if (insertError) {
      console.error('Error uploading business idea:', insertError.message);
      setError(`Failed to upload: ${insertError.message}`);
    } else {
      setFormData({
        title: '',
        description: '',
        category: '',
        tags: '',
        price: '',
        currency: 'USD',
        benefits: '',
        use_cases: '',
        icon: '',
        difficulty: 'beginner',
        market_size: '',
        investment_needed: '',
        timeline: '',
        thumbnail: '',
        is_featured: false,
        investment_nc: '',
        presentation_url: '',
        thumbnail_url: '',
        youtube_link: '',
        full_book_link: '',
        affiliate_links: '',
        content_text: '',
        short_description: '',
        structured_idea_content: '',
      });
      alert('Business idea uploaded successfully!');
      navigate('/profile');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-montserrat text-2xl text-foreground">Upload Innovation</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {error && <p className="text-destructive mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-roboto text-muted-foreground mb-1">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                  required
                />
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-roboto text-muted-foreground mb-1">Category</label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="tags" className="block text-sm font-roboto text-muted-foreground mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="price" className="block text-sm font-roboto text-muted-foreground mb-1">Price</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="benefits" className="block text-sm font-roboto text-muted-foreground mb-1">Benefits (comma-separated)</label>
                <input
                  type="text"
                  id="benefits"
                  name="benefits"
                  value={formData.benefits}
                  onChange={(e) => handleArrayChange(e, 'benefits')}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="use_cases" className="block text-sm font-roboto text-muted-foreground mb-1">Use Cases (comma-separated)</label>
                <input
                  type="text"
                  id="use_cases"
                  name="use_cases"
                  value={formData.use_cases}
                  onChange={(e) => handleArrayChange(e, 'use_cases')}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-roboto text-muted-foreground mb-1">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md h-32"
                  required
                />
              </div>
              <div>
                <label htmlFor="short_description" className="block text-sm font-roboto text-muted-foreground mb-1">Short Description</label>
                <textarea
                  id="short_description"
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md h-16"
                />
              </div>
              <div>
                <label htmlFor="content_text" className="block text-sm font-roboto text-muted-foreground mb-1">Content Text</label>
                <textarea
                  id="content_text"
                  name="content_text"
                  value={formData.content_text}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md h-32"
                />
              </div>
              <div>
                <label htmlFor="structured_idea_content" className="block text-sm font-roboto text-muted-foreground mb-1">Structured Idea Content (one step per line)</label>
                <textarea
                  id="structured_idea_content"
                  name="structured_idea_content"
                  value={formData.structured_idea_content}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md h-32"
                />
              </div>
              <Button
                type="submit"
                className="font-roboto bg-foreground hover:bg-foreground/90 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : 'Upload'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UploadInnovations;