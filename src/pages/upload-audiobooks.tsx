import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';

// Simulate AI API (replace with actual API call if available)
const enhanceAudiobookContent = async (shortDescription: string) => {
  // Mock AI enhancement (replace with real API call, e.g., xAI API)
  const enhancedShortDescription = `Enhanced Summary: ${shortDescription.trim() || 'An engaging audiobook offering a captivating narrative.'} This title provides an enriching listening experience, ideal for audiophiles seeking quality content.`;
  return { enhancedShortDescription };
};

const UploadAudiobooks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    short_description: '',
    image_url: '',
    audible_affiliate_link: '',
    category: '',
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

    const { enhancedShortDescription } = await enhanceAudiobookContent(formData.short_description);

    const data = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      title: formData.title,
      author: formData.author,
      short_description: enhancedShortDescription,
      image_url: formData.image_url || null,
      audible_affiliate_link: formData.audible_affiliate_link,
      category: formData.category || null,
      views: 0,
      // Assuming user_id will be added to the table
      user_id: user.id,
    };

    const { error: insertError } = await supabase
      .from('audible_books')
      .insert(data);

    if (insertError) {
      console.error('Error uploading audiobook:', insertError.message);
      setError(`Failed to upload: ${insertError.message}`);
    } else {
      setFormData({
        title: '',
        author: '',
        short_description: '',
        image_url: '',
        audible_affiliate_link: '',
        category: '',
      });
      alert('Audiobook uploaded successfully!');
      navigate('/profile');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-montserrat text-2xl text-foreground">Upload Audiobook</CardTitle>
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
                <label htmlFor="image_url" className="block text-sm font-roboto text-muted-foreground mb-1">Image URL</label>
                <input
                  type="text"
                  id="image_url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="audible_affiliate_link" className="block text-sm font-roboto text-muted-foreground mb-1">Audible Affiliate Link</label>
                <input
                  type="text"
                  id="audible_affiliate_link"
                  name="audible_affiliate_link"
                  value={formData.audible_affiliate_link}
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

export default UploadAudiobooks;