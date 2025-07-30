// ogonjo-web-app/src/components/IdeaReaderModal.tsx
import React from 'react';
import './IdeaReaderModal.css';

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

interface IdeaReaderModalProps {
  isVisible: boolean;
  onClose: () => void;
  ideaTitle: string;
  structuredIdea: StructuredIdeaContent;
}

const IdeaReaderModal: React.FC<IdeaReaderModalProps> = ({ isVisible, onClose, ideaTitle, structuredIdea }) => {
  if (!isVisible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{ideaTitle}</h2>
          <button className="close-button" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-scrollview">
          <div className="section">
            <h3>Overview</h3>
            <p><strong>Problem:</strong> {structuredIdea.overview.problem}</p>
            <p><strong>Solution:</strong> {structuredIdea.overview.solution}</p>
            <p><strong>Target Audience:</strong> {structuredIdea.overview.target_audience}</p>
            <p><strong>Unique Selling Proposition:</strong> {structuredIdea.overview.unique_selling_proposition}</p>
            {structuredIdea.overview.origin_story && (
              <p><strong>Origin Story:</strong> {structuredIdea.overview.origin_story}</p>
            )}
            {structuredIdea.overview.motivational_quote && (
              <p><strong>Motivational Quote:</strong> {structuredIdea.overview.motivational_quote}</p>
            )}
          </div>

          {structuredIdea.inspiration_references && (
            <div className="section">
              <h3>Inspiration References</h3>
              {structuredIdea.inspiration_references.map((ref, index) => (
                <div key={index}>
                  <p><strong>{ref.company_name}</strong>: {ref.summary}</p>
                  <a href={ref.link} target="_blank" rel="noopener noreferrer">Learn More</a>
                </div>
              ))}
            </div>
          )}

          {structuredIdea.market_analysis && (
            <div className="section">
              <h3>Market Analysis</h3>
              <p><strong>Market Size Potential:</strong> {structuredIdea.market_analysis.market_size_potential}</p>
              <p><strong>Competitor Landscape:</strong></p>
              <ul>
                {structuredIdea.market_analysis.competitor_landscape.map((comp, index) => (
                  <li key={index}>{comp}</li>
                ))}
              </ul>
              <p><strong>Competitive Advantage:</strong> {structuredIdea.market_analysis.competitive_advantage}</p>
              {structuredIdea.market_analysis.emerging_trends && (
                <p><strong>Emerging Trends:</strong> {structuredIdea.market_analysis.emerging_trends}</p>
              )}
              {structuredIdea.market_analysis.customer_personas && (
                <>
                  <p><strong>Customer Personas:</strong></p>
                  {structuredIdea.market_analysis.customer_personas.map((persona, index) => (
                    <div key={index}>
                      <p><strong>{persona.persona_name}</strong></p>
                      <p>Demographics: {persona.demographics}</p>
                      <p>Pain Points: {persona.pain_points}</p>
                      <p>Decision Drivers: {persona.decision_drivers}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {structuredIdea.product_service_details && (
            <div className="section">
              <h3>Product/Service Details</h3>
              <p><strong>Features & Functionality:</strong></p>
              <ul>
                {structuredIdea.product_service_details.features_functionality.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
              {structuredIdea.product_service_details.technology_stack && (
                <p><strong>Technology Stack:</strong> {structuredIdea.product_service_details.technology_stack}</p>
              )}
              {structuredIdea.product_service_details.development_roadmap && (
                <>
                  <p><strong>Development Roadmap:</strong></p>
                  {structuredIdea.product_service_details.development_roadmap.map((phase, index) => (
                    <div key={index}>
                      <p><strong>Phase {phase.phase}</strong></p>
                      <p>Deliverables: {phase.deliverables.join(', ')}</p>
                      <p>Estimated Timeline: {phase.estimated_timeline}</p>
                    </div>
                  ))}
                </>
              )}
              {structuredIdea.product_service_details.proof_of_concept_links && (
                <>
                  <p><strong>Proof of Concept Links:</strong></p>
                  {structuredIdea.product_service_details.proof_of_concept_links.map((link, index) => (
                    <p key={index}><a href={link} target="_blank" rel="noopener noreferrer">Link {index + 1}</a></p>
                  ))}
                </>
              )}
            </div>
          )}

          {structuredIdea.business_model && (
            <div className="section">
              <h3>Business Model</h3>
              <p><strong>Revenue Streams:</strong></p>
              <ul>
                {structuredIdea.business_model.revenue_streams.map((stream, index) => (
                  <li key={index}>{stream}</li>
                ))}
              </ul>
              {structuredIdea.business_model.pricing_strategy && (
                <p><strong>Pricing Strategy:</strong> {structuredIdea.business_model.pricing_strategy}</p>
              )}
              {structuredIdea.business_model.cost_structure && (
                <>
                  <p><strong>Cost Structure:</strong></p>
                  <ul>
                    {structuredIdea.business_model.cost_structure.map((cost, index) => (
                      <li key={index}>{cost}</li>
                    ))}
                  </ul>
                </>
              )}
              {structuredIdea.business_model.unit_economics && (
                <>
                  <p><strong>Unit Economics:</strong></p>
                  <p>Lifetime Value: {structuredIdea.business_model.unit_economics.lifetime_value}</p>
                  <p>Customer Acquisition Cost: {structuredIdea.business_model.unit_economics.customer_acquisition_cost}</p>
                  <p>Payback Period: {structuredIdea.business_model.unit_economics.payback_period}</p>
                </>
              )}
            </div>
          )}

          {structuredIdea.marketing_sales_strategy && (
            <div className="section">
              <h3>Marketing & Sales Strategy</h3>
              <p><strong>Customer Acquisition Channels:</strong></p>
              <ul>
                {structuredIdea.marketing_sales_strategy.customer_acquisition_channels.map((channel, index) => (
                  <li key={index}>{channel}</li>
                ))}
              </ul>
              {structuredIdea.marketing_sales_strategy.marketing_campaigns && (
                <>
                  <p><strong>Marketing Campaigns:</strong></p>
                  {structuredIdea.marketing_sales_strategy.marketing_campaigns.map((campaign, index) => (
                    <div key={index}>
                      <p><strong>{campaign.campaign_name}</strong></p>
                      <p>Objective: {campaign.objective}</p>
                      <p>Key Metrics: {campaign.key_metrics.join(', ')}</p>
                    </div>
                  ))}
                </>
              )}
              {structuredIdea.marketing_sales_strategy.sales_process_overview && (
                <p><strong>Sales Process:</strong> {structuredIdea.marketing_sales_strategy.sales_process_overview}</p>
              )}
              {structuredIdea.marketing_sales_strategy.channel_partners && (
                <>
                  <p><strong>Channel Partners:</strong></p>
                  <ul>
                    {structuredIdea.marketing_sales_strategy.channel_partners.map((partner, index) => (
                      <li key={index}>{partner}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {structuredIdea.team_management && (
            <div className="section">
              <h3>Team & Management</h3>
              {structuredIdea.team_management.key_team_members && (
                <>
                  <p><strong>Key Team Members:</strong></p>
                  {structuredIdea.team_management.key_team_members.map((member, index) => (
                    <div key={index}>
                      <p><strong>{member.name}</strong> - {member.role}</p>
                      <p>Background: {member.background}</p>
                    </div>
                  ))}
                </>
              )}
              {structuredIdea.team_management.organizational_structure && (
                <p><strong>Organizational Structure:</strong> {structuredIdea.team_management.organizational_structure}</p>
              )}
              {structuredIdea.team_management.hiring_plan && (
                <>
                  <p><strong>Hiring Plan:</strong></p>
                  {structuredIdea.team_management.hiring_plan.map((plan, index) => (
                    <div key={index}>
                      <p><strong>{plan.position}</strong></p>
                      <p>Timeline: {plan.timeline}</p>
                      <p>Skills: {plan.required_skills.join(', ')}</p>
                    </div>
                  ))}
                </>
              )}
              {structuredIdea.team_management.advisory_board && (
                <>
                  <p><strong>Advisory Board:</strong></p>
                  <ul>
                    {structuredIdea.team_management.advisory_board.map((member, index) => (
                      <li key={index}>{member}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {structuredIdea.financial_projections && (
            <div className="section">
              <h3>Financial Projections</h3>
              {structuredIdea.financial_projections.startup_costs_estimate && (
                <p><strong>Startup Costs:</strong> {structuredIdea.financial_projections.startup_costs_estimate}</p>
              )}
              {structuredIdea.financial_projections.funding_requirements && (
                <p><strong>Funding Requirements:</strong> {structuredIdea.financial_projections.funding_requirements}</p>
              )}
              {structuredIdea.financial_projections.break_even_point && (
                <p><strong>Break-Even Point:</strong> {structuredIdea.financial_projections.break_even_point}</p>
              )}
              {structuredIdea.financial_projections.projected_revenue_growth && (
                <p><strong>Projected Revenue Growth:</strong> {structuredIdea.financial_projections.projected_revenue_growth}</p>
              )}
              {structuredIdea.financial_projections.key_financial_ratios && (
                <>
                  <p><strong>Key Financial Ratios:</strong></p>
                  <p>Gross Margin: {structuredIdea.financial_projections.key_financial_ratios.gross_margin}</p>
                  <p>Net Margin: {structuredIdea.financial_projections.key_financial_ratios.net_margin}</p>
                  <p>Burn Rate: {structuredIdea.financial_projections.key_financial_ratios.burn_rate}</p>
                </>
              )}
            </div>
          )}

          {structuredIdea.risk_mitigation && (
            <div className="section">
              <h3>Risk Mitigation</h3>
              <p><strong>Potential Risks:</strong></p>
              <ul>
                {structuredIdea.risk_mitigation.potential_risks.map((risk, index) => (
                  <li key={index}>{risk}</li>
                ))}
              </ul>
              <p><strong>Mitigation Strategies:</strong></p>
              <ul>
                {structuredIdea.risk_mitigation.mitigation_strategies.map((strategy, index) => (
                  <li key={index}>{strategy}</li>
                ))}
              </ul>
              {structuredIdea.risk_mitigation.fallback_plans && (
                <>
                  <p><strong>Fallback Plans:</strong></p>
                  <ul>
                    {structuredIdea.risk_mitigation.fallback_plans.map((plan, index) => (
                      <li key={index}>{plan}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {structuredIdea.next_steps_roadmap && (
            <div className="section">
              <h3>Next Steps Roadmap</h3>
              {structuredIdea.next_steps_roadmap.map((step, index) => (
                <div key={index}>
                  <p><strong>Milestone:</strong> {step.milestone}</p>
                  <p>Deliverable: {step.deliverable}</p>
                  <p>Due Date: {step.due_date}</p>
                </div>
              ))}
            </div>
          )}

          {structuredIdea.summary_conclusion && (
            <div className="section">
              <h3>Summary & Conclusion</h3>
              <p>{structuredIdea.summary_conclusion}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdeaReaderModal;
