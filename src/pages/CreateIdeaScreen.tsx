
// ogonjo-web-app/src/pages/CreateIdea.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../services/supabase';
import { Theme } from '../constants/Theme';
import { BUSINESS_CATEGORIES } from '../constants/businessCategories';
import '../styles/CreateIdea.css';

// Define the StructuredIdeaContent interface (same as mobile)
interface StructuredIdeaContent {
  overview: {
    problem: string;
    solution: string;
    target_audience: string;
    unique_selling_proposition: string;
    origin_story?: string;
    motivational_quote?: string;
  };
  inspiration_references?: Array<{
    company_name: string;
    summary: string;
    link: string;
  }>;
  market_analysis?: {
    market_size_potential: string;
    competitor_landscape: string[];
    competitive_advantage: string;
    emerging_trends?: string;
    customer_personas?: Array<{
      persona_name: string;
      demographics: string;
      pain_points: string;
      decision_drivers: string;
    }>;
  };
  product_service_details?: {
    features_functionality: string[];
    technology_stack?: string;
    development_roadmap?: Array<{
      phase: string;
      deliverables: string[];
      estimated_timeline: string;
    }>;
    proof_of_concept_links?: string[];
  };
  business_model?: {
    revenue_streams: string[];
    pricing_strategy?: string;
    cost_structure?: string[];
    unit_economics?: {
      lifetime_value: string;
      customer_acquisition_cost: string;
      payback_period: string;
    };
  };
  marketing_sales_strategy?: {
    customer_acquisition_channels: string[];
    marketing_campaigns?: Array<{
      campaign_name: string;
      objective: string;
      key_metrics: string[];
    }>;
    sales_process_overview?: string;
    channel_partners?: string[];
  };
  team_management?: {
    key_team_members?: Array<{
      name: string;
      role: string;
      background: string;
    }>;
    organizational_structure?: string;
    hiring_plan?: Array<{
      position: string;
      timeline: string;
      required_skills: string[];
    }>;
    advisory_board?: string[];
  };
  financial_projections?: {
    startup_costs_estimate?: string;
    funding_requirements?: string;
    break_even_point?: string;
    projected_revenue_growth?: string;
    key_financial_ratios?: {
      gross_margin: string;
      net_margin: string;
      burn_rate: string;
    };
  };
  risk_mitigation?: {
    potential_risks: string[];
    mitigation_strategies: string[];
    fallback_plans?: string[];
  };
  next_steps_roadmap?: Array<{
    milestone: string;
    deliverable: string;
    due_date: string;
  }>;
  summary_conclusion?: string;
}

const categories = BUSINESS_CATEGORIES.sort();
const difficulties = ['Beginner', 'Intermediate', 'Advanced'];
const marketSizes = ['Niche', 'Local', 'National', 'Global'];
const investmentNeeds = ['Minimal', 'Low ($1k-$10k)', 'Medium ($10k-$100k)', 'High ($100k+)'];
const timelines = ['Short-term (0-6 months)', 'Medium-term (6-12 months)', 'Long-term (12+ months)'];

