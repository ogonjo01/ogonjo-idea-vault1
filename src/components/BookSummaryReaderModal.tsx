import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface BookMetadata {
  publication_date?: string;
  edition?: string;
  category_genre?: string;
  translator?: string;
}

interface ContextWhyItMatters {
  intro: string;
  backstory_impact?: string;
}

interface KeyConcept {
  name: string;
  definition: string;
  importance: string;
}

interface MemorableQuote {
  quote: string;
  source?: string;
}

interface StructuredSummaryContent {
  description: string;
  metadata?: BookMetadata;
  context_why_it_matters?: ContextWhyItMatters;
  core_thesis?: string;
  structure_overview?: string;
  key_concepts_frameworks?: KeyConcept[];
  illustrative_anecdotes?: string[];
  top_takeaways?: string[];
  memorable_quotes?: MemorableQuote[];
  practical_next_steps?: string[];
  further_resources?: {
    affiliate_retail_links?: string[];
    official_websites?: string[];
    author_interviews?: string[];
    youtube_summaries?: string[];
  };
  summary_reflection?: string;
}

interface BookSummaryReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryTitle: string;
  bookAuthor: string;
  structuredSummary: StructuredSummaryContent;
}

interface SectionLayout {
  y: number;
  height: number;
}

const BookSummaryReaderModal: React.FC<BookSummaryReaderModalProps> = ({
  isOpen,
  onClose,
  summaryTitle,
  bookAuthor,
  structuredSummary,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionLayouts = useRef<SectionLayout[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const navigate = useNavigate();

  const sectionsToRender = [
    { type: 'heading', content: 'Overview' },
    { type: 'description', content: structuredSummary.description },
    ...(structuredSummary.metadata ? [{ type: 'metadata', content: structuredSummary.metadata }] : []),
    ...(structuredSummary.context_why_it_matters ? [{ type: 'context', content: structuredSummary.context_why_it_matters }] : []),
    ...(structuredSummary.core_thesis ? [{ type: 'core_thesis', content: structuredSummary.core_thesis }] : []),
    ...(structuredSummary.structure_overview ? [{ type: 'structure_overview', content: structuredSummary.structure_overview }] : []),
    ...(structuredSummary.key_concepts_frameworks && structuredSummary.key_concepts_frameworks.length > 0 ? [{ type: 'heading', content: 'Key Concepts' }] : []),
    ...(structuredSummary.key_concepts_frameworks || []).map(kc => ({ type: 'key_concept', content: kc })),
    ...(structuredSummary.illustrative_anecdotes && structuredSummary.illustrative_anecdotes.length > 0 ? [{ type: 'heading', content: 'Illustrative Anecdotes' }] : []),
    ...(structuredSummary.illustrative_anecdotes || []).map(anecdote => ({ type: 'illustrative_anecdote', content: anecdote })),
    ...(structuredSummary.top_takeaways && structuredSummary.top_takeaways.length > 0 ? [{ type: 'heading', content: 'Top Takeaways' }] : []),
    ...(structuredSummary.top_takeaways || []).map(takeaway => ({ type: 'top_takeaway', content: takeaway })),
    ...(structuredSummary.memorable_quotes && structuredSummary.memorable_quotes.length > 0 ? [{ type: 'heading', content: 'Memorable Quotes' }] : []),
    ...(structuredSummary.memorable_quotes || []).map(quote => ({ type: 'memorable_quote', content: quote })),
    ...(structuredSummary.practical_next_steps && structuredSummary.practical_next_steps.length > 0 ? [{ type: 'heading', content: 'Practical Next Steps' }] : []),
    ...(structuredSummary.practical_next_steps || []).map(step => ({ type: 'practical_next_step', content: step })),
    ...(structuredSummary.summary_reflection ? [{ type: 'heading', content: 'Summary & Reflection' }] : []),
    ...(structuredSummary.summary_reflection ? [{ type: 'summary_reflection', content: structuredSummary.summary_reflection }] : []),
  ].filter(Boolean) as { type: string; content: any }[];

  const totalSections = sectionsToRender.length;

  const handleLinkPress = (url: string | null | undefined) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('Link Unavailable: This link is not provided.');
    }
  };

  const onSectionLayout = (index: number, element: HTMLDivElement) => {
    if (element) {
      const { top, height } = element.getBoundingClientRect();
      sectionLayouts.current[index] = { y: top, height };
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollY = scrollRef.current.scrollTop;
      let newCurrentSectionIndex = 0;
      const windowHeight = window.innerHeight;

      for (let i = 0; i < sectionLayouts.current.length; i++) {
        const layout = sectionLayouts.current[i];
        if (layout) {
          if (scrollY >= layout.y - (windowHeight * 0.2)) {
            newCurrentSectionIndex = i;
          } else {
            break;
          }
        }
      }
      if (newCurrentSectionIndex !== currentSectionIndex) {
        setCurrentSectionIndex(newCurrentSectionIndex);
      }
    }
  };

  const scrollToSection = (index: number) => {
    const layout = sectionLayouts.current[index];
    if (layout && scrollRef.current) {
      scrollRef.current.scrollTo({ top: layout.y, behavior: 'smooth' });
      setCurrentSectionIndex(index);
    }
  };

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.addEventListener('scroll', handleScroll);
      return () => scrollRef.current?.removeEventListener('scroll', handleScroll);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button onClick={onClose} className="text-gray-700 hover:text-gray-900">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-xl font-bold text-gray-900">{summaryTitle}</h2>
            <p className="text-sm text-gray-600">by {bookAuthor}</p>
          </div>
          <div className="w-6" /> {/* Spacer for symmetry */}
        </div>

        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-500 text-center">{currentSectionIndex + 1} / {totalSections}</p>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${((currentSectionIndex + 1) / totalSections) * 100}%` }} />
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {sectionsToRender.map((section, index) => (
            <div
              key={index}
              ref={(el) => onSectionLayout(index, el as HTMLDivElement)}
              className="mb-6"
            >
              {section.type === 'heading' && (
                <h3 className="text-2xl font-bold text-blue-600 mb-4 text-center">{section.content}</h3>
              )}
              {section.type === 'description' && (
                <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Book Description</h4>
                  <p className="text-gray-700 leading-relaxed">{section.content}</p>
                </div>
              )}
              {section.type === 'metadata' && (
                <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Book Details</h4>
                  {section.content.publication_date && <p className="text-gray-700">Publication Date: {section.content.publication_date}</p>}
                  {section.content.edition && <p className="text-gray-700">Edition: {section.content.edition}</p>}
                  {section.content.category_genre && <p className="text-gray-700">Category: {section.content.category_genre}</p>}
                  {section.content.translator && <p className="text-gray-700">Translator: {section.content.translator}</p>}
                </div>
              )}
              {section.type === 'context' && (
                <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Context & Why It Matters</h4>
                  <p className="text-gray-700 leading-relaxed">{section.content.intro}</p>
                  {section.content.backstory_impact && <p className="text-gray-700 leading-relaxed">{section.content.backstory_impact}</p>}
                </div>
              )}
              {section.type === 'core_thesis' && (
                <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Core Thesis</h4>
                  <p className="text-gray-700 leading-relaxed">{section.content}</p>
                </div>
              )}
              {section.type === 'structure_overview' && (
                <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Structure Overview</h4>
                  <p className="text-gray-700 leading-relaxed">{section.content}</p>
                </div>
              )}
              {section.type === 'key_concept' && (
                <div className="bg-white rounded-lg p-4 shadow-md border-l-4 border-blue-500 border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-1">{section.content.name}</h4>
                  <p className="text-gray-700 mb-1">{section.content.definition}</p>
                  <p className="text-gray-600 text-sm">Why it matters: {section.content.importance}</p>
                </div>
              )}
              {section.type === 'illustrative_anecdote' && (
                <div className="bg-white rounded-lg p-4 shadow-md flex items-start border-l-4 border-green-500 border-gray-200">
                  <svg className="w-6 h-6 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm-3 8a1 1 0 112 0v3a1 1 0 11-2 0v-3zm6 0a1 1 0 112 0v3a1 1 0 11-2 0v-3z" />
                  </svg>
                  <p className="text-gray-700 leading-relaxed">{section.content}</p>
                </div>
              )}
              {section.type === 'top_takeaway' && (
                <div className="bg-white rounded-lg p-4 shadow-md flex items-start border-l-4 border-indigo-500 border-gray-200">
                  <svg className="w-5 h-5 text-indigo-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <p className="text-gray-700 leading-relaxed">{section.content}</p>
                </div>
              )}
              {section.type === 'memorable_quote' && (
                <div className="bg-white rounded-lg p-4 shadow-md border-l-4 border-gray-400 border-gray-200 text-center">
                  <svg className="w-6 h-6 text-gray-500 mb-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 15l-5-5 1.41-1.41L10 12.17l7.59-7.59L19 6l-9 9z" />
                  </svg>
                  <p className="text-gray-700 italic">"{section.content.quote}"</p>
                  {section.content.source && <p className="text-gray-600 text-sm mt-1">— {section.content.source}</p>}
                  <svg className="w-6 h-6 text-gray-500 mt-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 5l5 5-1.41 1.41L10 7.83l-7.59 7.59L1 14l9-9z" />
                  </svg>
                </div>
              )}
              {section.type === 'practical_next_step' && (
                <div className="bg-white rounded-lg p-4 shadow-md flex items-start border-l-4 border-teal-500 border-gray-200">
                  <svg className="w-5 h-5 text-teal-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.5 2.5a1 1 0 001.414-1.414l-2.207-2.207A1 1 0 0011 10V6z" clipRule="evenodd" />
                  </svg>
                  <p className="text-gray-700 leading-relaxed">{section.content}</p>
                </div>
              )}
              {section.type === 'summary_reflection' && (
                <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Summary & Reflection</h4>
                  <p className="text-gray-700 leading-relaxed">{section.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BookSummaryReaderModal;