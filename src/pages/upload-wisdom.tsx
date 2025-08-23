// src/pages/UploadWisdom.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { v4 as uuidv4 } from 'uuid';

const UploadWisdom: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    quote_text: '',
    author: '',
    book_title: '',
    category: '',
    affiliate_link: '',
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) navigate('/login');
    };
    checkAuth();
  }, [navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('User not authenticated.');
        setLoading(false);
        return;
      }

      // basic affiliate url sanitization (optional)
      const affiliate = formData.affiliate_link?.trim();
      const affiliateSafe = affiliate && affiliate.length > 0 ? affiliate : null;

      const row = {
        id: uuidv4(),
        quote_text: formData.quote_text.trim(),
        author: formData.author.trim(),
        book_title: formData.book_title ? formData.book_title.trim() : null,
        category: formData.category || null,
        likes: 0,
        views: 0,
        created_at: new Date().toISOString(),
        user_id: user.id,
        status: formData.status || 'pending',
        affiliate_link: affiliateSafe,
        affiliate_clicks: 0,
      };

      const { error: insertError } = await supabase.from('business_quotes').insert(row);

      if (insertError) {
        console.error('Error uploading business quote:', insertError.message);
        setError(`Failed to upload: ${insertError.message}`);
      } else {
        setFormData({
          quote_text: '',
          author: '',
          book_title: '',
          category: '',
          affiliate_link: '',
          status: 'pending',
        });
        alert('Business quote uploaded successfully!');
        navigate('/profile');
      }
    } catch (err: any) {
      console.error('Upload error', err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="mb-8 max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="font-montserrat text-2xl text-foreground">Upload Business Wisdom</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {error && <p className="text-destructive mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="quote_text" className="block text-sm font-roboto text-muted-foreground mb-1">
                  Quote Text
                </label>
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
                <label htmlFor="author" className="block text-sm font-roboto text-muted-foreground mb-1">
                  Author
                </label>
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

              {/* Book title (optional) */}
              <div>
                <label htmlFor="book_title" className="block text-sm font-roboto text-muted-foreground mb-1">
                  Book title (optional)
                </label>
                <input
                  type="text"
                  id="book_title"
                  name="book_title"
                  value={formData.book_title}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                  placeholder="e.g. Atomic Habits"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional — use if this quote is from a book (will enable 'Get Book' CTA in the modal).
                </p>
              </div>

              {/* Category: keep optional/blank if you want */}
              <div>
                <label htmlFor="category" className="block text-sm font-roboto text-muted-foreground mb-1">
                  Category (optional)
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                >
                  <option value="">Select a category (optional)</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Affiliate link (optional) */}
              <div>
                <label htmlFor="affiliate_link" className="block text-sm font-roboto text-muted-foreground mb-1">
                  Affiliate link (optional)
                </label>
                <input
                  type="url"
                  id="affiliate_link"
                  name="affiliate_link"
                  value={formData.affiliate_link}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                  placeholder="https://www.example.com/affiliatelink"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional — provide a book affiliate link (will enable Get Book button in quote modal).
                </p>
              </div>

              <div>
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
                  ) : (
                    'Upload'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UploadWisdom;