const CreateIdea: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    category: categories[0] || '',
    description: '',
    idea_content: '',
    tags: '',
    difficulty: difficulties[0] || '',
    market_size: marketSizes[0] || '',
    investment_needed: investmentNeeds[0] || '',
    timeline: timelines[0] || '',
    youtube_link: '',
    full_book_link: '',
    affiliate_links: '',
  });
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<string | null>(null);

  const categoryRef = useRef<HTMLDivElement>(null);
  const difficultyRef = useRef<HTMLDivElement>(null);
  const marketSizeRef = useRef<HTMLDivElement>(null);
  const investmentRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => prev.filter(err => !err.toLowerCase().includes(field.replace('_', ' ').toLowerCase())));
    setGeneralError(null);
  };

  const openPicker = (pickerName: string, ref: React.RefObject<HTMLDivElement>) => {
    setActivePicker(activePicker === pickerName ? null : pickerName);
  };

  const handlePickerSelect = (field: string, value: string) => {
    handleInputChange(field, value);
    setActivePicker(null);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading || !user) {
      alert('Please log in to upload a business idea.');
      navigate('/profile'); // Adjust to your auth route
      return;
    }

    const errors: string[] = [];
    if (!formData.title.trim()) errors.push('Title is required.');
    if (!formData.category) errors.push('Category is required.');
    if (!formData.description.trim()) errors.push('Short Description is required.');
    if (!formData.idea_content.trim()) errors.push('Detailed Idea Content is required.');
    if (!formData.difficulty) errors.push('Difficulty is required.');
    if (!formData.market_size.trim()) errors.push('Market Size is required.');
    if (!formData.investment_needed.trim()) errors.push('Investment Needed is required.');
    if (!formData.timeline) errors.push('Estimated Timeline is required.');

    if (errors.length > 0) {
      setFormErrors(errors);
      setGeneralError(null);
      alert(errors.join('\n'));
      return;
    }

    setIsProcessingAI(true);
    setIsUploading(false);
    setUploadProgress(0);
    setFormErrors([]);
    setGeneralError(null);

    let structuredIdeaContent: StructuredIdeaContent | null = null;

    try {
      const aiPrompt = `
        You are an expert business analyst and content generator. Your task is to generate a highly detailed, comprehensive, and valuable business idea blueprint based on the provided raw idea.
        The generated content should be rich with insights, actionable advice, and thorough explanations for each section, aiming for a total read time of 10-20 minutes.
        Elaborate significantly on all fields within the 'StructuredIdeaContent' schema. For string fields, provide multi-paragraph explanations (at least 2-3 paragraphs per major point). For array fields, generate multiple, specific, and detailed items (at least 3-5 items per array, or more if logically applicable).
        The output MUST be a JSON object strictly conforming to the 'StructuredIdeaContent' interface.
        Business Idea to Analyze and Elaborate:
        Title: "${formData.title}"
        Short Description: "${formData.description}"
        Detailed Content Provided: "${formData.idea_content}"
      `;

      let chatHistory = [{ role: "user", parts: [{ text: aiPrompt }] }];

      const payload = {
        contents: chatHistory,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              overview: {
                type: "OBJECT",
                properties: {
                  problem: { type: "STRING" },
                  solution: { type: "STRING" },
                  target_audience: { type: "STRING" },
                  unique_selling_proposition: { type: "STRING" },
                  origin_story: { type: "STRING" },
                  motivational_quote: { type: "STRING" }
                },
                required: ["problem", "solution", "target_audience", "unique_selling_proposition"]
              },
              inspiration_references: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    company_name: { type: "STRING" },
                    summary: { type: "STRING" },
                    link: { type: "STRING" }
                  },
                  required: ["company_name", "summary", "link"]
                }
              },
              market_analysis: {
                type: "OBJECT",
                properties: {
                  market_size_potential: { type: "STRING" },
                  competitor_landscape: { type: "ARRAY", items: { type: "STRING" } },
                  competitive_advantage: { type: "STRING" },
                  emerging_trends: { type: "STRING" },
                  customer_personas: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        persona_name: { type: "STRING" },
                        demographics: { type: "STRING" },
                        pain_points: { type: "STRING" },
                        decision_drivers: { type: "STRING" }
                      },
                      required: ["persona_name", "demographics", "pain_points", "decision_drivers"]
                    }
                  }
                }
              },
              product_service_details: {
                type: "OBJECT",
                properties: {
                  features_functionality: { type: "ARRAY", items: { type: "STRING" } },
                  technology_stack: { type: "STRING" },
                  development_roadmap: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        phase: { type: "STRING" },
                        deliverables: { type: "ARRAY", items: { type: "STRING" } },
                        estimated_timeline: { type: "STRING" }
                      },
                      required: ["phase", "deliverables", "estimated_timeline"]
                    }
                  },
                  proof_of_concept_links: { type: "ARRAY", items: { type: "STRING" } }
                }
              },
              business_model: {
                type: "OBJECT",
                properties: {
                  revenue_streams: { type: "ARRAY", items: { type: "STRING" } },
                  pricing_strategy: { type: "STRING" },
                  cost_structure: { type: "ARRAY", items: { type: "STRING" } },
                  unit_economics: {
                    type: "OBJECT",
                    properties: {
                      lifetime_value: { type: "STRING" },
                      customer_acquisition_cost: { type: "STRING" },
                      payback_period: { type: "STRING" }
                    },
                    required: ["lifetime_value", "customer_acquisition_cost", "payback_period"]
                  }
                }
              },
              marketing_sales_strategy: {
                type: "OBJECT",
                properties: {
                  customer_acquisition_channels: { type: "ARRAY", items: { type: "STRING" } },
                  marketing_campaigns: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        campaign_name: { type: "STRING" },
                        objective: { type: "STRING" },
                        key_metrics: { type: "ARRAY", items: { type: "STRING" } }
                      },
                      required: ["campaign_name", "objective", "key_metrics"]
                    }
                  }
                }
              },
              team_management: {
                type: "OBJECT",
                properties: {
                  key_team_members: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        name: { type: "STRING" },
                        role: { type: "STRING" },
                        background: { type: "STRING" }
                      },
                      required: ["name", "role", "background"]
                    }
                  }
                }
              },
              financial_projections: {
                type: "OBJECT",
                properties: {
                  startup_costs_estimate: { type: "STRING" },
                  funding_requirements: { type: "STRING" },
                  break_even_point: { type: "STRING" },
                  projected_revenue_growth: { type: "STRING" },
                  key_financial_ratios: {
                    type: "OBJECT",
                    properties: {
                      gross_margin: { type: "STRING" },
                      net_margin: { type: "STRING" },
                      burn_rate: { type: "STRING" }
                    },
                    required: ["gross_margin", "net_margin", "burn_rate"]
                  }
                }
              },
              risk_mitigation: {
                type: "OBJECT",
                properties: {
                  potential_risks: { type: "ARRAY", items: { type: "STRING" } },
                  mitigation_strategies: { type: "ARRAY", items: { type: "STRING" } },
                  fallback_plans: { type: "ARRAY", items: { type: "STRING" } }
                }
              },
              next_steps_roadmap: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    milestone: { type: "STRING" },
                    deliverable: { type: "STRING" },
                    due_date: { type: "STRING" }
                  },
                  required: ["milestone", "deliverable", "due_date"]
                }
              },
              summary_conclusion: { type: "STRING" }
            },
            required: ["overview"]
          }
        }
      };

      const apiKey = process.env.VITE_GEMINI_API_KEY || '';
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`AI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts) {
        const jsonText = result.candidates[0].content.parts[0].text;
        structuredIdeaContent = JSON.parse(jsonText);
        setUploadProgress(50);
      } else {
        throw new Error("AI failed to generate structured content.");
      }

      setIsProcessingAI(false);
      setIsUploading(true);
      setUploadProgress(50);

      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      const affiliateLinksArray = formData.affiliate_links.split(',').map(link => link.trim()).filter(link => link.length > 0);

      const ideaData = {
        user_id: user.id,
        title: formData.title,
        short_description: formData.description,
        content_text: formData.idea_content,
        structured_idea_content: structuredIdeaContent,
        category: formData.category,
        difficulty: formData.difficulty,
        market_size: formData.market_size,
        investment_needed: formData.investment_needed,
        timeline: formData.timeline,
        tags: tagsArray,
        youtube_link: formData.youtube_link || null,
        full_book_link: formData.full_book_link || null,
        affiliate_links: affiliateLinksArray.length > 0 ? affiliateLinksArray : null,
        views: 0,
        likes: 0,
        comments: 0,
        is_featured: false,
      };

      const { data, error } = await supabase
        .from('business_ideas')
        .insert([ideaData])
        .select();

      if (error) throw error;

      setUploadProgress(100);
      setIsUploading(false);
      setUploadComplete(true);

      alert('Upload Successful! Your business idea has been uploaded and structured successfully.');
      if (data && data.length > 0) {
        navigate(`/ideas/${data[0].id}`, { state: { ideaTitle: data[0].title } });
      } else {
        navigate('/ideas');
      }
    } catch (err: any) {
      setIsProcessingAI(false);
      setIsUploading(false);
      setUploadProgress(0);
      setGeneralError(err.message || 'An unexpected error occurred during idea submission.');
      alert(err.message || 'There was an error submitting your idea. Please try again.');
    }
  }, [user, authLoading, formData, navigate]);

  const handleNewUpload = () => {
    setFormData({
      title: '',
      category: categories[0] || '',
      description: '',
      idea_content: '',
      tags: '',
      difficulty: difficulties[0] || '',
      market_size: marketSizes[0] || '',
      investment_needed: investmentNeeds[0] || '',
      timeline: timelines[0] || '',
      youtube_link: '',
      full_book_link: '',
      affiliate_links: '',
    });
    setUploadComplete(false);
    setIsProcessingAI(false);
    setIsUploading(false);
    setUploadProgress(0);
    setFormErrors([]);
    setGeneralError(null);
  };

  const renderPicker = (
    pickerName: string,
    label: string,
    value: string,
    options: string[],
    ref: React.RefObject<HTMLDivElement>,
    icon: string,
    required: boolean = true
  ) => (
    <div className="input-group">
      <label className="label">
        <i className={`ion-${icon}`} /> {label} {required && <span className="required-indicator">*</span>}
      </label>
      <div className="picker-display" ref={ref} onClick={() => openPicker(pickerName, ref)}>
        <input type="text" value={value || `Select ${label.toLowerCase()}`} readOnly />
        <i className="ion-chevron-down" />
      </div>
      {activePicker === pickerName && (
        <div className="picker-container">
          {options.map((option, index) => (
            <div
              key={index}
              className="picker-item"
              onClick={() => handlePickerSelect(pickerName, option)}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading user data...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-prompt-container">
        <p>Please log in to upload a business idea.</p>
        <button onClick={() => navigate('/profile')} className="login-button">
          Go to Login
        </button>
      </div>
    );
  }

  if (uploadComplete) {
    return (
      <div className="upload-complete-container">
        <i className="ion-checkmark-circle-outline" />
        <h2>Upload Successful!</h2>
        <p>Your business idea "{formData.title}" has been uploaded and structured successfully.</p>
        <div className="upload-complete-buttons">
          <button onClick={() => navigate('/ideas')} className="upload-complete-button">
            View Dashboard
          </button>
          <button onClick={handleNewUpload} className="upload-complete-button secondary">
            Upload Another Idea
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="create-idea-container">
      <h1>Upload New Business Idea</h1>
      <p className="subtitle">Share your detailed business idea with the OGONJO community</p>

      {generalError && <div className="error-box"><p>{generalError}</p></div>}
      {formErrors.length > 0 && (
        <div className="error-box">
          {formErrors.map((err, index) => <p key={index}>• {err}</p>)}
        </div>
      )}

      <div className="card">
        <h2>Idea Details</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label">
              <i className="ion-text-outline" /> Idea Title <span className="required-indicator">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., AI-Powered Personal Finance Assistant"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              disabled={isProcessingAI || isUploading}
              required
            />
          </div>

          <div className="input-group">
            <label className="label">
              <i className="ion-reader-outline" /> Short Description <span className="required-indicator">*</span>
            </label>
            <textarea
              placeholder="Brief overview of your idea, its problem, and solution."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isProcessingAI || isUploading}
              required
            />
          </div>

          <div className="input-group">
            <label className="label">
              <i className="ion-document-text-outline" /> Detailed Idea Content <span className="required-indicator">*</span>
            </label>
            <textarea
              className="content-textarea"
              placeholder="Elaborate on your idea: target audience, unique features, business model, market analysis, etc."
              value={formData.idea_content}
              onChange={(e) => handleInputChange('idea_content', e.target.value)}
              disabled={isProcessingAI || isUploading}
              required
            />
            <p className="help-text">Provide a comprehensive write-up of your business idea.</p>
          </div>

          {renderPicker('category', 'Category', formData.category, categories, categoryRef, 'apps-outline', true)}
          {renderPicker('difficulty', 'Difficulty', formData.difficulty, difficulties, difficultyRef, 'trending-up-outline', true)}
          {renderPicker('market_size', 'Market Size', formData.market_size, marketSizes, marketSizeRef, 'people-outline', true)}
          {renderPicker('investment_needed', 'Investment Needed', formData.investment_needed, investmentNeeds, investmentRef, 'wallet-outline', true)}
          {renderPicker('timeline', 'Estimated Timeline', formData.timeline, timelines, timelineRef, 'hourglass-outline', true)}

          <div className="input-group">
            <label className="label">
              <i className="ion-pricetags-outline" /> Tags <span className="optional-indicator">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., AI, Fintech, SaaS (comma-separated)"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              disabled={isProcessingAI || isUploading}
            />
            <p className="help-text">Separate tags with commas.</p>
          </div>

          <div className="input-group">
            <label className="label">
              <i className="ion-logo-youtube" /> YouTube Link <span className="optional-indicator">(Optional)</span>
            </label>
            <input
              type="url"
              placeholder="e.g., https://youtube.com/watch?v=xyz"
              value={formData.youtube_link}
              onChange={(e) => handleInputChange('youtube_link', e.target.value)}
              disabled={isProcessingAI || isUploading}
            />
          </div>

          <div className="input-group">
            <label className="label">
              <i className="ion-link-outline" /> Full Idea/Resource Link <span className="optional-indicator">(Optional)</span>
            </label>
            <input
              type="url"
              placeholder="e.g., https://example.com/full-idea-document"
              value={formData.full_book_link}
              onChange={(e) => handleInputChange('full_book_link', e.target.value)}
              disabled={isProcessingAI || isUploading}
            />
          </div>

          <div className="input-group">
            <label className="label">
              <i className="ion-cart-outline" /> Affiliate Links <span className="optional-indicator">(Optional)</span>
            </label>
            <textarea
              placeholder="e.g., link1.com, link2.com (comma-separated)"
              value={formData.affiliate_links}
              onChange={(e) => handleInputChange('affiliate_links', e.target.value)}
              disabled={isProcessingAI || isUploading}
            />
            <p className="help-text">Separate multiple links with commas.</p>
          </div>

          <button type="submit" className="submit-button" disabled={isProcessingAI || isUploading}>
            {isProcessingAI || isUploading ? (
              <>
                <div className="spinner"></div>
                {isProcessingAI ? `Generating AI Content (${Math.round(uploadProgress)}%)` : `Uploading Idea (${Math.round(uploadProgress)}%)`}
              </>
            ) : (
              'Submit Idea'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateIdea;