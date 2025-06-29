// src/components/Presentation.tsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PresentationHeader from '@/components/PresentationHeader';
import CommentsSection from '@/components/CommentsSection';
import { ChevronLeft, Download, FileWarning, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast'; // Correct path for shadcn/ui toast hook
import { supabase } from '@/lib/supabase'; // Ensure this path is correct: src/lib/supabase.ts or supabaseClient.ts
import { BusinessIdea } from '@/types/businessIdea'; // Assuming you have this type
import { useAuth } from '@/hooks/useAuth';
import { useBusinessIdeas } from '@/hooks/useBusinessIdeas'; // Import the hook that provides incrementView

// Set the worker source - ensure this file is accessible in your public directory
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`; // Use /pdf.worker.min.js or a CDN if preferred

const Presentation = () => {
  const { id: ideaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incrementView } = useBusinessIdeas(); // Destructure incrementView
  const { user } = useAuth();

  const [idea, setIdea] = useState<BusinessIdea | null>(null);
  const [comments, setComments] = useState<any[]>([]); // This will hold the actual comments fetched
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [presentationUrl, setPresentationUrl] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true); // For initial idea data fetch
  const [pdfError, setPdfError] = useState<string | null>(null);
  const { toast } = useToast();
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [pdfWidth, setPdfWidth] = useState(800); // Initial width, adjusted by useEffect
  const [debugInfo, setDebugInfo] = useState('');
  const [pdfLoadAttempt, setPdfLoadAttempt] = useState(0);
  const [isPdfSupported, setIsPdfSupported] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Memoize PDF options to prevent re-renders
  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
  }), []);

  // Check for PDF.js support (simplified)
  useEffect(() => {
    setIsPdfSupported(true); // Assume supported unless a specific error occurs during load
  }, []);

  // Update PDF width on container resize
  useEffect(() => {
    const updateWidth = () => {
      if (pdfContainerRef.current) {
        const containerWidth = pdfContainerRef.current.clientWidth;
        setPdfWidth(Math.min(containerWidth - 40, 800)); // 40px for left/right padding
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Main data fetching function for the idea and its comments
  const fetchIdeaAndComments = useCallback(async () => {
    if (!ideaId) {
      navigate('/dashboard'); // Redirect if no ideaId
      return;
    }

    setIsFetching(true);
    setPdfError(null); // Clear previous PDF errors
    setPdfLoadAttempt(0); // Reset PDF load attempts
    let debugLog = `Starting data fetch for idea: ${ideaId}\n`;
    setDebugInfo(debugLog);

    try {
  const { data: ideaData, error: ideaError } = await supabase
    .from('business_ideas')
    .select(
      `id, title, category, description, thumbnail_url, presentation_url,
      views, likes, comments, created_at, created_by,
      idea_likes(user_id)`
    )
    .eq('id', ideaId)
    .single();

  if (ideaError || !ideaData) {
    debugLog += `❌ Idea not found: ${ideaError?.message || 'No data'}\n`;
    setDebugInfo(debugLog);
    throw new Error('Business idea not found');
  }

  const isLikedByCurrentUser = user
    ? (ideaData.idea_likes as { user_id: string }[]).some((like: { user_id: string }) => like.user_id === user.id)
    : false;

  // Construct processedIdea to match the corrected BusinessIdea interface
  const processedIdea: BusinessIdea = {
    id: ideaData.id,
    title: ideaData.title,
    category: ideaData.category,
    description: ideaData.description,
    thumbnail_url: ideaData.thumbnail_url, // <--- CHANGE THIS FROM 'thumbnail' TO 'thumbnail_url'
    presentation_url: ideaData.presentation_url,
    views: ideaData.views,
    likes: ideaData.likes,
    comments: ideaData.comments,
    created_at: ideaData.created_at,
    created_by: ideaData.created_by,
    isLiked: isLikedByCurrentUser,
      };

      setIdea(processedIdea);
      setPresentationUrl(ideaData.presentation_url);

      // Fetch actual comments for the CommentsSection
      const { data: fetchedComments, error: commentsError } = await supabase
        .from('idea_comments')
        .select(`
          id, content, created_at,
          profiles(full_name, email)
        `)
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Error fetching comments:', commentsError.message);
        setComments([]);
      } else {
        setComments(fetchedComments || []);
      }

      debugLog += `✅ Data loaded for idea "${ideaData.title}"\n`;
      debugLog += `✅ Presentation URL: ${ideaData.presentation_url || 'null'}\n`;
      debugLog += `✅ Initial Likes: ${ideaData.likes}, Comments: ${ideaData.comments}, Views: ${ideaData.views}\n`;
      debugLog += `✅ Is Liked by current user: ${isLikedByCurrentUser}\n`;
      setDebugInfo(debugLog);

    } catch (err: any) {
      debugLog += `❌ Error in fetchIdeaAndComments: ${err.message}\n`;
      setDebugInfo(debugLog);
      toast({
        title: "Loading Error",
        description: err.message || "Failed to load presentation data",
        variant: "destructive"
      });
      if (err.message.includes('Business idea not found') || err.code === 'PGRST116') {
        navigate('/dashboard');
      }
    } finally {
      setIsFetching(false);
    }
  }, [ideaId, user, navigate, toast]);

  // Effect to trigger the initial data fetch
  useEffect(() => {
    fetchIdeaAndComments();
  }, [fetchIdeaAndComments]);

  // Effect to increment views (runs only once per ideaId load and after initial fetch is complete)
  useEffect(() => {
    let timeoutId: number;
    if (ideaId && !isFetching) {
      timeoutId = window.setTimeout(() => {
        incrementView(ideaId);
      }, 500);
    }
    return () => window.clearTimeout(timeoutId);
  }, [ideaId, isFetching, incrementView]);

  // --- Interaction Handlers (Like/Comment) ---

  const handleLike = useCallback(async () => {
    if (!idea || !user) return;

    try {
      const isCurrentlyLiked = idea.isLiked;
      let newLikeStatus: boolean;

      if (isCurrentlyLiked) {
        const { error: deleteError } = await supabase
          .from('idea_likes')
          .delete()
          .eq('idea_id', idea.id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
        newLikeStatus = false;
      } else {
        const { error: insertError } = await supabase
          .from('idea_likes')
          .insert({ idea_id: idea.id, user_id: user.id });

        if (insertError) throw insertError;
        newLikeStatus = true;
      }

      setIdea(prev => prev ? {
        ...prev,
        isLiked: newLikeStatus,
        likes: newLikeStatus ? (prev.likes || 0) + 1 : Math.max(0, (prev.likes || 0) - 1)
      } : null);

      toast({
        title: newLikeStatus ? "Idea Liked!" : "Idea Unliked!",
        description: `You ${newLikeStatus ? 'liked' : 'unliked'} this idea.`,
      });

    } catch (err: any) {
      console.error('Error toggling like:', err.message);
      toast({
        title: "Like Error",
        description: err.message || "Failed to update like status.",
        variant: "destructive"
      });
    }
  }, [idea, user, toast]);

  const handleAddComment = useCallback(async (commentContent: string) => {
    if (!ideaId || !user || !commentContent.trim()) return;

    try {
      const { data: newCommentData, error: commentError } = await supabase
        .from('idea_comments')
        .insert({
          idea_id: ideaId,
          user_id: user.id,
          content: commentContent,
        })
        .select(`
          id, content, created_at,
          profiles(full_name, email)
        `)
        .single();

      if (commentError) throw commentError;

      if (newCommentData) {
        setComments(prevComments => [...prevComments, newCommentData]);
        setIdea(prev => prev ? { ...prev, comments: (prev.comments || 0) + 1 } : null);

        toast({
          title: "Comment Added",
          description: "Your comment has been posted.",
        });
      }
    } catch (err: any) {
      console.error('Error adding comment:', err.message);
      toast({
        title: "Comment Error",
        description: err.message || "Failed to post comment.",
        variant: "destructive"
      });
    }
  }, [ideaId, user, toast]);

  // --- PDF Viewer Handlers ---

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfLoading(false);
    setPdfError(null);
    setPdfLoadAttempt(0);
  }, []);

  const handlePdfError = useCallback((error: any) => {
    console.error('PDF.js error:', error);

    let errorMessage = 'Failed to load PDF. The file may be corrupted or in an unsupported format.';

    if (error?.message?.includes('file format')) {
      errorMessage = 'Invalid PDF format. The file may be corrupted.';
    } else if (error?.name === 'InvalidPDFException') {
      errorMessage = 'The PDF file is invalid or corrupted.';
    } else if (error?.message?.includes('network')) {
      errorMessage = 'Network error loading PDF. Please check your connection.';
    } else if (error?.message?.includes('worker') ||
      error?.message?.includes('version') ||
      error?.message?.includes('pdf.worker')) {
      errorMessage = 'Failed to initialize PDF viewer. Please try refreshing the page.';
    } else if (error?.name === 'UnknownErrorException') {
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
    } else {
      toast({
        title: "PDF Loading Failed",
        description: "Could not load PDF after multiple attempts. Try opening in a new tab.",
        variant: "destructive"
      });
    }
  }, [pdfLoadAttempt, toast]);

  const goToPrevPage = useCallback(() => setPageNumber(prev => Math.max(1, prev - 1)), []);
  const goToNextPage = useCallback(() => setPageNumber(prev => Math.min(numPages || 1, prev + 1)), [numPages]);

  const handleDownload = useCallback(() => {
    if (!presentationUrl) return;

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
  }, [presentationUrl, idea?.title, toast]);

  const openInNewTab = useCallback(() => {
    if (!presentationUrl) return;
    window.open(presentationUrl, '_blank');
  }, [presentationUrl]);

  const createPresentation = useCallback(() => {
    navigate(`/presentations/create?ideaId=${ideaId}`);
  }, [navigate, ideaId]);

  const handleFullscreen = useCallback(() => {
    if (pdfContainerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        pdfContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    }
  }, []);


  // --- Render Logic ---

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-roboto text-muted-foreground">Loading presentation details...</p>
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <FileWarning className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Idea Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The requested business idea doesn't exist or an error occurred.
        </p>
        <Button onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header showSearch={true} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6 font-roboto"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <PresentationHeader
          idea={idea}
          onLike={handleLike}
          onDownload={handleDownload}
        />

        <div
          className="mb-8 bg-white rounded-lg shadow-lg p-4 flex flex-col items-center"
          ref={pdfContainerRef}
        >
          {/* PDF Loading State */}
          {pdfLoading && presentationUrl && !pdfError && (
            <div className="flex flex-col items-center justify-center h-64 w-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
              <p className="font-roboto text-muted-foreground">Loading PDF...</p>
            </div>
          )}

          {/* PDF Error State */}
          {pdfError && presentationUrl && (
            <div className="flex flex-col items-center justify-center py-12 w-full">
              <FileWarning className="h-16 w-16 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">PDF Error</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                {pdfError}
              </p>

              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button
                  variant="secondary"
                  onClick={handleDownload}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>

                <Button
                  onClick={openInNewTab}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>

                <Button
                  onClick={retryPdfLoad}
                  variant="outline"
                  className="w-full"
                  disabled={pdfLoadAttempt >= 2}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {pdfLoadAttempt < 2 ? `Retry (${2 - pdfLoadAttempt} left)` : 'Retry failed'}
                </Button>
              </div>
            </div>
          )}

          {/* PDF Viewer */}
          {presentationUrl && !pdfError && (
            <div className="pdf-viewer-wrapper w-full flex flex-col items-center">
              <Document
                key={`${presentationUrl}-${pdfLoadAttempt}`}
                file={presentationUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={handlePdfError}
                onSourceError={handlePdfError}
                className="flex justify-center"
                options={pdfOptions}
                noData={!isPdfSupported ? "PDF viewer not supported in your browser" : undefined}
              >
                <Page
                  pageNumber={pageNumber}
                  width={pdfWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </Document>

              <div className="flex flex-wrap items-center justify-between mt-4 gap-4 w-full px-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                  >
                    Previous
                  </Button>

                  <span className="font-roboto min-w-[120px] text-center">
                    Page {pageNumber} of {numPages || '?'}
                  </span>

                  <Button
                    variant="outline"
                    onClick={goToNextPage}
                    disabled={!!numPages && pageNumber >= numPages}
                  >
                    Next
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleFullscreen}
                  >
                    {isFullscreen ? 'Exit Fullscreen' : 'Open Fullscreen'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* No Presentation URL State */}
          {!presentationUrl && (
            <div className="flex flex-col items-center justify-center py-12 w-full">
              <FileWarning className="h-16 w-16 text-yellow-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Presentation Unavailable</h3>
              <p className="text-muted-foreground text-center mb-6">
                This business idea doesn't have a presentation yet.
              </p>

              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/ideas/${idea.id}`)}
                >
                  View Idea Details
                </Button>

                <Button
                  onClick={createPresentation}
                >
                  Create Presentation
                </Button>
              </div>
            </div>
          )}

          {/* Debug Info */}
          {pdfError && (
            <div className="mt-8 text-left w-full">
              <details className="bg-gray-50 p-3 rounded border">
                <summary className="font-semibold cursor-pointer">Debug Information</summary>
                <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                  {debugInfo || 'No debug information available'}
                </pre>
                <div className="mt-2 text-sm">
                  <p><strong>Idea ID:</strong> {ideaId}</p>
                  <p><strong>Presentation URL:</strong> {presentationUrl || 'null'}</p>
                  <p><strong>PDF Attempts:</strong> {pdfLoadAttempt}</p>
                  <p className="text-red-500"><strong>Error:</strong> {pdfError}</p>
                  <p><strong>PDF.js Version:</strong> {pdfjs.version}</p>
                  <p><strong>Worker Src:</strong> {pdfjs.GlobalWorkerOptions.workerSrc}</p>
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Comments Section */}
        <CommentsSection
          comments={comments}
          ideaCommentsCount={idea.comments || 0}
          onCommentSubmit={handleAddComment}
        />
      </main>

      <Footer />
    </div>
  );
};

export default Presentation;