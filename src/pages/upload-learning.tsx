import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus } from 'lucide-react';
import { supabase } from '@/services/supabase';

// Simulate AI API (replace with actual API call if available)
const enhanceCourseContent = async (learningOutcomes: string, chapters: { title: string; content: string; quiz: string }[]) => {
  // Mock AI enhancement (replace with real API call, e.g., xAI API)
  const enhancedLearningOutcomes = JSON.stringify({
    outcomes: learningOutcomes.split('\n').map((outcome, index) => ({
      id: index + 1,
      description: `Outcome ${index + 1}: ${outcome.trim()} - Learners will gain a measurable skill or knowledge area.`,
    })),
  });
  const enhancedChapters = JSON.stringify({
    chapters: chapters.map((chapter, index) => ({
      id: index + 1,
      title: `Chapter ${index + 1}: ${chapter.title || 'Untitled'}`,
      objective: `Objective: ${chapter.content.split(':')[1] || 'Understand core concepts'}`,
      summary: `Summary: ${chapter.content || 'This chapter provides a detailed exploration of the topic, enhancing learner comprehension.'}`,
      quiz: {
        questions: chapter.quiz.split('\n').map((q, qIndex) => ({
          id: qIndex + 1,
          question: q.trim(),
          options: [`Option A: ${q.trim()}`, `Option B: ${q.trim()}`, `Option C: ${q.trim()}`],
          correctAnswer: 'Option A',
        })),
      },
    })),
  });
  return { enhancedLearningOutcomes, enhancedChapters };
};

const UploadLearning = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    shortDescription: '',
    longDescription: '',
    duration: '',
    price: '',
    imageUrl: '',
    instructor: '',
    learningOutcomes: '',
    chapters: [{ title: '', content: '', quiz: '' }],
    status: 'draft',
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate('/login');
    };
    checkAuth();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, index?: number, field?: string) => {
    const { name, value } = e.target;
    if (index !== undefined && field) {
      const newChapters = [...formData.chapters];
      newChapters[index] = { ...newChapters[index], [field]: value };
      setFormData(prev => ({ ...prev, chapters: newChapters }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addChapter = () => {
    setFormData(prev => ({
      ...prev,
      chapters: [...prev.chapters, { title: '', content: '', quiz: '' }],
    }));
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

    const { enhancedLearningOutcomes, enhancedChapters } = await enhanceCourseContent(formData.learningOutcomes, formData.chapters);

    const data = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      user_id: user.id,
      title: formData.title,
      category: formData.category,
      shortDescription: formData.shortDescription || null,
      longDescription: formData.longDescription || null,
      duration: formData.duration || null,
      price: formData.price || null,
      imageUrl: formData.imageUrl || null,
      instructor: formData.instructor || null,
      learningOutcomes: enhancedLearningOutcomes,
      chapters: enhancedChapters,
      views: 0,
      likes: 0,
      popularityScore: 0.0,
      enrollment_count: 0,
      created_at: new Date().toISOString(),
      quote_text: null,
      author: user.user_metadata?.full_name || user.email,
      status: formData.status,
    };

    const { error: insertError } = await supabase
      .from('courses')
      .insert(data);

    if (insertError) {
      console.error('Error uploading course:', insertError.message);
      setError(`Failed to upload: ${insertError.message}`);
    } else {
      setFormData({
        title: '',
        category: '',
        shortDescription: '',
        longDescription: '',
        duration: '',
        price: '',
        imageUrl: '',
        instructor: '',
        learningOutcomes: '',
        chapters: [{ title: '', content: '', quiz: '' }],
        status: 'draft',
      });
      alert('Course uploaded successfully!');
      navigate('/profile');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-montserrat text-2xl text-foreground">Upload Learning Course</CardTitle>
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
                  required
                />
              </div>
              <div>
                <label htmlFor="shortDescription" className="block text-sm font-roboto text-muted-foreground mb-1">Short Description</label>
                <textarea
                  id="shortDescription"
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md h-16"
                />
              </div>
              <div>
                <label htmlFor="longDescription" className="block text-sm font-roboto text-muted-foreground mb-1">Long Description</label>
                <textarea
                  id="longDescription"
                  name="longDescription"
                  value={formData.longDescription}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md h-32"
                />
              </div>
              <div>
                <label htmlFor="duration" className="block text-sm font-roboto text-muted-foreground mb-1">Duration</label>
                <input
                  type="text"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="price" className="block text-sm font-roboto text-muted-foreground mb-1">Price</label>
                <input
                  type="text"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="imageUrl" className="block text-sm font-roboto text-muted-foreground mb-1">Image URL</label>
                <input
                  type="text"
                  id="imageUrl"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="instructor" className="block text-sm font-roboto text-muted-foreground mb-1">Instructor</label>
                <input
                  type="text"
                  id="instructor"
                  name="instructor"
                  value={formData.instructor}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="learningOutcomes" className="block text-sm font-roboto text-muted-foreground mb-1">Learning Outcomes (one per line)</label>
                <textarea
                  id="learningOutcomes"
                  name="learningOutcomes"
                  value={formData.learningOutcomes}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md h-32"
                  required
                />
              </div>
              {formData.chapters.map((chapter, index) => (
                <div key={index} className="border border-input rounded-md p-4 mb-4">
                  <h3 className="font-montserrat text-lg text-foreground mb-2">Chapter {index + 1}</h3>
                  <div>
                    <label htmlFor={`title-${index}`} className="block text-sm font-roboto text-muted-foreground mb-1">Title</label>
                    <input
                      type="text"
                      id={`title-${index}`}
                      value={chapter.title}
                      onChange={(e) => handleChange(e, index, 'title')}
                      className="w-full p-2 border border-input bg-background rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor={`content-${index}`} className="block text-sm font-roboto text-muted-foreground mb-1">Content</label>
                    <textarea
                      id={`content-${index}`}
                      value={chapter.content}
                      onChange={(e) => handleChange(e, index, 'content')}
                      className="w-full p-2 border border-input bg-background rounded-md h-24"
                    />
                  </div>
                  <div>
                    <label htmlFor={`quiz-${index}`} className="block text-sm font-roboto text-muted-foreground mb-1">Quiz (one question per line)</label>
                    <textarea
                      id={`quiz-${index}`}
                      value={chapter.quiz}
                      onChange={(e) => handleChange(e, index, 'quiz')}
                      className="w-full p-2 border border-input bg-background rounded-md h-24"
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                className="font-roboto bg-foreground hover:bg-foreground/90 text-white flex items-center gap-2"
                onClick={addChapter}
              >
                <Plus className="h-4 w-4" /> Add Another Chapter & Quiz
              </Button>
              <Button
                type="submit"
                className="font-roboto bg-foreground hover:bg-foreground/90 text-white mt-4"
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

export default UploadLearning;