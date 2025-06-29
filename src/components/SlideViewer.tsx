import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SlideViewerProps {
  slides: string[];
}

const SlideViewer = ({ slides }: SlideViewerProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  return (
    <Card className="mb-8">
      <CardContent className="p-0">
        <div className="relative">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <img 
              src={slides[currentSlide]} 
              alt={`Slide ${currentSlide + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Navigation */}
          {slides.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="absolute left-4 top-1/2 transform -translate-y-1/2"
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="absolute right-4 top-1/2 transform -translate-y-1/2"
                onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                disabled={currentSlide === slides.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {/* Slide Counter */}
          {slides.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded font-roboto text-sm">
              {currentSlide + 1} / {slides.length}
            </div>
          )}
        </div>

        {/* Slide Thumbnails */}
        {slides.length > 1 && (
          <div className="p-4 border-t border-border">
            <div className="flex gap-2 overflow-x-auto">
              {slides.map((slide, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`flex-shrink-0 w-16 h-12 rounded border-2 overflow-hidden ${
                    currentSlide === index ? 'border-primary' : 'border-border'
                  }`}
                >
                  <img 
                    src={slide} 
                    alt={`Slide ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SlideViewer;