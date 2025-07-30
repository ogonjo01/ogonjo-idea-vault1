// src/pages/Presentation.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import PresentationHeader from '@/components/PresentationHeader';
import CommentsSection from '@/components/CommentsSection';
import Recommendations from '@/components/Recommendations';
import AdBanner from '@/components/AdBanner';
import {
  ChevronLeft,
  Download as DownloadIcon,
  FileWarning,
  Maximize2,
  Minimize2,
  Eye,
  Heart,
  Lightbulb, // Icon for AI feature
  Loader2, // Icon for loading state
  ExternalLink, // Added for open in new tab
  RefreshCw, // Added for retry load
  Youtube, // Added for YouTube link
  Book, // Added for full book link
  Link // Added for affiliate links
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/services/supabase';
import { BusinessIdea } from '@/types/businessIdea';
import { useAuth } from '@/pages/Auth';
import { useBusinessIdeas } from '@/hooks/useBusinessIdeas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Added Card imports

// Correctly set the PDF.js worker source for Vite
// IMPORTANT: Ensure 'pdf.worker.min.js' is located directly in your project's 'public' directory.
// If it's in a subfolder (e.g., 'public/pdfjs/'), adjust the path accordingly (e.g., '/pdfjs/pdf.worker.min.js').
try {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    '/pdf.worker.min.js',
    import.meta.url,
  ).toString();
} catch (e) {
  console.error("Error setting PDF.js worker source:", e);
  // Fallback or user notification could be added here if this causes a critical issue
}


const ADS_INTERVAL = 3; // Show an ad after every N pages (e.g., every 3 pages)

// Define a type for the AI-generated idea expansion
type IdeaExpansion = {
  targetMarkets: string[];
  revenueModels: string[];
  challenges: string[];
  nextSteps: string[];
};

