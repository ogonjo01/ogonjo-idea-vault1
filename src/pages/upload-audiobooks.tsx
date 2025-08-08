// src/pages/UploadAudiobooks.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';

// Mock AI enhancer
const enhanceAudiobookContent = async (shortDescription: string) => {
  const enhancedShortDescription = `Enhanced Summary: ${shortDescription.trim() || 'An engaging audiobook offering a captivating narrative.'} This title provides an enriching listening experience, ideal for audiophiles seeking quality content.`;
  return { enhancedShortDescription };
};

const UploadAudiobooks: React.FC = () => {
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
    audio_preview_url: '',
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) navigate('/login');
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

    // Basic client-side validation
    if (!formData.title.trim() || !formData.author.trim() || !formData.audible_affiliate_link.trim()) {
      setError('Please provide title, author and audible affiliate link.');
      setLoading(false);
      return;
    }

    // Ensure user is authenticated (we require login to upload but we will NOT insert user_id)
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      setError('User not authenticated.');
      setLoading(false);
      return;
    }

    try {
      const { enhancedShortDescription } = await enhanceAudiobookContent(formData.short_description);

      // Build payload using only columns that exist in audible_books table
      const payload: any = {
  title: formData.title.trim(),
  author: formData.author.trim(),
  short_description: enhancedShortDescription || null,
  image_url: formData.image_url || null,
  audible_affiliate_link: formData.audible_affiliate_link.trim(),
  category: formData.category || null,
  audio_preview_url: formData.audio_preview_url || null,
  user_id: authData.user.id, // ✅ important for RLS
};


      const { error: insertError } = await supabase
        .from('audible_books')
        .insert(payload);

      if (insertError) {
        console.error('Error uploading audiobook:', insertError);
        setError(`Failed to upload: ${insertError.message || insertError.code || JSON.stringify(insertError)}`);
      } else {
        setFormData({
          title: '',
          author: '',
          short_description: '',
          image_url: '',
          audible_affiliate_link: '',
          category: '',
          audio_preview_url: '',
        });
        alert('Audiobook uploaded successfully!');
        navigate('/profile');
      }
    } catch (err: any) {
      console.error('Unexpected error uploading audiobook:', err);
      setError(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
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

              <div>
                <label htmlFor="audio_preview_url" className="block text-sm font-roboto text-muted-foreground mb-1">Audio Preview URL (optional)</label>
                <input
                  type="text"
                  id="audio_preview_url"
                  name="audio_preview_url"
                  value={formData.audio_preview_url}
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
