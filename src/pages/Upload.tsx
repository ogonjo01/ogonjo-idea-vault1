// src/pages/Upload.tsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { categories } from '@/data/mockData';
import {
  Upload as UploadIcon,
  CheckCircle,
  FileText,
  Zap,
  TrendingUp,
  DollarSign,
  Calendar,
  Loader2,
  Youtube, // New icon for YouTube link
  Book,    // New icon for Full Book link
  Link    // New icon for Affiliate Links
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Define a mapping for category-based placeholder images (kept for consistency, though currently null in handleSubmit)
const categoryThumbnails: { [key: string]: string } = {
  'Technology': 'https://placehold.co/400x300/4CAF50/FFFFFF?text=Tech',
  'Finance': 'https://placehold.co/400x300/2196F3/FFFFFF?text=Finance',
  'Healthcare': 'https://placehold.co/400x300/FF5722/FFFFFF?text=Health',
  'Education': 'https://placehold.co/400x300/9C27B0/FFFFFF?text=Edu',
  'Retail': 'https://placehold.co/400x300/FFC107/333333?text=Retail',
  'Food & Beverage': 'https://placehold.co/400x300/795548/FFFFFF?text=Food',
  'Real Estate': 'https://placehold.co/400x300/607D8B/FFFFFF?text=RealEstate',
  'Marketing': 'https://placehold.co/400x300/E91E63/FFFFFF?text=Marketing',
  'Manufacturing': 'https://placehold.co/400x300/009688/FFFFFF?text=Manufact',
  'Energy': 'https://placehold.co/400x300/FF9800/FFFFFF?text=Energy',
  'AI': 'https://placehold.co/400x300/673AB7/FFFFFF?text=AI',
  'Other': 'https://placehold.co/400x300/9E9E9E/FFFFFF?text=Other',
};


const Upload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    tags: '', // Comma-separated string
    difficulty: '',
    market_size: '',
    investment_needed: '',
    timeline: '',
    // NEW FIELDS FOR LINKS
    youtube_link: '',
    full_book_link: '',
    affiliate_links: '', // Will store comma-separated links
  });
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file.",
          variant: "destructive",
        });
        return;
      }

      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (selectedFile.size > maxSize) {
        toast({
          title: "File too large",
          description: "File size must be less than 10MB.",
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
      const fileName = `${user?.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName; 

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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Comprehensive validation for all required fields
    if (!formData.title || !formData.category || !formData.description || !file ||
        !formData.difficulty || !formData.market_size || !formData.investment_needed || !formData.timeline) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select a presentation file.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload a business idea.",
        variant: "destructive",
      });
      navigate('/auth?auth=true');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    let presentationUrl = null;

    try {
      setUploadProgress(10);
      
      presentationUrl = await uploadFile(file);
      
      setUploadProgress(70);

      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

      // Thumbnail URL will be null to trigger random color fallback in IdeaCard.tsx
      const thumbnail_url = null; 

      // Save business idea to database
      const ideaData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        difficulty: formData.difficulty,
        market_size: formData.market_size,
        investment_needed: formData.investment_needed,
        timeline: formData.timeline,
        tags: tagsArray,
        thumbnail_url: thumbnail_url,
        presentation_url: presentationUrl,
        author_id: user.id,
        created_by: user.id,
        views: 0,
        likes: 0,
        comments: 0,
        is_featured: false,
        // NEW FIELDS INCLUDED IN ideaData
        youtube_link: formData.youtube_link || null, // Store null if empty
        full_book_link: formData.full_book_link || null, // Store null if empty
        affiliate_links: formData.affiliate_links || null, // Store null if empty
      };

      console.log("Inserting idea data:", ideaData);

      const { data, error } = await supabase
        .from('business_ideas')
        .insert([ideaData])
        .select();

      if (error) {
        throw error;
      }

      setUploadProgress(100);
      setIsUploading(false);
      setUploadComplete(true);

      toast({
        title: "Upload Successful!",
        description: "Your business idea has been uploaded successfully.",
        variant: "default",
      });

      if (data && data.length > 0) {
        navigate(`/presentation/${data[0].id}`);
      } else {
        navigate('/dashboard');
      }

    } catch (err: any) {
      console.error('Error uploading:', err);
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        title: "Upload Failed",
        description: err.message || "There was an error uploading your presentation. Please try again.",
        variant: "destructive",
      });
    }
  }, [
    user, file, navigate, toast,
    formData.title, formData.category, formData.description, formData.tags,
    formData.difficulty, formData.market_size, formData.investment_needed, formData.timeline,
    formData.youtube_link, formData.full_book_link, formData.affiliate_links, // Include new fields in dependencies
    uploadFile
  ]);

  const handleNewUpload = () => {
    setFormData({
      title: '',
      category: '',
      description: '',
      tags: '',
      difficulty: '',
      market_size: '',
      investment_needed: '',
      timeline: '',
      youtube_link: '',
      full_book_link: '',
      affiliate_links: '',
    });
    setFile(null);
    setUploadComplete(false);
    setIsUploading(false);
    setUploadProgress(0);
  };

  const filteredCategories = categories.filter(cat => cat !== 'All');

  if (uploadComplete) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardContent className="p-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="font-montserrat font-bold text-2xl text-foreground mb-2">
                Upload Successful!
              </h2>
              <p className="font-roboto text-muted-foreground mb-6">
                Your business idea "{formData.title}" has been uploaded and is now available to the community.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-roboto"
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="font-montserrat font-bold text-3xl lg:text-4xl text-foreground mb-8 text-center">
          Upload New Business Idea
        </h1>
        <p className="font-roboto text-lg text-muted-foreground text-center mb-2">
          Share your presentation with the OGONJO community
        </p>
        <p className="font-roboto text-sm text-blue-500 text-center mt-2 mb-8">
          Note: Please upload PDF files for best viewing experience
        </p>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="font-montserrat text-xl">
                Presentation Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* File Upload (Presentation PDF) */}
                <div className="space-y-2">
                  <Label htmlFor="file-upload" className="font-roboto font-medium flex items-center">
                    <UploadIcon className="mr-2 h-5 w-5 text-primary" /> Presentation File (PDF) <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors hover:border-primary/50">
                    <input
                      type="file"
                      id="file-upload"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      required
                    />
                    <label htmlFor="file-upload" className="cursor-pointer block">
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
                  <Label htmlFor="title" className="font-roboto font-medium flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-primary" /> Idea Title <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="e.g., AI-Powered Personal Finance Assistant"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="font-roboto"
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category-select" className="font-roboto font-medium flex items-center">
                    <Zap className="mr-2 h-5 w-5 text-primary" /> Category <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange('category', value)}
                    required
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

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="font-roboto font-medium flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-primary" /> Idea Description <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this idea, its problem, solution, and unique selling points."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="font-roboto min-h-[100px]"
                    required
                  />
                </div>

                {/* New Fields: Difficulty, Market Size, Investment Needed, Timeline */}
                {/* Difficulty */}
                <div className="space-y-2">
                  <Label htmlFor="difficulty-select" className="font-roboto font-medium flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-primary" /> Difficulty <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => handleInputChange('difficulty', value)}
                    required
                  >
                    <SelectTrigger id="difficulty-select" className="font-roboto">
                      <SelectValue placeholder="Select difficulty level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner (Low Complexity)</SelectItem>
                      <SelectItem value="intermediate">Intermediate (Moderate Complexity)</SelectItem>
                      <SelectItem value="advanced">Advanced (High Complexity)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Market Size */}
                <div className="space-y-2">
                  <Label htmlFor="market-size" className="font-roboto font-medium flex items-center">
                    <DollarSign className="mr-2 h-5 w-5 text-primary" /> Market Size <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="market-size"
                    type="text"
                    placeholder="e.g., $100M+, Niche, Global"
                    value={formData.market_size}
                    onChange={(e) => handleInputChange('market_size', e.target.value)}
                    className="font-roboto"
                    required
                  />
                </div>

                {/* Investment Needed */}
                <div className="space-y-2">
                  <Label htmlFor="investment-needed" className="font-roboto font-medium flex items-center">
                    <DollarSign className="mr-2 h-5 w-5 text-primary" /> Investment Needed <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="investment-needed"
                    type="text"
                    placeholder="e.g., $5k - $20k, Minimal, $1M+"
                    value={formData.investment_needed}
                    onChange={(e) => handleInputChange('investment_needed', e.target.value)}
                    className="font-roboto"
                    required
                  />
                </div>

                {/* Timeline */}
                <div className="space-y-2">
                  <Label htmlFor="timeline" className="font-roboto font-medium flex items-center">
                    <Calendar className="mr-2 h-5 w-5 text-primary" /> Estimated Timeline <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="timeline"
                    type="text"
                    placeholder="e.g., 3-6 months, 1 year, Long-term"
                    value={formData.timeline}
                    onChange={(e) => handleInputChange('timeline', e.target.value)}
                    className="font-roboto"
                    required
                  />
                </div>

                {/* NEW: YouTube Video Link */}
                <div className="space-y-2">
                  <Label htmlFor="youtube-link" className="font-roboto font-medium flex items-center">
                    <Youtube className="mr-2 h-5 w-5 text-red-500" /> YouTube Video Link (Optional)
                  </Label>
                  <Input
                    id="youtube-link"
                    type="url" // Use type="url" for better validation
                    placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                    value={formData.youtube_link}
                    onChange={(e) => handleInputChange('youtube_link', e.target.value)}
                    className="font-roboto"
                  />
                  <p className="font-roboto text-xs text-muted-foreground">
                    Link to a relevant YouTube video for this idea.
                  </p>
                </div>

                {/* NEW: Full Book/Idea Explanation Link */}
                <div className="space-y-2">
                  <Label htmlFor="full-book-link" className="font-roboto font-medium flex items-center">
                    <Book className="mr-2 h-5 w-5 text-green-600" /> Full Idea/Book Link (Optional)
                  </Label>
                  <Input
                    id="full-book-link"
                    type="url"
                    placeholder="e.g., https://example.com/full-business-plan.pdf"
                    value={formData.full_book_link}
                    onChange={(e) => handleInputChange('full_book_link', e.target.value)}
                    className="font-roboto"
                  />
                  <p className="font-roboto text-xs text-muted-foreground">
                    Link to a comprehensive guide or full book on this business idea.
                  </p>
                </div>

                {/* NEW: Affiliate Book Recommendation Links */}
                <div className="space-y-2">
                  <Label htmlFor="affiliate-links" className="font-roboto font-medium flex items-center">
                    <Link className="mr-2 h-5 w-5 text-blue-600" /> Recommended Books (Affiliate Links, Optional)
                  </Label>
                  <Textarea
                    id="affiliate-links"
                    placeholder="Enter comma-separated affiliate links to recommended books. E.g., link1, link2, link3"
                    value={formData.affiliate_links}
                    onChange={(e) => handleInputChange('affiliate_links', e.target.value)}
                    className="font-roboto min-h-[80px]"
                  />
                  <p className="font-roboto text-xs text-muted-foreground">
                    Provide comma-separated URLs to books that strengthen knowledge for this business.
                  </p>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags" className="font-roboto font-medium flex items-center">
                    <Zap className="mr-2 h-5 w-5 text-primary" /> Tags <span className="text-muted-foreground text-sm ml-2">(comma-separated, optional)</span>
                  </Label>
                  <Input
                    id="tags"
                    type="text"
                    placeholder="e.g., AI, SaaS, Fintech, Mobile"
                    value={formData.tags}
                    onChange={(e) => handleInputChange('tags', e.target.value)}
                    className="font-roboto"
                  />
                  <p className="font-roboto text-xs text-muted-foreground">
                    Example: startup, technology, ai, retail
                  </p>
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
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center font-roboto"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Uploading... ({uploadProgress}%)
                    </>
                  ) : (
                    <>
                      <UploadIcon className="mr-2 h-5 w-5" />
                      Upload Idea
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Upload;
