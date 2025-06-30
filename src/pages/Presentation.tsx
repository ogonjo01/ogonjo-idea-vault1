// src/pages/Presentation.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PresentationHeader from '@/components/PresentationHeader';
import CommentsSection from '@/components/CommentsSection';
import Recommendations from '@/components/Recommendations';
import AdBanner from '@/components/AdBanner';
import { FileWarning, Maximize2, Minimize2, Download as DownloadIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import type { BusinessIdea } from '@/types/businessIdea';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessIdeas } from '@/hooks/useBusinessIdeas';

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

const AD_INTERVAL = 3;

const Presentation = () => {
  const { id: ideaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incrementView } = useBusinessIdeas();
  const { user } = useAuth();
  const { toast } = useToast();

  const [idea, setIdea] = useState<BusinessIdea | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [numPages, setNumPages] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [presentationUrl, setPresentationUrl] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [pdfWidth, setPdfWidth] = useState(600);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
  }), []);

  // Handle resizing
  useEffect(() => {
    const update = () => {
      if (pdfContainerRef.current) {
        const w = pdfContainerRef.current.clientWidth;
        setPdfWidth(Math.min(w - 32, 600));
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Fetch idea + comments
  useEffect(() => {
    (async () => {
      setIsFetching(true);
      const { data, error } = await supabase
        .from('business_ideas')
        .select('*')
        .eq('id', ideaId)
        .single();
      if (error || !data) {
        toast({ title: 'Error', description: error?.message ?? 'Not found', variant: 'destructive' });
        setIsFetching(false);
        return;
      }
      setIdea(data as BusinessIdea);
      setPresentationUrl(data.presentation_url);
      incrementView(data.id);

      const { data: cd } = await supabase
        .from('idea_comments')
        .select('*')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: false });
      setComments(cd ?? []);
      setIsFetching(false);
    })();
  }, [ideaId, incrementView, toast]);

  // Comment submit
  const handleAddComment = useCallback(async (text: string) => {
    if (!idea || !user) return;
    const { error } = await supabase
      .from('idea_comments')
      .insert({ idea_id: idea.id, user_id: user.id, content: text })
      .select();
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setComments(prev => [{ content: text, user_id: user.id, created_at: new Date().toISOString() }, ...prev]);
    }
  }, [idea, user, toast]);

  // PDF error & retry
  const handlePdfError = useCallback((err: any) => {
    console.error(err);
    setPdfError('Unable to load PDF.');
    setPdfLoading(false);
  }, []);
  const retryPdfLoad = useCallback(() => {
    setPdfError(null);
    setPdfLoading(true);
  }, []);

  // Fullscreen toggle
  const handleFullscreen = useCallback(() => {
    if (!pdfContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      pdfContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    }
  }, []);

  // Download handler
  const handleDownload = useCallback(() => {
    if (!presentationUrl || !idea) return;
    const link = document.createElement('a');
    link.href = presentationUrl;
    link.download = `${idea.title.replace(/\s+/g,'_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [presentationUrl, idea]);

  if (isFetching) return <div className="flex items-center justify-center h-screen">Loading…</div>;
  if (!idea) return <div className="flex items-center justify-center h-screen">Idea Not Found</div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header showSearch />

      {/* Presentation Header with Download + Like */}
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{idea.title}</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => {/* like handler */}}>
            {/* replace with real like icon */}
            ❤️
          </Button>
          <Button variant="secondary" onClick={handleDownload}>
            <DownloadIcon className="w-4 h-4 mr-1" /> Download PDF
          </Button>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-6 grid grid-cols-12 gap-6">
        {/* PDF viewer */}
        <section className="col-span-12 lg:col-span-7 relative flex flex-col bg-white rounded-lg shadow overflow-hidden">
          {/* Fixed fullscreen button */}
          <button
            onClick={handleFullscreen}
            className="absolute top-2 right-2 z-10 p-2 bg-white rounded shadow hover:bg-gray-100"
          >
            {isFullscreen ? <Minimize2 /> : <Maximize2 />}
          </button>

          <div ref={pdfContainerRef} className="flex-1 overflow-auto p-4">
            {presentationUrl && (
              <Document
                file={presentationUrl}
                onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPdfLoading(false); }}
                onLoadError={handlePdfError}
                onSourceError={handlePdfError}
                options={pdfOptions}
                className="flex flex-col items-center gap-6"
              >
                {Array.from({ length: numPages }, (_, idx) => {
                  const pageNumber = idx + 1;
                  return (
                    <div key={pageNumber} className="w-full">
                      <Page
                        pageNumber={pageNumber}
                        width={pdfWidth}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                      {(pageNumber) % AD_INTERVAL === 0 && (
                        <AdBanner page={pageNumber} />
                      )}
                    </div>
                  );
                })}
              </Document>
            )}
            {pdfError && (
              <div className="text-center py-8">
                <FileWarning className="mx-auto mb-4 text-red-500" />
                <p>{pdfError}</p>
                <Button onClick={retryPdfLoad}>Retry</Button>
              </div>
            )}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-5 space-y-6">
          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="font-semibold mb-2">Key Insight</h2>
            <p className="text-sm text-muted-foreground">{idea.description}</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="font-semibold mb-2">More business ideas</h2>
            <Recommendations currentPdfUrl={presentationUrl || ''} />
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="font-semibold mb-2">Comments</h2>
            <CommentsSection
              comments={comments}
              ideaCommentsCount={comments.length}
              onCommentSubmit={handleAddComment}
            />
          </div>
        </aside>
      </main>

      <section className="container mx-auto px-4 py-6">
  <div className="p-4 bg-white rounded-lg shadow">
    <h2 className="font-semibold text-lg mb-2">More business ideas</h2>
    <Recommendations currentPdfUrl={presentationUrl || ''} />
  </div>
</section>

      <Footer />
    </div>
  );
};

export default Presentation;
