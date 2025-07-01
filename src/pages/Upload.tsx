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
// REMOVED: Header and Footer imports as they are managed by MainLayout in App.tsx
import { categories } from '@/data/mockData';
import {
  Upload as UploadIcon, // Correctly imported as UploadIcon
  CheckCircle,
  FileText, // For title, description
  Zap, // For category, tags
  TrendingUp, // For difficulty
  DollarSign, // For market size, investment needed
  Calendar, // For timeline
  Loader2 // For uploading spinner
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Upload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    tags: '', // Comma-separated string
    difficulty: '', // New field
    market_size: '', // New field
    investment_needed: '', // New field (corrected from investment_nc)
    timeline: '', // New field
  });
  const [file, setFile] = useState<File | null>(null); // For presentation PDF
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Only allow PDF files
      <div className="my-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400">
  <p className="font-roboto text-sm">Advertisement</p> {/* You can keep this label or remove it */}
  <ins className="adsbygoogle"
       style={{ display: 'block', textAlign: 'center', minHeight: '100px' }} // Use React style object
       data-ad-client="ca-pub-7769353221684341"
       data-ad-slot="7980803429"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>
       (window.adsbygoogle = window.adsbygoogle || []).push({});
  </script>
</div>
      const validTypes = ['application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file.",
          variant: "destructive",
        });
        return;
      }

      // Check file size (10MB limit)
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
      // Add user ID to file path for better organization
      const fileName = `${user?.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      // FIX: Removed 'presentations/' prefix from filePath.
      // The .from('presentations') already specifies the bucket.
      const filePath = fileName; 

      setUploadProgress(20);

      const { error: uploadError } = await supabase.storage
        .from('presentations') // Correct bucket name
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      const { data } = supabase.storage
        .from('presentations') // Correct bucket name
        .getPublicUrl(filePath); // This will now generate the correct URL

      setUploadProgress(80);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Comprehensive validation for all fields, including new ones
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

      // Upload presentation file
      presentationUrl = await uploadFile(file);

      setUploadProgress(70);

      // Prepare tags as an array (even if input is comma-separated string)
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

      // Save business idea to database
      const ideaData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        difficulty: formData.difficulty,
        market_size: formData.market_size,
        investment_needed: formData.investment_needed,
        timeline: formData.timeline,
        tags: tagsArray, // Store as array
        // Hardcoded thumbnail as per your provided snippet's original structure
        thumbnail_url: null,
        presentation_url: presentationUrl,
        author_id: user.id,
        created_by: user.id, // Ensure this is user.id (UUID)
        views: 0,
        likes: 0,
        comments: 0,
        is_featured: false,
      };

      // DEBUG: Log before insert
      console.log("Inserting idea data:", ideaData);

      const { data, error } = await supabase
        .from('business_ideas')
        .insert([ideaData])
        .select(); // Use .select() to get the inserted row back

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

      // Navigate to the new idea's presentation page
      if (data && data.length > 0) {
        navigate(`/presentation/${data[0].id}`);
      } else {
        navigate('/dashboard'); // Fallback if no data returned
      }

    } catch (err: any) {
      console.error('Error uploading:', err);
      setIsUploading(false);
      setUploadProgress(0); // Reset progress on error
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
    });
    setFile(null);
    setUploadComplete(false);
    setIsUploading(false); // Ensure uploading state is reset
    setUploadProgress(0);
  };

  const filteredCategories = categories.filter(cat => cat !== 'All');

  if (uploadComplete) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header and Footer are provided by MainLayout */}
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardContent className="p-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" /> {/* Use a specific green color */}
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
      {/* Header and Footer are provided by MainLayout */}
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
                {/* File Upload (Presentation PDF) */}
                <div className="space-y-2">
                  <Label htmlFor="file-upload" className="font-roboto font-medium flex items-center">
                    <UploadIcon className="mr-2 h-5 w-5 text-primary" /> Presentation File (PDF) <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors hover:border-primary/50">
                    <input
                      type="file"
                      id="file-upload"
                      accept=".pdf" // Only accept PDF
                      onChange={handleFileChange}
                      className="hidden"
                      required // Make sure presentation file is required
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

                <div className="my-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400">
  <p className="font-roboto text-sm">Advertisement</p> {/* You can keep this label or remove it */}
  <ins className="adsbygoogle"
       style={{ display: 'block', textAlign: 'center', minHeight: '100px' }} // Use React style object
       data-ad-client="ca-pub-7769353221684341"
       data-ad-slot="7980803429"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>
       (window.adsbygoogle = window.adsbygoogle || []).push({});
  </script>
</div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Upload;
