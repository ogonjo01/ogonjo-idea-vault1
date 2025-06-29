import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Eye } from 'lucide-react';
import { BusinessIdea, AffiliateBook } from '@/data/mockData';

interface PPTSlideProps {
  idea: BusinessIdea;
  affiliateBooks: AffiliateBook[];
  userId?: string;
  flutterwavePublicKey?: string;
  redirectUrl?: string;
}

const PPTSlide = ({ idea, affiliateBooks, userId, flutterwavePublicKey, redirectUrl }: PPTSlideProps) => {
  const [isPreviewMode, setIsPreviewMode] = useState(!idea.hasPurchased);
  
  const buyLink = flutterwavePublicKey && userId && redirectUrl 
    ? `https://checkout.flutterwave.com/v3/hosted/pay?public_key=${flutterwavePublicKey}&tx_ref=idea-${idea.id}-user-${userId}&amount=${idea.price}&currency=${idea.currency}&redirect_url=${encodeURIComponent(redirectUrl)}`
    : null;

  const getPreviewDescription = (description: string) => {
    const sentences = description.split('. ');
    return sentences.length > 0 ? sentences[0] + '.' : description;
  };

  const groupBooksByCategory = (books: AffiliateBook[]) => {
    return books.reduce((acc, book) => {
      if (!acc[book.category]) {
        acc[book.category] = [];
      }
      acc[book.category].push(book);
      return acc;
    }, {} as Record<string, AffiliateBook[]>);
  };

  const groupedBooks = groupBooksByCategory(affiliateBooks);

  const handleBuyNow = () => {
    if (buyLink) {
      window.open(buyLink, '_blank');
    }
  };

  return (
    <Card className="max-w-6xl mx-auto bg-background border border-border relative overflow-hidden">
      {/* Watermark */}
      {isPreviewMode && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45 text-6xl font-bold text-muted-foreground/20 select-none">
            PREVIEW ONLY
          </div>
        </div>
      )}

      <CardContent className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <h1 className="font-montserrat font-bold text-4xl text-foreground mb-4">
              {idea.title}
            </h1>
            <Badge variant="secondary" className="font-roboto text-sm">
              {idea.category}
            </Badge>
          </div>
          
          {idea.icon && (
            <div className="ml-8">
              <img 
                src={idea.icon} 
                alt={idea.title}
                className="w-32 h-32 object-cover rounded-lg"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Content */}
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h2 className="font-montserrat font-semibold text-xl text-foreground mb-3">
                Description
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed">
                {isPreviewMode ? (
                  <>
                    {getPreviewDescription(idea.description)}
                    <span className="text-muted-foreground/60 italic ml-2">
                      Purchase to unlock full details...
                    </span>
                  </>
                ) : (
                  idea.description
                )}
              </p>
            </div>

            {/* Benefits */}
            {idea.benefits && idea.benefits.length > 0 && (
              <div>
                <h2 className="font-montserrat font-semibold text-xl text-foreground mb-3">
                  Key Benefits
                </h2>
                <ul className="space-y-2">
                  {idea.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2 font-roboto text-muted-foreground">
                      <span className="text-primary mt-1">•</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Use Cases */}
            {idea.useCases && idea.useCases.length > 0 && (
              <div>
                <h2 className="font-montserrat font-semibold text-xl text-foreground mb-3">
                  Use Cases
                </h2>
                {isPreviewMode ? (
                  <div className="text-muted-foreground/60 italic font-roboto">
                    <Eye className="inline w-4 h-4 mr-2" />
                    Unlock to see practical use cases
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {idea.useCases.map((useCase, index) => (
                      <li key={index} className="flex items-start gap-2 font-roboto text-muted-foreground">
                        <span className="text-primary mt-1">•</span>
                        {useCase}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Books & Actions */}
          <div className="space-y-6">
            {/* Affiliate Books */}
            <div>
              <h2 className="font-montserrat font-semibold text-xl text-foreground mb-4">
                Recommended Reads by Category
              </h2>
              <div className="space-y-4">
                {Object.entries(groupedBooks).map(([category, books]) => (
                  <div key={category}>
                    <h3 className="font-roboto font-medium text-lg text-foreground mb-2">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {books.map((book, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <a 
                              href={book.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-roboto font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2"
                            >
                              {book.title}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            {book.author && (
                              <p className="font-roboto text-xs text-muted-foreground">
                                by {book.author}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 font-roboto italic">
                * Affiliate links - we may earn a commission
              </p>
            </div>

            <Separator />

            {/* Pricing & Buy Button */}
            {idea.price && idea.currency && (
              <div className="text-center space-y-4">
                <div>
                  <p className="font-roboto text-sm text-muted-foreground">Price</p>
                  <p className="font-montserrat font-bold text-2xl text-foreground">
                    {idea.price} {idea.currency}
                  </p>
                </div>
                
                {!idea.hasPurchased && buyLink && (
                  <Button 
                    onClick={handleBuyNow}
                    size="lg"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-roboto"
                  >
                    Buy This Idea
                  </Button>
                )}
                
                {idea.hasPurchased && (
                  <Badge variant="default" className="font-roboto">
                    ✓ Purchased
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PPTSlide;