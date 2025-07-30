import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';

// Simulate AI API (replace with actual API call if available)
const enhanceBookSummaryContent = async (summaryContent: string, shortDescription: string) => {
  // Mock AI enhancement (replace with real API call, e.g., xAI API)
  const enhancedSummaryContent = JSON.stringify({
    overview: `Overview: ${summaryContent.split('\n')[0] || 'A compelling narrative exploring key concepts.'} This book offers profound insights into its subject matter.`,
    key_themes: ['Theme 1: Core idea of the book', 'Theme 2: Supporting concept'],
    key_takeaways: ['Takeaway 1: Actionable insight from the text.', 'Takeaway 2: Practical application.'],
    conclusion: `Conclusion: ${summaryContent.split('\n').pop() || 'The book concludes with a powerful message.'} Readers will find it both enlightening and motivating.`,
  });
  const enhancedShortDescription = `Summary: ${shortDescription || 'This book provides an insightful exploration of its topic, offering valuable lessons for readers.'} Ideal for those seeking intellectual growth.`;
  return { enhancedSummaryContent, enhancedShortDescription };
};

const UploadSummaries = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: '',
    youtube_link: '',
    full_book_link: '',
    affiliate_links: '',
    summary_content: '',
    short_description: '',
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate('/login');
    };
    checkAuth();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value.split(',').map(item => item.trim()).filter(item => item) }));
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

    const { enhancedSummaryContent, enhancedShortDescription } = await enhanceBookSummaryContent(formData.summary_content, formData.short_description);

    const data = {
      id: crypto.randomUUID(),
      title: formData.title,
      author: formData.author,
      category: formData.category,
      likes: 0,
      views: 0,
      created_at: new Date().toISOString(),
      youtube_link: formData.youtube_link || null,
      full_book_link: formData.full_book_link || null,
      affiliate_links: formData.affiliate_links.length ? formData.affiliate_links : null,
      summary_content: enhancedSummaryContent,
      short_description: enhancedShortDescription,
      // Assuming user_id will be added to the table
      user_id: user.id,
    };

    const { error: insertError } = await supabase
      .from('book_summaries')
      .insert(data);

    if (insertError) {
      console.error('Error uploading book summary:', insertError.message);
      setError(`Failed to upload: ${insertError.message}`);
    } else {
      setFormData({
        title: '',
        author: '',
        category: '',
        youtube_link: '',
        full_book_link: '',
        affiliate_links: '',
        summary_content: '',
        short_description: '',
      });
      alert('Book summary uploaded successfully!');
      navigate('/profile');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-montserrat text-2xl text-foreground">Upload Book Summary</CardTitle>
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
                <label htmlFor="author" className="block text-sm font-roboto text-muted-foreground mb-1">Author</label>
                <input
                  type="text"
                  id="author"
                  name="author"
                  value={formData.author}
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
                  required
                />
              </div>
              <div>
                <label htmlFor="youtube_link" className="block text-sm font-roboto text-muted-foreground mb-1">YouTube Link</label>
                <input
                  type="text"
                  id="youtube_link"
                  name="youtube_link"
                  value={formData.youtube_link}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="full_book_link" className="block text-sm font-roboto text-muted-foreground mb-1">Full Book Link</label>
                <input
                  type="text"
                  id="full_book_link"
                  name="full_book_link"
                  value={formData.full_book_link}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="affiliate_links" className="block text-sm font-roboto text-muted-foreground mb-1">Affiliate Links (comma-separated)</label>
                <input
                  type="text"
                  id="affiliate_links"
                  name="affiliate_links"
                  value={formData.affiliate_links}
                  onChange={handleArrayChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="summary_content" className="block text-sm font-roboto text-muted-foreground mb-1">Summary Content (one point per line)</label>
                <textarea
                  id="summary_content"
                  name="summary_content"
                  value={formData.summary_content}
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

export default UploadSummaries;