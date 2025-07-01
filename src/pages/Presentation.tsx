// src/pages/Presentation.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
// Ensure these CSS imports are correct based on your node_modules
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

import { Button } from '@/components/ui/button';
// REMOVED: import Header from '@/components/Header'; // Header is now provided by MainLayout
// REMOVED: import Footer from '@/components/Footer'; // Footer is now provided by MainLayout
import PresentationHeader from '@/components/PresentationHeader'; // Assuming this component exists and takes props
import CommentsSection from '@/components/CommentsSection'; // Assuming this component exists and takes props
import Recommendations from '@/components/Recommendations'; // Assuming this component exists and takes props
import AdBanner from '@/components/AdBanner'; // Assuming this component exists and takes page prop
import {
  ChevronLeft,
  Download as DownloadIcon,
  FileWarning,
  Maximize2,
  Minimize2,
  Eye, // Added Eye icon for views display
  Heart, // Added Heart icon for likes display
  Lightbulb, // Icon for AI feature
  Loader2, // Icon for loading state
  ExternalLink, // Added for open in new tab
  RefreshCw // Added for retry load
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { BusinessIdea } from '@/types/businessIdea'; // Correctly import the BusinessIdea type
import { useAuth } from '@/hooks/useAuth';
import { useBusinessIdeas } from '@/hooks/useBusinessIdeas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

// FIX: Correctly set the PDF.js worker source for Vite
// The URL constructor ensures the path is resolved correctly relative to the public directory.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  '/pdf.worker.min.js', // This path MUST be correct relative to your public/ directory
  import.meta.url,
).toString();

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
  const { incrementView } = useBusinessIdeas(); // Assuming this hook handles RPC call for views
  const { user } = useAuth(); // To check if user is logged in for author display
  const { toast } = useToast();

  const [idea, setIdea] = useState<BusinessIdea | null>(null);
  const [comments, setComments] = useState<any[]>([]); // Assuming comments structure from DB
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [presentationUrl, setPresentationUrl] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true); // For initial data fetch
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [pdfWidth, setPdfWidth] = useState(600); // Initial PDF width, updated by resize observer
  const [isFullscreen, setIsFullscreen] = useState(false); // State for fullscreen mode
  const [pdfLoadAttempt, setPdfLoadAttempt] = useState(0); // For retry logic

  // Gemini AI Feature States
  const [isGeneratingIdeaExpansion, setIsGeneratingIdeaExpansion] = useState(false);
  const [ideaExpansion, setIdeaExpansion] = useState<IdeaExpansion | null>(null);
  const [showIdeaExpansionModal, setShowIdeaExpansionModal] = useState(false);


  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
  }), []);

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

  // Fetch idea details and comments - using useCallback for stability
  useEffect(() => {
    const fetchIdeaAndComments = async () => {
      setIsFetching(true);
      if (!ideaId) {
        toast({ title: 'Error', description: 'Idea ID is missing.', variant: 'destructive' });
        setIsFetching(false);
        return;
      }

      try {
        const { data: ideaData, error: ideaError } = await supabase
          .from('business_ideas')
          .select('*') // Select all columns to get all necessary fields
          .eq('id', ideaId)
          .single();

        if (ideaError || !ideaData) {
          toast({ title: 'Error loading idea', description: ideaError?.message || 'Idea not found.', variant: 'destructive' });
          setIsFetching(false);
          return;
        }

        setIdea(ideaData as BusinessIdea); // Cast to BusinessIdea type
        setPresentationUrl(ideaData.presentation_url);

        // FIX 1.1: Await incrementView if it returns a Promise, or ensure it's not expected to.
        // Based on the assumed useBusinessIdeas, it's now async and should be awaited.
        await incrementView(ideaData.id); // Await the incrementView call


        const { data: commentData, error: commentsError } = await supabase
          .from('comments')
          .select(`
            id, content, created_at,
            profiles(full_name, email)
          `)
          .eq('idea_id', ideaId)
          .order('created_at', { ascending: false });

        if (commentsError) {
          console.error("Error fetching comments:", commentsError.message);
          // Don't block page if comments fail
        }
        setComments(commentData || []);

      } catch (error: any) {
        console.error('Fetch error:', error.message);
        toast({ title: 'Error', description: error.message || 'Failed to load data.', variant: 'destructive' });
      } finally {
        setIsFetching(false);
      }
    };
    fetchIdeaAndComments();
  }, [ideaId, incrementView, toast]);


  const handleLike = async () => {
    if (!idea || !user) {
      toast({ title: 'Login Required', description: 'Please log in to like ideas.', variant: 'default' });
      navigate('/auth?auth=true'); // Redirect to auth page
      return;
    }
    // Implement actual like/unlike logic here with Supabase 'likes' table
    // For now, just a toast
    toast({ title: 'Liked!', description: 'You liked the idea. (Feature not fully implemented yet)', variant: 'default' });
  };

  const handleAddComment = useCallback(async (text: string) => {
    if (!user || !idea) {
      toast({ title: 'Login Required', description: 'Please log in to add comments.', variant: 'default' });
      navigate('/auth?auth=true'); // Redirect to auth page
      return;
    }
    const { data, error } = await supabase.from('comments')
      .insert([{ content: text, idea_id: idea.id, user_id: user.id }])
      .select(); // .select() to get the inserted row back
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else if (data) {
      setComments(prev => [data[0], ...prev]); // Add new comment to state
      toast({ title: 'Comment added', description: 'Your comment has been posted.' });
    }
  }, [idea, user, toast, navigate]);

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
        .catch((err) => { // This catch block for the .then().catch() ensures async errors are handled
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
    if (!user) {
      toast({ title: 'Login Required', description: 'Please log in to download presentations.', variant: 'default' });
      navigate('/auth?auth=true');
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
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-roboto text-muted-foreground">Loading idea and presentation...</p>
        </div>
      </div>
    );
  }
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
  if (!idea) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        {/* REMOVED: <Header /> */}
        <FileWarning className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Idea Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The requested business idea doesn't exist or an error occurred.
        </p>
        <Button onClick={() => navigate('/dashboard')}> {/* Navigate to new Dashboard landing */}
          Back to Dashboard
        </Button>
        {/* REMOVED: <Footer /> */}
      </div>
    );
  }

  return (
    <div> {/* MainLayout in App.tsx provides min-h-screen, flex-col, bg-background */}
      {/* REMOVED: <Header showSearch /> */} {/* Header is provided by MainLayout */}

      <main className="flex-1 container mx-auto px-4 py-8 overflow-x-hidden">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6 font-roboto"
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
          <section className={`md:col-span-2 flex flex-col bg-white rounded-lg shadow overflow-hidden relative
            ${isFullscreen ? 'fixed inset-0 z-[1000] bg-background flex flex-col items-center justify-center' : ''}`}
            style={isFullscreen ? { width: '100vw', height: '100vh', top: 0, left: 0 } : {}}>

            {/* Fullscreen Toggle Button and Text - MOVED OUTSIDE pdfContainerRef */}
            <div className="absolute z-50 top-4 right-4 flex items-center space-x-2">
              <span className={`text-sm font-roboto hidden sm:block ${isFullscreen ? 'text-white' : 'text-gray-700'}`}>
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} {/* Dynamic text label */}
              </span>
              <Button
                onClick={handleFullscreen} // Use the correct toggle function
                // Use a more robust background for visibility
                className={`p-2 rounded-full transition-all duration-200 ease-in-out
                  ${isFullscreen ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white shadow-md text-gray-800 hover:bg-gray-100'}`}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </Button>
            </div>

            {/* PDF Container */}
            <div
              ref={pdfContainerRef}
              className={`flex-1 ${isFullscreen ? 'overflow-auto p-0' : 'overflow-y-auto p-4'}`}
              style={isFullscreen ? { flex: 1 } : { maxHeight: '80vh' }}
            >
              {/* Loading Overlay */}
              {pdfLoading && !pdfError && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-[5]">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-muted-foreground">Loading PDF...</p>
                  </div>
                </div>
              )}

              {/* Error Overlay */}
              {pdfError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30 z-[5] p-4 text-center">
                  <FileWarning className="w-10 h-10 text-red-500 mb-3" />
                  <p className="text-foreground mb-4">{pdfError}</p>
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
                  <div className="p-8 bg-card rounded-lg text-center text-muted-foreground">
                    No presentation file uploaded for this idea.
                  </div>
                )
              )}
            </div>
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
          </section>

          {/* Sidebar for Idea Details, Recommendations, Comments */}
          <aside className="md:col-span-1 flex flex-col space-y-6">
            {/* Idea Details */}
            <div className="p-4 bg-white rounded-lg shadow">
              <h2 className="font-semibold mb-2">Idea Details</h2>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Category:</strong> {idea.category}<br/>
                <strong className="text-foreground">Difficulty:</strong> {idea.difficulty}<br/>
                <strong className="text-foreground">Market Size:</strong> {idea.market_size}<br/>
                <strong className="text-foreground">Investment Needed:</strong> {idea.investment_needed}<br/>
                <strong className="text-foreground">Timeline:</strong> {idea.timeline}<br/>
                <strong className="text-foreground">Tags:</strong>
                {Array.isArray(idea.tags)
                  ? idea.tags.join(', ')
                  : (typeof idea.tags === 'string'
                      ? idea.tags // If it's a string, display as is (e.g., "tag1,tag2")
                      : 'N/A' // If null, undefined, or other type
                    )
                }
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
                <br/>
                <strong className="text-foreground">Views:</strong> <Eye className="inline h-4 w-4 mr-1 text-muted-foreground" />{idea.views || 0}<br/>
                <strong className="text-foreground">Likes:</strong> <Heart className="inline h-4 w-4 mr-1 text-red-500" />{idea.likes || 0}<br/>
                <strong className="text-foreground">Featured:</strong> {idea.is_featured ? 'Yes' : 'No'}<br/>
                {user && (
                  // FIX: Corrected the syntax here to properly close the strong tag and wrap the content
                  <>
                    <strong className="text-foreground">Author ID:</strong> {idea.author_id ? idea.author_id.substring(0, 8) + '...' : 'N/A'}
                  </>
                )}
              </p>
            </div>

            {/* Recommendations Section */}
            <div className="sticky top-20 p-4 bg-white rounded-lg shadow">
              <h2 className="font-semibold mb-2">More business ideas</h2>

              {/* Pass necessary props to Recommendations for filtering */}
              <Recommendations
                currentIdeaId={idea.id}
                currentIdeaCategory={idea.category}
                currentIdeaTags={Array.isArray(idea.tags) ? idea.tags : []}
              />
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
            </div>

            {/* Comments Section */}
            <CommentsSection
              comments={comments}
              ideaCommentsCount={comments.length} // Assuming comments.length is the correct count
              onCommentSubmit={handleAddComment}
            />
          </aside>
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

      {/* REMOVED: <Footer /> */} {/* Footer is provided by MainLayout */}
    </div>
  );
};

export default Presentation;
