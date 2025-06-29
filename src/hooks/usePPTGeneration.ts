import { useState } from 'react';
import { BusinessIdea, AffiliateBook } from '@/data/mockData';

interface PPTGenerationOptions {
  flutterwavePublicKey?: string;
  redirectUrl?: string;
  userId?: string;
}

export const usePPTGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePPTSlideHTML = (
    idea: BusinessIdea, 
    affiliateBooks: AffiliateBook[], 
    options: PPTGenerationOptions = {}
  ): string => {
    const { flutterwavePublicKey, redirectUrl, userId } = options;
    
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
    const isPreviewMode = !idea.hasPurchased;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${idea.title} - Business Idea</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: #f8f9fa; padding: 20px; }
        .slide-container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; position: relative; }
        .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg); font-size: 4rem; color: rgba(0,0,0,0.1); pointer-events: none; z-index: 10; font-weight: bold; }
        .slide-content { padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .title { font-size: 2.5rem; font-weight: bold; color: #1a1a1a; margin-bottom: 16px; }
        .category-badge { background: #e2e8f0; color: #475569; padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; }
        .icon { width: 128px; height: 128px; object-fit: cover; border-radius: 8px; }
        .content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 1.3rem; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
        .description { line-height: 1.6; color: #64748b; }
        .preview-text { color: #94a3b8; font-style: italic; }
        .benefits-list, .usecases-list { list-style: none; }
        .benefits-list li, .usecases-list li { margin-bottom: 8px; color: #64748b; }
        .benefits-list li::before { content: "•"; color: #3b82f6; margin-right: 8px; }
        .locked { color: #94a3b8; font-style: italic; }
        .books-section { background: #f8fafc; padding: 20px; border-radius: 8px; }
        .book-category { margin-bottom: 20px; }
        .book-category h4 { font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; }
        .book { padding: 12px; background: white; border-radius: 6px; margin-bottom: 8px; border: 1px solid #e2e8f0; }
        .book a { color: #3b82f6; text-decoration: none; font-weight: 500; }
        .book a:hover { text-decoration: underline; }
        .book .author { font-size: 0.8rem; color: #64748b; }
        .affiliate-note { font-size: 0.75rem; color: #94a3b8; font-style: italic; margin-top: 12px; }
        .pricing { text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; }
        .price { font-size: 2rem; font-weight: bold; color: #1a1a1a; margin-bottom: 16px; }
        .buy-button { background: #3b82f6; color: white; padding: 12px 32px; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
        .buy-button:hover { background: #2563eb; }
        .purchased-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; }
    </style>
</head>
<body>
    <div class="slide-container">
        ${isPreviewMode ? '<div class="watermark">PREVIEW ONLY</div>' : ''}
        
        <div class="slide-content">
            <div class="header">
                <div>
                    <h1 class="title">${idea.title}</h1>
                    <span class="category-badge">${idea.category}</span>
                </div>
                ${idea.icon ? `<img src="${idea.icon}" alt="${idea.title}" class="icon">` : ''}
            </div>

            <div class="content-grid">
                <div>
                    <div class="section">
                        <h2 class="section-title">Description</h2>
                        <p class="description">
                            ${isPreviewMode 
                              ? `${getPreviewDescription(idea.description)} <span class="preview-text">Purchase to unlock full details...</span>`
                              : idea.description
                            }
                        </p>
                    </div>

                    ${idea.benefits && idea.benefits.length > 0 ? `
                    <div class="section">
                        <h2 class="section-title">Key Benefits</h2>
                        <ul class="benefits-list">
                            ${idea.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}

                    ${idea.useCases && idea.useCases.length > 0 ? `
                    <div class="section">
                        <h2 class="section-title">Use Cases</h2>
                        ${isPreviewMode 
                          ? '<p class="locked">👁️ Unlock to see practical use cases</p>'
                          : `<ul class="usecases-list">${idea.useCases.map(useCase => `<li>${useCase}</li>`).join('')}</ul>`
                        }
                    </div>
                    ` : ''}
                </div>

                <div>
                    <div class="books-section">
                        <h2 class="section-title">Recommended Reads by Category</h2>
                        ${Object.entries(groupedBooks).map(([category, books]) => `
                            <div class="book-category">
                                <h4>${category}</h4>
                                ${books.map(book => `
                                    <div class="book">
                                        <a href="${book.url}" target="_blank">${book.title} ↗</a>
                                        ${book.author ? `<div class="author">by ${book.author}</div>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        `).join('')}
                        <p class="affiliate-note">* Affiliate links - we may earn a commission</p>
                    </div>
                </div>
            </div>

            ${idea.price && idea.currency ? `
            <div class="pricing">
                <div class="price">${idea.price} ${idea.currency}</div>
                ${!idea.hasPurchased && buyLink 
                  ? `<a href="${buyLink}" target="_blank" class="buy-button">Buy This Idea</a>`
                  : idea.hasPurchased 
                    ? '<span class="purchased-badge">✓ Purchased</span>'
                    : ''
                }
            </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
  };

  const downloadPPTSlide = async (
    idea: BusinessIdea, 
    affiliateBooks: AffiliateBook[], 
    options: PPTGenerationOptions = {}
  ) => {
    setIsGenerating(true);
    
    try {
      const htmlContent = generatePPTSlideHTML(idea, affiliateBooks, options);
      
      // Create a blob with the HTML content
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Create a download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `${idea.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_slide.html`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating PPT slide:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generatePPTSlideHTML,
    downloadPPTSlide,
    isGenerating
  };
};