const Presentation = () => {
  const { id: ideaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incrementView } = useBusinessIdeas();
  const { user } = useAuth();
  const { toast } = useToast();

  const [idea, setIdea] = useState<BusinessIdea | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [presentationUrl, setPresentationUrl] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [pdfWidth, setPdfWidth] = useState(600); // Initial width, adjusted by useEffect
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfLoadAttempt, setPdfLoadAttempt] = useState(0);
  const [isPdfSupported, setIsPdfSupported] = useState(true); // Retained, though mostly for initial check
  const [debugInfo, setDebugInfo] = useState(''); // Retained for debugging

  // Gemini AI Feature States
  const [isGeneratingIdeaExpansion, setIsGeneratingIdeaExpansion] = useState(false);
  const [ideaExpansion, setIdeaExpansion] = useState<IdeaExpansion | null>(null);
  const [showIdeaExpansionModal, setShowIdeaExpansionModal] = useState(false);

  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
  }), []);

  // Parse affiliate links (memoized)
  const affiliateLinksArray = useMemo(() => {
    if (idea?.affiliate_links) {
      return idea.affiliate_links.split(',').map(link => link.trim()).filter(link => link.length > 0);
    }
    return [];
  }, [idea?.affiliate_links]);

  // Helper to render external links
  const renderExternalLink = useCallback((url: string, label: string, icon: React.ElementType) => {
    if (!url) return null;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:underline font-roboto text-sm">
        {React.createElement(icon, { className: "mr-2 h-4 w-4" })} {label}
      </a>
    );
  }, []);

  // Effect to update PDF width on container resize
  useEffect(() => {
    const updateWidth = () => {
      if (pdfContainerRef.current) {
        // Calculate pdfWidth based on the actual clientWidth of the container.
        // For non-fullscreen, we want the PDF page to fit within this inner space.
        // For fullscreen, use the full window width, and the PDF.js Page component will scale.
        const newWidth = isFullscreen
          ? window.innerWidth // In fullscreen, use full window width for the page
          : pdfContainerRef.current.clientWidth; // Use the exact clientWidth of the PDF container
        setPdfWidth(newWidth);
      }
    };

    const resizeObserver = new ResizeObserver(() => updateWidth());
    if (pdfContainerRef.current) {
      resizeObserver.observe(pdfContainerRef.current);
    }
    window.addEventListener('resize', updateWidth);

    updateWidth();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [isFullscreen]);

  // Effect to listen for browser fullscreen changes (e.g., pressing Escape key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Function to re-fetch idea details (including updated likes/comments)
  // This function is now more robust in fetching the 'isLiked' status.
  const refetchIdea = useCallback(async () => {
    if (!ideaId) return;
    try {
      const { data: ideaData, error: ideaError } = await supabase
        .from('business_ideas')
        .select(`
          *,
          idea_likes(user_id)
        `)
        .eq('id', ideaId)
        .single();

      if (ideaError) {
        console.error("Error refetching idea:", ideaError.message);
        return;
      }

      const isLikedByCurrentUser = user
        ? (ideaData.idea_likes as { user_id: string }[]).some((like: { user_id: string }) => like.user_id === user.id)
        : false;

      // Construct the updated idea object, including the isLiked status
      const updatedIdea: BusinessIdea = {
        ...ideaData,
        isLiked: isLikedByCurrentUser,
      };

      setIdea(updatedIdea);
    } catch (error: any) {
      console.error("Unexpected error during idea refetch:", error.message);
    }
  }, [ideaId, user]);


  // Fetch idea details and comments - using useCallback for stability
  const fetchIdeaAndComments = useCallback(async () => {
    setIsFetching(true);
    if (!ideaId) {
      toast({ title: 'Error', description: 'Idea ID is missing.', variant: 'destructive' });
      setIsFetching(false);
      return;
    }

    try {
      // Fetch idea data along with user-specific like status
      const { data: ideaData, error: ideaError } = await supabase
        .from('business_ideas')
        .select(`
          *,
          idea_likes(user_id)
        `) // Select all columns and also the user_id from idea_likes
        .eq('id', ideaId)
        .single();

      if (ideaError || !ideaData) {
        toast({ title: 'Error loading idea', description: ideaError?.message || 'Idea not found.', variant: 'destructive' });
        setIsFetching(false);
        return;
      }

      // Determine if the current user has liked this idea
      const isLikedByCurrentUser = user
        ? (ideaData.idea_likes as { user_id: string }[]).some((like: { user_id: string }) => like.user_id === user.id)
        : false;

      // Set the idea state, including the new 'isLiked' property
      setIdea({ ...ideaData, isLiked: isLikedByCurrentUser } as BusinessIdea);
      setPresentationUrl(ideaData.presentation_url);

      await incrementView(ideaData.id); // Await the incrementView call

      // Fetch actual comments for the CommentsSection
      const { data: commentData, error: commentsError } = await supabase
        .from('idea_comments') // Using 'idea_comments' table as per previous discussions
        .select(`
          id, content, created_at,
          profiles(full_name, email)
        `)
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: false });

      if (commentsError) {
        console.error("Error fetching comments:", commentsError.message);
      }
      setComments(commentData || []);

    } catch (error: any) {
      console.error('Fetch error:', error.message);
      toast({ title: 'Error', description: error.message || 'Failed to load data.', variant: 'destructive' });
    } finally {
      setIsFetching(false);
    }
  }, [ideaId, incrementView, toast, user]); // Added 'user' to dependencies


  // Effect to trigger the initial data fetch
  useEffect(() => {
    fetchIdeaAndComments();
  }, [fetchIdeaAndComments]);


  const handleLike = useCallback(async () => {
    if (!idea || !user) {
      toast({ title: 'Login Required', description: 'Please log in to like ideas.', variant: 'default' });
      navigate('/auth?auth=true'); // Redirect to auth page
      return;
    }

    try {
      // Check if the user has already liked this idea
      const { data: existingLike, error: checkError } = await supabase
        .from('idea_likes')
        .select('id')
        .eq('idea_id', idea.id)
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means "no rows found"
        throw checkError;
      }

      if (existingLike) {
        // User has already liked, so unlike it
        const { error: deleteError } = await supabase
          .from('idea_likes')
          .delete()
          .eq('id', existingLike.id);

        if (deleteError) throw deleteError;
        toast({ title: 'Unliked!', description: 'You unliked this idea.' });
      } else {
        // User has not liked, so like it
        const { error: insertError } = await supabase
          .from('idea_likes')
          .insert({ idea_id: idea.id, user_id: user.id });

        if (insertError) throw insertError;
        toast({ title: 'Liked!', description: 'You liked this idea.' });
      }

      // After like/unlike, re-fetch the idea to get updated counts from the DB
      // This will also correctly update the 'isLiked' status on the idea object.
      await refetchIdea();

    } catch (error: any) {
      console.error('Error toggling like:', error.message);
      toast({
        title: "Like Error",
        description: error.message || "Failed to update like status.",
        variant: "destructive"
      });
    }
  }, [idea, user, toast, navigate, refetchIdea]);


  const handleAddComment = useCallback(async (text: string) => {
    if (!user || !idea) {
      toast({ title: 'Login Required', description: 'Please log in to add comments.', variant: 'default' });
      navigate('/auth?auth=true');
      return;
    }
    const { data, error } = await supabase.from('idea_comments') // Ensure correct table name
      .insert([{ content: text, idea_id: idea.id, user_id: user.id }])
      .select(`
        id, content, created_at,
        profiles(full_name, email)
      `); // Select to get the full comment object including profile

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else if (data && data.length > 0) {
      setComments(prev => [data[0], ...prev]); // Add new comment to state
      // After adding comment, re-fetch the idea to get updated counts from the DB
      await refetchIdea();
      toast({ title: 'Comment added', description: 'Your comment has been posted.' });
    }
  }, [idea, user, toast, navigate, refetchIdea]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfLoading(false);
    setPdfError(null);
    setPdfLoadAttempt(0);
  }, []);

  const handlePdfError = useCallback((err: any) => {
    console.error('PDF.js error:', err);

    let errorMessage = 'Failed to load PDF. The file may be corrupted or in an unsupported format.';

    if (err?.message?.includes('file format')) {
      errorMessage = 'Invalid PDF format. The file may be corrupted.';
    } else if (err?.name === 'InvalidPDFException') {
      errorMessage = 'The PDF file is invalid or corrupted.';
    } else if (err?.message?.includes('network')) {
      errorMessage = 'Network error loading PDF. Please check your connection.';
    } else if (err?.message?.includes('worker') ||
      err?.message?.includes('version') ||
      err?.message?.includes('pdf.worker')) {
      errorMessage = 'Failed to initialize PDF viewer. Please try refreshing the page.';
    } else if (err?.name === 'UnknownErrorException') {
      errorMessage = 'PDF viewer compatibility issue. Please try reloading the page.';
    }

    setPdfError(errorMessage);
    setPdfLoading(false);
  }, []);

  const retryPdfLoad = useCallback(() => {
    if (pdfLoadAttempt < 2) {
      setPdfLoadAttempt(prev => prev + 1);
      setPdfLoading(true);
      setPdfError(null);
      // Re-fetch the idea to try loading the PDF again
      supabase.from('business_ideas').select('presentation_url').eq('id', ideaId).single()
        .then(({ data }) => {
          if (data?.presentation_url) {
            setPresentationUrl(data.presentation_url);
          } else {
            setPdfError("No presentation URL found on retry.");
            setPdfLoading(false);
          }
        })
        .catch((err) => {
          console.error("Retry PDF load error:", err);
          setPdfError("Failed to re-fetch presentation URL.");
          setPdfLoading(false);
        });
    } else {
      toast({
        title: "PDF Loading Failed",
        description: "Could not load PDF after multiple attempts. Try opening in a new tab.",
        variant: "destructive"
      });
    }
  }, [pdfLoadAttempt, ideaId, toast]);


  const handleDownload = useCallback(async () => {
    // Check if user is logged in before allowing download
    if (!user) {
      toast({ title: 'Login Required', description: 'Please log in to download presentations.', variant: 'default' });
      navigate('/auth?auth=true'); // Redirect to auth page
      return;
    }

    if (!presentationUrl) {
      toast({title: "Download Error", description: "No presentation file available for download.", variant: "destructive"});
      return;
    }
    const link = document.createElement('a');
    link.href = presentationUrl;
    link.download = `${idea?.title.replace(/\s+/g, '_') || 'presentation'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Download started",
      description: "Your PDF presentation is downloading",
    });
  }, [presentationUrl, idea?.title, toast, user, navigate]);

  const createPresentation = useCallback(() => {
    navigate(`/presentations/create?ideaId=${ideaId}`);
  }, [navigate, ideaId]);

  const handleFullscreen = useCallback(() => {
    if (pdfContainerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        pdfContainerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen: ${err.message} (${err.name})`);
          toast({ title: "Fullscreen Error", description: "Failed to enter fullscreen mode.", variant: "destructive" });
        });
      }
    }
  }, [toast]);

  // ✨ Gemini AI Feature: Generate Idea Expansion
  const generateIdeaExpansion = useCallback(async () => {
    if (!idea) {
      toast({ title: "Error", description: "No business idea loaded to expand.", variant: "destructive" });
      return;
    }
    // Check if user is logged in before allowing AI expansion
    if (!user) {
      toast({ title: 'Login Required', description: 'Please log in to use AI features.', variant: 'default' });
      navigate('/auth?auth=true'); // Redirect to auth page
      return;
    }


    setIsGeneratingIdeaExpansion(true);
    setIdeaExpansion(null); // Clear previous expansion
    setShowIdeaExpansionModal(true); // Open modal immediately to show loading

    try {
      const prompt = `Given the business idea "${idea.title}" with the description "${idea.description}", provide an expansion focusing on:
      1. Potential Target Markets (list 3-5 distinct groups)
      2. Key Revenue Models (list 3-5 ways this idea could make money)
      3. Main Challenges/Risks (list 3-5 significant hurdles or risks)
      4. Next Steps for Development (list 3-5 actionable steps to get started)

      Format your response as a JSON object with the following structure:
      {
        "targetMarkets": ["string"],
        "revenueModels": ["string"],
        "challenges": ["string"],
        "nextSteps": ["string"]
      }`;

      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const payload = {
        contents: chatHistory,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              targetMarkets: { type: "ARRAY", items: { type: "STRING" } },
              revenueModels: { type: "ARRAY", items: { type: "STRING" } },
              challenges: { type: "ARRAY", items: { type: "STRING" } },
              nextSteps: { type: "ARRAY", items: { type: "STRING" } },
            },
            required: ["targetMarkets", "revenueModels", "challenges", "nextSteps"]
          }
        }
      };

      const apiKey = ""; // Canvas will automatically provide this at runtime
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      console.log("Gemini API Response:", result);

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const jsonString = result.candidates[0].content.parts[0].text;
        const parsedJson: IdeaExpansion = JSON.parse(jsonString);
        setIdeaExpansion(parsedJson);
      } else {
        throw new Error("No content found in Gemini API response.");
      }

    } catch (error: any) {
      console.error("Error generating idea expansion:", error);
      toast({
        title: "AI Generation Failed",
        description: error.message || "Could not expand idea. Please try again.",
        variant: "destructive"
      });
      setIdeaExpansion(null); // Ensure no old data is shown
    } finally {
      setIsGeneratingIdeaExpansion(false);
    }
  }, [idea, toast, user, navigate]);


  // --- Render Logic ---

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-roboto text-muted-foreground">Loading idea and presentation...</p>
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <FileWarning className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2 font-montserrat">Idea Not Found</h2>
        <p className="text-muted-foreground mb-6 font-roboto">
          The requested business idea doesn't exist or an error occurred.
        </p>
        <Button onClick={() => navigate('/')} className="font-roboto"> {/* Navigate to new Dashboard landing */}
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div> {/* MainLayout in App.tsx provides min-h-screen, flex-col, bg-background */}
      <main className="flex-1 container mx-auto px-4 py-8 overflow-x-hidden">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 font-roboto text-primary hover:text-primary/80"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Presentation Header with Download + Like */}
        <PresentationHeader
          idea={idea}
          onLike={handleLike}
          onDownload={handleDownload}
        />

        {/* New AI Feature Button */}
        <div className="flex justify-end mb-4">
          <Button
            onClick={generateIdeaExpansion}
            disabled={isGeneratingIdeaExpansion}
            className="bg-purple-600 hover:bg-purple-700 text-white font-roboto shadow-md transition-all duration-200 ease-in-out transform hover:scale-105"
          >
            {isGeneratingIdeaExpansion ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Expanding Idea...
              </>
            ) : (
              <>
                <Lightbulb className="mr-2 h-4 w-4" />
                ✨ Expand Idea with AI
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8"> {/* Adjusted grid layout */}
          {/* Main PDF Viewer Section (takes 2/3 width) */}
          <section className={`md:col-span-2 flex flex-col bg-white rounded-lg shadow overflow-hidden relative
            ${isFullscreen ? 'fixed inset-0 z-[1000] bg-background flex flex-col items-center justify-center' : ''}`}
            style={isFullscreen ? { width: '100vw', height: '100vh', top: 0, left: 0 } : {}}>

            {/* Fullscreen Toggle Button and Text */}
            <div className="absolute z-50 top-4 right-4 flex items-center space-x-2">
              <span className={`text-sm font-roboto hidden sm:block ${isFullscreen ? 'text-white' : 'text-gray-700'}`}>
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </span>
              <Button
                onClick={handleFullscreen}
                className={`p-2 rounded-full transition-all duration-200 ease-in-out
                  ${isFullscreen ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white shadow-md text-gray-800 hover:bg-gray-100'}`}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </Button>
            </div>

            <div ref={pdfContainerRef} className={`flex-1 ${isFullscreen ? 'overflow-auto p-0' : 'overflow-y-auto p-4'}`}
              style={isFullscreen ? { flex: 1 } : { maxHeight: '80vh' }}>

              {pdfLoading && !pdfError && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-[5]">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="ml-2 text-muted-foreground">Loading PDF...</p>
                </div>
              )}

              {pdfError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 z-[5] p-4 text-center">
                  <FileWarning className="w-12 h-12 text-red-500 mb-4" />
                  <p className="text-foreground text-lg mb-4">{pdfError}</p>
                  <Button onClick={retryPdfLoad}><RefreshCw className="mr-2" /> Retry Load</Button>
                </div>
              ) : (
                presentationUrl ? (
                  <Document
                    file={presentationUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={handlePdfError}
                    onSourceError={handlePdfError}
                    options={pdfOptions}
                    className={`w-full ${isFullscreen ? 'flex-1 overflow-auto' : ''}`}
                  >
                    <div className={`flex flex-col items-center ${isFullscreen ? 'gap-0.5' : 'gap-6'}`}>
                      {Array.from({ length: numPages }, (_, idx) => {
                        const pageNumber = idx + 1;
                        return (
                          <React.Fragment key={pageNumber}>
                            <Page
                              pageNumber={pageNumber}
                              width={pdfWidth}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              className={`mx-auto ${isFullscreen ? 'my-0.5' : 'my-2'} shadow-lg border border-border`}
                            />
                            {(pageNumber % ADS_INTERVAL === 0) && (pageNumber !== numPages) && (
                              <AdBanner page={pageNumber} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </Document>
                ) : (
                  <div className="p-8 bg-card rounded-lg text-center text-muted-foreground font-roboto">
                    No presentation file uploaded for this idea.
                  </div>
                )
              )}
            </div>
          </section>

          {/* Sidebar for Idea Details, Recommendations, Comments, and New Links */}
          <aside className="md:col-span-1 flex flex-col space-y-6">
            {/* Idea Details */}
            <Card className="p-6 rounded-lg shadow-md space-y-4 font-roboto text-foreground">
              <CardTitle className="font-montserrat text-xl font-semibold mb-3">Idea Details</CardTitle>
              <p className="text-sm">
                <strong className="text-foreground">Category:</strong> {idea.category}<br/>
                <strong className="text-foreground">Difficulty:</strong> {idea.difficulty}<br/>
                <strong className="text-foreground">Market Size:</strong> {idea.market_size}<br/>
                <strong className="text-foreground">Investment Needed:</strong> {idea.investment_needed}<br/>
                <strong className="text-foreground">Timeline:</strong> {idea.timeline}<br/>
                <strong className="text-foreground">Tags:</strong>
                {Array.isArray(idea.tags)
                  ? idea.tags.join(', ')
                  : (typeof idea.tags === 'string'
                      ? idea.tags
                      : 'N/A'
                    )
                }
                <br/>
                <strong className="text-foreground">Views:</strong> <Eye className="inline h-4 w-4 mr-1 text-muted-foreground" />{idea.views || 0}<br/>
                <strong className="text-foreground">Likes:</strong> <Heart className="inline h-4 w-4 mr-1 text-red-500" />{idea.likes || 0}<br/>
                <strong className="text-foreground">Featured:</strong> {idea.is_featured ? 'Yes' : 'No'}<br/>
                {user && (
                  <>
                    <strong className="text-foreground">Author ID:</strong> {idea.author_id ? idea.author_id.substring(0, 8) + '...' : 'N/A'}
                  </>
                )}
              </p>
            </Card>

                   {/* NEW: Full Book/Idea Explanation Link Card */}
            {idea.full_book_link && (
              <Card className="p-6 rounded-lg shadow-md">
                <CardTitle className="font-montserrat text-xl font-semibold mb-3 flex items-center">
                  <Book className="mr-2 h-5 w-5 text-green-700" /> Comprehensive Guide
                </CardTitle>
                <CardDescription className="font-roboto text-muted-foreground mb-3">
                  Unlock in-depth strategies, actionable steps, and expert insights with this comprehensive guide. Perfect for entrepreneurs ready to take the next step!
                </CardDescription>
                <Button
                  onClick={() => window.open(idea.full_book_link!, '_blank')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-roboto"
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> Buy Complete Business Idea
                </Button>
                <p className="mt-3 text-xs text-muted-foreground font-roboto italic">
                  Disclosure: This is an affiliate link. We may earn a commission if you make a purchase through this link, at no extra cost to you.
                </p>
              </Card>
            )}
            
            {/* NEW: YouTube Video Link Card */}
            {idea.youtube_link && (
              <Card className="p-6 rounded-lg shadow-md">
                <CardTitle className="font-montserrat text-xl font-semibold mb-3 flex items-center">
                  <Youtube className="mr-2 h-5 w-5 text-red-600" /> Related Video
                </CardTitle>
                <div className="aspect-video w-full rounded-md overflow-hidden bg-black flex items-center justify-center">
                  {/* Basic YouTube Embed - consider more robust solutions for production */}
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${idea.youtube_link.split('v=')[1]?.split('&')[0] || idea.youtube_link.split('/').pop()}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <p className="text-sm text-muted-foreground mt-3 font-roboto">
                  Watch a video related to this business idea.
                </p>
                {renderExternalLink(idea.youtube_link, 'Open on YouTube', ExternalLink)}
              </Card>
            )}

           

            {/* NEW: Affiliate Book Recommendation Links Card */}
            {affiliateLinksArray.length > 0 && (
                <Card className="p-6 rounded-lg shadow-md">
                <CardTitle className="font-montserrat text-xl font-semibold mb-3 flex items-center">
                  <Link className="mr-2 h-5 w-5 text-blue-700" /> Recommended Books
                </CardTitle>
                <CardDescription className="font-roboto text-muted-foreground mb-3">
                  Explore these handpicked books to deepen your expertise and accelerate your business journey.
                </CardDescription>
                <ul className="space-y-3">
                  {affiliateLinksArray.map((link, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold mr-2">
                    {index + 1}
                    </span>
                    <div className="flex-1">
                    {renderExternalLink(link, `Book Recommendation ${index + 1}`, ExternalLink)}
                    <span className="ml-2 text-xs text-muted-foreground italic">(Affiliate link)</span>
                    </div>
                  </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground font-roboto italic">
                  We may earn a commission if you purchase through these links, at no extra cost to you.
                </p>
                </Card>
            )}

            {/* Recommendations Section */}
            <Card className="sticky top-20 p-6 rounded-lg shadow-md">
              <CardTitle className="font-montserrat text-xl font-semibold mb-4">Similar Ideas</CardTitle>
              <Recommendations
                currentIdeaId={idea.id}
                currentIdeaCategory={idea.category}
                currentIdeaTags={Array.isArray(idea.tags) ? idea.tags : []}
              />
            </Card>

            {/* Comments Section */}
            <CommentsSection
              comments={comments}
              // Use idea.comments for the count
              ideaCommentsCount={idea.comments || 0}
              onCommentSubmit={handleAddComment}
            />
          </aside>
        </div>
      </main>

      {/* ✨ Gemini AI Feature: Idea Expansion Modal */}
      <Dialog open={showIdeaExpansionModal} onOpenChange={setShowIdeaExpansionModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-montserrat text-2xl">✨ AI Idea Expansion: {idea?.title}</DialogTitle>
            <DialogDescription className="font-roboto text-muted-foreground">
              AI-generated insights to help you develop this business idea further.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 p-4 -mx-4 -mb-4">
            {isGeneratingIdeaExpansion ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                <p className="font-roboto">Generating insights...</p>
                <p className="font-roboto text-sm mt-1">This might take a moment.</p>
              </div>
            ) : ideaExpansion ? (
              <div className="space-y-6 font-roboto text-foreground">
                <div>
                  <h3 className="font-semibold text-lg text-primary mb-2">Potential Target Markets</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {ideaExpansion.targetMarkets.map((market, index) => (
                      <li key={index}>{market}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-primary mb-2">Key Revenue Models</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {ideaExpansion.revenueModels.map((model, index) => (
                      <li key={index}>{model}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-primary mb-2">Main Challenges/Risks</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {ideaExpansion.challenges.map((challenge, index) => (
                      <li key={index}>{challenge}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-primary mb-2">Next Steps for Development</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {ideaExpansion.nextSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p className="font-roboto">No expansion generated yet. Click "Expand Idea with AI" to get started!</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Presentation;
