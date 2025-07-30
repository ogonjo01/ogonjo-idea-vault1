import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';

// Simulate AI API (replace with actual API call if available)
const enhanceQuoteContent = async (quoteText: string) => {
  // Mock AI enhancement (replace with real API call, e.g., xAI API)
  const enhancedQuoteText = `Enhanced Quote: "${quoteText.trim()}." This reflects a profound business principle, encouraging strategic growth and resilience.`;
  return { enhancedQuoteText };
};

const UploadWisdom = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    quote_text: '',
    author: '',
    category: '',
    status: 'pending',
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate('/login');
    };
    checkAuth();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

    const { enhancedQuoteText } = await enhanceQuoteContent(formData.quote_text);

    const data = {
      id: crypto.randomUUID(),
      quote_text: enhancedQuoteText,
      author: formData.author,
      category: formData.category,
      likes: 0,
      views: 0,
      created_at: new Date().toISOString(),
      user_id: user.id,
      status: formData.status,
    };

    const { error: insertError } = await supabase
      .from('business_quotes')
      .insert(data);

    if (insertError) {
      console.error('Error uploading business quote:', insertError.message);
      setError(`Failed to upload: ${insertError.message}`);
    } else {
      setFormData({
        quote_text: '',
        author: '',
        category: '',
        status: 'pending',
      });
      alert('Business quote uploaded successfully!');
      navigate('/profile');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-montserrat text-2xl text-foreground">Upload Business Wisdom</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {error && <p className="text-destructive mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="quote_text" className="block text-sm font-roboto text-muted-foreground mb-1">Quote Text</label>
                <textarea
                  id="quote_text"
                  name="quote_text"
                  value={formData.quote_text}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md h-24"
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
                <label htmlFor="status" className="block text-sm font-roboto text-muted-foreground mb-1">Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
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

export default UploadWisdom;