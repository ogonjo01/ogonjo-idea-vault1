import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { v4 as uuidv4 } from 'uuid';

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

  const categories = [
    'Leadership',
    'Entrepreneurship & Risk',
    'Innovation & Creativity',
    'Success & Motivation',
    'Failure & Learning',
    'Money & Finance',
    'Strategy & Vision',
    'Marketing & Branding',
    'Productivity & Time Management',
    'Teamwork & Culture',
  ];

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

    const data = {
      id: uuidv4(),
      quote_text: formData.quote_text,
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
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
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
