import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { Database } from '@/lib/supabase';

type BusinessIdea = Database['public']['Tables']['business_ideas']['Row'];
type UploadedFile = { name: string; metadata?: { size?: number } };

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ideas, setIdeas] = useState<BusinessIdea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingIdea, setEditingIdea] = useState<BusinessIdea | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    market_size: '',
    investment_needed: '',
    timeline: '',
    tags: '',
    thumbnail: '',
    is_featured: false,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchIdeas();
    fetchFiles();
  }, [user]);

  const fetchIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from('business_ideas')
        .select(
          'id, title, description, category, difficulty, market_size, investment_needed, timeline, tags, thumbnail, presentation_url, author_id, views, likes, is_featured, created_at, updated_at'
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      setIdeas(data || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load ideas', variant: 'destructive' });
    } finally {
      setLoadingIdeas(false);
    }
  };

  const fetchFiles = async () => {
    setLoadingFiles(true);
    try {
      const { data, error } = await supabase.storage
        .from('presentations')
        .list('presentations', { limit: 100 });
      if (error) throw error;
      setUploadedFiles(data || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load files', variant: 'destructive' });
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2)}.${fileExt}`;
    const path = `presentations/${fileName}`;
    setUploadProgress(10);
    await supabase.storage.from('presentations').upload(path, file);
    setUploadProgress(60);
    const { data } = supabase.storage.from('presentations').getPublicUrl(path);
    setUploadProgress(80);
    return data.publicUrl;
  };

  const handleDeleteFile = async (name: string) => {
    if (!confirm('Delete this file?')) return;
    await supabase.storage.from('presentations').remove([`presentations/${name}`]);
    toast({ title: 'Deleted', description: 'File removed' });
    fetchFiles();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    let presentation_url = editingIdea?.presentation_url || null;
    if (selectedFile) {
      presentation_url = await uploadFile(selectedFile);
    }
    const payload = {
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()),
      presentation_url,
      author_id: user!.id,
      views: editingIdea?.views || 0,
      likes: editingIdea?.likes || 0,
    };
    if (editingIdea) {
      await supabase.from('business_ideas').update(payload).eq('id', editingIdea.id);
      toast({ title: 'Updated', description: 'Idea updated' });
    } else {
      await supabase.from('business_ideas').insert([payload]);
      toast({ title: 'Created', description: 'Idea created' });
    }
    setUploading(false);
    setUploadProgress(0);
    setShowForm(false);
    setEditingIdea(null);
    fetchIdeas();
    fetchFiles();
  };

  const startEdit = (idea: BusinessIdea) => {
    setEditingIdea(idea);
    setFormData({
      title: idea.title,
      description: idea.description,
      category: idea.category,
      difficulty: idea.difficulty,
      market_size: idea.market_size,
      investment_needed: idea.investment_needed,
      timeline: idea.timeline,
      tags: idea.tags.join(', '),
      thumbnail: idea.thumbnail,
      is_featured: idea.is_featured,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this idea?')) return;
    await supabase.from('business_ideas').delete().eq('id', id);
    toast({ title: 'Deleted', description: 'Idea deleted' });
    fetchIdeas();
  };

  if (!user) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <Card><CardContent>You must be logged in</CardContent></Card>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="container mx-auto p-4 flex-1">
        {/* Admin header and controls */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <Button onClick={() => { setShowForm(!showForm); setEditingIdea(null); setFormData({ title: '', description: '', category: '', difficulty: 'beginner', market_size: '', investment_needed: '', timeline: '', tags: '', thumbnail: '', is_featured: false }); }}>
            <Plus className="w-4 h-4 mr-1" /> Add New Idea
          </Button>
        </div>
        {showForm && (
          <Card className="mb-8">
            <CardHeader><CardTitle>{editingIdea ? 'Edit Idea' : 'Add Idea'}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* form fields... */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Upload Progress</Label><span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit" disabled={uploading}>{editingIdea ? 'Update' : 'Create'}</Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
        {/* Lists of files and ideas... */}
      </main>
      <Footer />
    </div>
  );
}


//export default Admin;