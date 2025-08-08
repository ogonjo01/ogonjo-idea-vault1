// src/pages/UploadInnovations.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { v4 as uuidv4 } from 'uuid';



export default function UploadInnovations() {
  const navigate = useNavigate();
  const quillRef = useRef<ReactQuill>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

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
    presentation_url: '',
    thumbnail_url: '',
    youtube_link: '',
    full_book_link: '',
    affiliate_links: '',
    investment_nc: '',
    short_description: '',
  });

  // rich text fields
  const [contentText, setContentText] = useState('');
  const [structuredIdeaContent, setStructuredIdeaContent] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate('/login');
    });
  }, [navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    // sanitize editor contents
    const sanitizedContent = DOMPurify.sanitize(contentText);
    const sanitizedStructured = DOMPurify.sanitize(structuredIdeaContent);

    // parse structured into JSON array
    const structuredJson = sanitizedStructured
      .split('\n')
      .map((step, idx) => ({ step_number: idx + 1, action: step.trim() }));

    const payload = {
      id: uuidv4,
      title: formData.title,
      description: formData.description || null,
      category: formData.category || null,
      tags: formData.tags || null,
      price: formData.price ? parseFloat(formData.price) : null,
      currency: formData.currency,
      benefits: formData.benefits
        ? formData.benefits.split(',').map(t => t.trim())
        : null,
      use_cases: formData.use_cases
        ? formData.use_cases.split(',').map(t => t.trim())
        : null,
      icon: formData.icon || null,
      difficulty: formData.difficulty,
      market_size: formData.market_size || null,
      investment_needed: formData.investment_needed || null,
      timeline: formData.timeline || null,
      thumbnail: formData.thumbnail || null,
      thumbnail_url: formData.thumbnail_url || null,
      presentation_url: formData.presentation_url || null,
      youtube_link: formData.youtube_link || null,
      full_book_link: formData.full_book_link || null,
      affiliate_links: formData.affiliate_links || null,
      investment_nc: formData.investment_nc || null,
      short_description: formData.short_description || null,
      content_text: sanitizedContent || null,
      structured_idea_content: structuredJson.length ? structuredJson : null,
      is_featured: formData.is_featured,
      views: 0,
      likes: 0,
      comments: 0,
      user_id: user.id,
      author_id: user.id,
      created_by: user.id,
      // created_at & updated_at use DB defaults
    };

    const { error: insertError } = await supabase
      .from('business_ideas')
      .insert(payload);

    if (insertError) {
      setError(insertError.message);
    } else {
      alert('Innovation uploaded!');
      navigate('/profile');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="font-montserrat text-2xl">
            Upload Innovation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Grid of basic inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium"
                >
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded"
                />
              </div>
              {/* Category dropdown */}
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium"
                >
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded"
                >
                  <option value="">Choose a category…</option>
                  <option value="Tech & Innovation">Tech &amp; Innovation</option>
                  <option value="Health & Wellness">Health &amp; Wellness</option>
                  <option value="Education">Education</option>
                  <option value="Finance & Investing">Finance &amp; Investing</option>
                  <option value="Sustainability">Sustainability</option>
                  <option value="Consumer Products">Consumer Products</option>
                </select>
              </div>
              {/* Tags */}
              <div>
                <label
                  htmlFor="tags"
                  className="block text-sm font-medium"
                >
                  Tags (comma-separated)
                </label>
                <input
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              {/* Price */}
              <div>
                <label
                  htmlFor="price"
                  className="block text-sm font-medium"
                >
                  Price
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              {/* Benefits */}
              <div>
                <label
                  htmlFor="benefits"
                  className="block text-sm font-medium"
                >
                  Benefits (comma-separated)
                </label>
                <input
                  id="benefits"
                  name="benefits"
                  value={formData.benefits}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              {/* Use cases */}
              <div>
                <label
                  htmlFor="use_cases"
                  className="block text-sm font-medium"
                >
                  Use Cases (comma-separated)
                </label>
                <input
                  id="use_cases"
                  name="use_cases"
                  value={formData.use_cases}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              {/* Difficulty */}
              <div>
                <label
                  htmlFor="difficulty"
                  className="block text-sm font-medium"
                >
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              {/* Short description */}
              <div className="md:col-span-2">
                <label
                  htmlFor="short_description"
                  className="block text-sm font-medium"
                >
                  Short Description
                </label>
                <textarea
                  id="short_description"
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleChange}
                  className="w-full p-2 border rounded h-20"
                />
              </div>
              {/* Add any remaining text inputs similarly... */}
            </div>

            {/* Rich text editors */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Content
              </label>
              <ReactQuill
                ref={quillRef}
                value={contentText}
                onChange={setContentText}
                theme="snow"
                className="h-48 mb-4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Structured Steps
              </label>
              <ReactQuill
                value={structuredIdeaContent}
                onChange={setStructuredIdeaContent}
                theme="snow"
                className="h-32"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
