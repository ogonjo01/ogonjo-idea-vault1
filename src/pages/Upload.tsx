import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { categories } from '@/data/mockData';
import { Upload as UploadIcon, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const Upload = () => {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    tags: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Only allow PDF files
      const validTypes = ['.pdf'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (!validTypes.includes(fileExtension)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file",
          variant: "destructive",
        });
        return;
      }

      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (selectedFile.size > maxSize) {
        toast({
          title: "File too large",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      // Add user ID to file path for better organization
      const fileName = `${user?.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `presentations/${fileName}`;

      setUploadProgress(20);

      const { error: uploadError } = await supabase.storage
        .from('presentations')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      const { data } = supabase.storage
        .from('presentations')
        .getPublicUrl(filePath);

      setUploadProgress(80);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title || !formData.category || !formData.description || !file) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields and select a file",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload presentations",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(10);
      
      // Upload file to Supabase storage
      const presentationUrl = await uploadFile(file);
      
      setUploadProgress(90);

      // Save business idea to database
      const ideaData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        difficulty: 'beginner',
        market_size: 'TBD',
        investment_nc: 'TBD',
        timeline: 'TBD',
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0).join(','),
        thumbnail: `https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop`,
        presentation_url: presentationUrl,
        created_by: user.id,
        views: 0,
        likes: 0,
        comments: 0,
        is_featured: false
      };

      // DEBUG: Log before insert
      console.log("Inserting idea data:", ideaData);

      const { error } = await supabase
        .from('business_ideas')
        .insert([ideaData]);

      if (error) throw error;

      setUploadProgress(100);
      setIsUploading(false);
      setUploadComplete(true);
      
      toast({
        title: "Upload successful!",
        description: "Your business idea has been uploaded successfully",
      });

    } catch (error: any) {
      console.error('Error uploading:', error);
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your presentation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNewUpload = () => {
    setFormData({
      title: '',
      category: '',
      description: '',
      tags: '',
    });
    setFile(null);
    setUploadComplete(false);
    setUploadProgress(0);
  };

  const filteredCategories = categories.filter(cat => cat !== 'All');

  if (uploadComplete) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header showSearch={true} />
        
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardContent className="p-8">
              <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
              <h2 className="font-montserrat font-bold text-2xl text-foreground mb-2">
                Upload Successful!
              </h2>
              <p className="font-roboto text-muted-foreground mb-6">
                Your business idea "{formData.title}" has been uploaded and is now available to the community.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-roboto"
                >
                  View Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleNewUpload}
                  className="w-full font-roboto"
                >
                  Upload Another Idea
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header showSearch={true} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-montserrat font-bold text-3xl lg:text-4xl text-foreground mb-2">
            Upload New Business Idea
          </h1>
          <p className="font-roboto text-lg text-muted-foreground">
            Share your presentation with the OGONJO community
          </p>
          <p className="font-roboto text-sm text-blue-500 mt-2">
            Note: Please upload PDF files for best viewing experience
          </p>
        </div>

        {/* Upload Form */}
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="font-montserrat text-xl">
                Presentation Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* File Upload - Updated for PDF */}
                <div className="space-y-2">
                  <Label htmlFor="file-upload" className="font-roboto font-medium">
                    Presentation File (PDF) *
                  </Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors hover:border-primary/50">
                    <input
                      type="file"
                      id="file-upload"
                      accept=".pdf" // Changed to only accept PDF
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <UploadIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      {file ? (
                        <div>
                          <p className="font-roboto font-medium text-foreground">
                            {file.name}
                          </p>
                          <p className="font-roboto text-sm text-muted-foreground">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-roboto font-medium text-foreground mb-2">
                            Choose PDF file to upload
                          </p>
                           <p className="font-roboto text-sm text-muted-foreground">
                             Allowed: .pdf (max 10MB)
                           </p>
                        </div>
                      )}
                    </label>
                  </div>
                  <p className="font-roboto text-xs text-blue-500">
                    Need to convert PowerPoint? 
                    <a 
                      href="https://support.microsoft.com/en-us/office/save-a-presentation-as-a-pdf-file-4af5efc9-5d3f-4d6f-bd0e-6b4aee5d4b52" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 underline"
                    >
                      Learn how to save as PDF
                    </a>
                  </p>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="font-roboto font-medium">
                    Presentation Title *
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="Enter presentation title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="font-roboto"
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category-select" className="font-roboto font-medium">
                    Category *
                  </Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => handleInputChange('category', value)}
                  >
                    <SelectTrigger id="category-select" className="font-roboto">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((category) => (
                        <SelectItem key={category} value={category} className="font-roboto">
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags" className="font-roboto font-medium">
                    Tags
                  </Label>
                  <Input
                    id="tags"
                    type="text"
                    placeholder="Add relevant tags (comma separated)"
                    value={formData.tags}
                    onChange={(e) => handleInputChange('tags', e.target.value)}
                    className="font-roboto"
                  />
                  <p className="font-roboto text-xs text-muted-foreground">
                    Example: startup, technology, ai, retail
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="font-roboto font-medium">
                    Description *
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this idea"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="font-roboto min-h-[100px]"
                    required
                  />
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-roboto font-medium">Upload Progress</Label>
                      <span className="font-roboto text-sm text-muted-foreground">
                        {uploadProgress}%
                      </span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  disabled={isUploading}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-roboto text-lg py-6"
                >
                  {isUploading ? 'Uploading...' : 'Upload Idea'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Upload;