import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto'; // Import Chart.js directly for React

const BusinessCanvasGuide: React.FC = () => {
    const appData = {
        bmc: {
            'kp': { title: 'Key Partnerships', definition: 'The network of suppliers and partners that make the business model work.', guidance: 'Identify key suppliers, intermediaries, and allies. Define mutual benefits and evaluate performance regularly.' },
            'ka': { title: 'Key Activities', definition: 'The most important things a company must do to make its business model work.', guidance: 'Outline essential tasks like production, marketing, and sales. Continuously refine core processes for scalability.' },
            'kr': { title: 'Key Resources', definition: 'The most important assets required to make a business model work.', guidance: 'List critical physical, intellectual, human, and financial resources. Distinguish essentials from "nice-to-haves".' },
            'vp': { title: 'Value Propositions', definition: 'The bundle of products and services that create value for a specific Customer Segment.', guidance: 'Clearly articulate why customers should choose your offering. Focus on the "jobs to be done" and the unique benefits you provide.' },
            'cr': { title: 'Customer Relationships', definition: 'The types of relationships a company establishes with specific Customer Segments.', guidance: 'Align your relationship strategy (e.g., personal, automated) with customer expectations. Consider loyalty programs or community building.' },
            'cs': { title: 'Customer Segments', definition: 'The different groups of people or organizations an enterprise aims to reach and serve.', guidance: 'Define primary customers and segment them by demographics, behaviors, or needs. Avoid being too broad or too narrow.' },
            'ch': { title: 'Channels', definition: 'How a company communicates with and reaches its Customer Segments to deliver a Value Proposition.', guidance: 'Determine the most effective touchpoints (web, sales, social). Track metrics to optimize reach and customer experience.' },
            'cost': { title: 'Cost Structure', definition: 'All costs incurred to operate a business model.', guidance: 'List all significant fixed and variable costs. Decide on a cost-driven (lean) vs. value-driven (premium) approach.' },
            'rev': { title: 'Revenue Streams', definition: 'The cash a company generates from each Customer Segment.', guidance: 'Define how customers pay for value (e.g., sales, subscription, fees). Test pricing structures to find the optimal model.' },
        },
        lc: {
            'problem': { title: 'Problem', definition: 'A list of the top 1-3 problems your target customers face.', guidance: 'Focus on real pain points. Interview potential users and list existing alternatives they currently use.' },
            'solution': { title: 'Solution', definition: 'A brief description of the solution for each problem.', guidance: 'Outline the main features that address the identified problems. Get customer feedback to validate your solution.' },
            'metrics': { title: 'Key Metrics', definition: 'The key numbers that tell you how your business is doing.', guidance: 'Identify the most important metrics that track progress and success. The AARRR (Pirate) model is a good starting point.' },
            'uvp': { title: 'Unique Value Proposition', definition: 'A clear message that states why you are different and worth buying.', guidance: 'Articulate what makes your offering superior and unique. It should be a single, clear, compelling message.' },
            'advantage': { title: 'Unfair Advantage', definition: 'Something that cannot be easily copied or bought by competitors.', guidance: 'This could be insider information, a "dream team", expert endorsements, or an existing strong community.' },
            'cs': { title: 'Customer Segments', definition: 'The target audience for your product.', guidance: 'Be specific and identify "early adopters"—the customers you will target first for validation and feedback.' },
            'channels': { title: 'Channels', definition: 'Your path to customers.', guidance: 'List the free and paid channels you will use to reach your customers. Focus on channels where your target segments are present.' },
            'cost': { title: 'Cost Structure', definition: 'List your fixed and variable costs.', guidance: 'Outline all operational costs, including customer acquisition costs, hosting, and salaries. Ensure customer lifetime value exceeds acquisition cost.' },
            'rev': { title: 'Revenue Streams', definition: 'How you will make money.', guidance: 'List your sources of revenue. Consider your pricing model (e.g., subscription, one-time payment) and potential lifetime value of a customer.' },
        },
        practices: {
            best: [
                { icon: '🎯', text: '<strong>Start with a Clear Purpose:</strong> Define the business objective before filling out the canvas.' },
                { icon: '🔄', text: '<strong>Validate Continuously:</strong> Treat every block as a hypothesis to be tested with real customers.' },
                { icon: '✍️', text: '<strong>Be Specific & Measurable:</strong> Avoid vague terms. Define segments and channels precisely.' },
                { icon: '🤝', text: '<strong>Focus on Problem-Solution Fit:</strong> Especially for Lean Canvas, deeply understand the pain point first.' },
                { icon: '👁️', text: '<strong>Keep it Concise & Visual:</strong> Use sticky notes or short phrases. The power is in the overview.' },
                { icon: '👥', text: '<strong>Foster Collaboration:</strong> Involve the entire team to build shared understanding and alignment.' },
            ],
            pitfalls: [
                { icon: '🤔', text: '<strong>Vague Customer Segments:</strong> "Everyone" is not a customer segment. This leads to poor targeting.' },
                { icon: '❓', text: '<strong>Untestable Assumptions:</strong> Making claims that cannot be validated or refuted wastes time.' },
                { icon: '🗣️', text: '<strong>High-Level Problem Statements:</strong> Not focusing on specific pain points makes solutions irrelevant.' },
                { icon: '📉', text: '<strong>Ignoring Financial Viability:</strong> A great idea is not a business if the costs outweigh the revenue.' },
                { icon: '🚫', text: '<strong>Lack of Iteration:</strong> Treating the canvas as a one-time static document instead of a living tool.' },
                { icon: '📢', text: '<strong>Poor Channel Strategy:</strong> Listing general channels like "social media" without a specific plan.' },
            ]
        }
    };

    const [activeTab, setActiveTab] = useState('compare');
    const [activeBmcBlock, setActiveBmcBlock] = useState<string | null>('vp');
    const [activeLcBlock, setActiveLcBlock] = useState<string | null>('problem');
    const [bmcGeminiResponse, setBmcGeminiResponse] = useState('');
    const [lcGeminiResponse, setLcGeminiResponse] = useState('');
    const [isBmcGeminiLoading, setIsBmcGeminiLoading] = useState(false);
    const [isLcGeminiLoading, setIsLcGeminiLoading] = useState(false);
    const [businessIdeaInput, setBusinessIdeaInput] = useState('');
    const [leanCanvasAiOutput, setLeanCanvasAiOutput] = useState('');
    const [isIdeaAnalysisLoading, setIsIdeaAnalysisLoading] = useState(false);

    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    // Chart.js Initialization
    useEffect(() => {
        if (chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy(); // Destroy existing chart if it exists
            }
            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                chartInstance.current = new Chart(ctx, {
                    type: 'radar',
                    data: {
                        labels: ['Problem Focus', 'Agility/Speed', 'Risk Mitigation', 'External Focus (Partners)', 'Internal Operations', 'Scalability'],
                        datasets: [{
                            label: 'Lean Canvas',
                            data: [6, 6, 5, 2, 3, 4],
                            backgroundColor: 'rgba(13, 148, 136, 0.2)',
                            borderColor: 'rgb(13, 148, 136)',
                            pointBackgroundColor: 'rgb(13, 148, 136)',
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: 'rgb(13, 148, 136)'
                        }, {
                            label: 'Business Model Canvas',
                            data: [3, 4, 3, 6, 6, 6],
                            backgroundColor: 'rgba(217, 119, 6, 0.2)',
                            borderColor: 'rgb(217, 119, 6)',
                            pointBackgroundColor: 'rgb(217, 119, 6)',
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: 'rgb(217, 119, 6)'
                        }]
                    },
                    options: {
                        maintainAspectRatio: false,
                        responsive: true,
                        scales: {
                            r: {
                                beginAtZero: true,
                                max: 6,
                                pointLabels: {
                                    font: {
                                        size: 13
                                    }
                                },
                                ticks: {
                                    stepSize: 1,
                                    display: false
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                position: 'top',
                            }
                        }
                    }
                });
            }
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, []);

    // Effect to update BMC details on activeBmcBlock change
    useEffect(() => {
        if (activeBmcBlock) {
            setBmcGeminiResponse('');
        }
    }, [activeBmcBlock]);

    // Effect to update LC details on activeLcBlock change
    useEffect(() => {
        if (activeLcBlock) {
            setLcGeminiResponse('');
        }
    }, [activeLcBlock]);

    const getGeminiGuidance = async (blockTitle: string, blockDefinition: string, type: 'bmc' | 'lc') => {
        if (type === 'bmc') {
            setIsBmcGeminiLoading(true);
            setBmcGeminiResponse('<span class="flex items-center"><svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating guidance...</span>');
        } else {
            setIsLcGeminiLoading(true);
            setLcGeminiResponse('<span class="flex items-center"><svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating guidance...</span>');
        }

        let promptText = '';
        if (type === 'bmc') {
            promptText = `You are an expert business consultant specializing in Business Model Canvases. Provide concise, actionable guidance for filling out the '${blockTitle}' block (Definition: "${blockDefinition}"). Focus on key questions to consider, what information to include, and common mistakes to avoid for this specific block. Keep it to about 5-6 sentences.`;
        } else {
            promptText = `You are an expert startup advisor specializing in Lean Canvas. Provide concise, actionable guidance for identifying and defining the '${blockTitle}' block (Definition: "${blockDefinition}"). What critical questions should a startup ask themselves regarding this block? Keep it to about 5-6 sentences.`;
        }

        try {
            let chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: promptText }] });
            const payload = { contents: chatHistory };
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                if (type === 'bmc') setBmcGeminiResponse(text);
                else setLcGeminiResponse(text);
            } else {
                const errorMsg = '<span class="text-red-700">Error: Could not get AI guidance. Please try again.</span>';
                if (type === 'bmc') setBmcGeminiResponse(errorMsg);
                else setLcGeminiResponse(errorMsg);
                console.error('Gemini API response structure unexpected:', result);
            }
        } catch (error: any) {
            const errorMsg = `<span class="text-red-700">Error: ${error.message}. Failed to fetch AI guidance.</span>`;
            if (type === 'bmc') setBmcGeminiResponse(errorMsg);
            else setLcGeminiResponse(errorMsg);
            console.error('Error calling Gemini API:', error);
        } finally {
            if (type === 'bmc') setIsBmcGeminiLoading(false);
            else setIsLcGeminiLoading(false);
        }
    };

    const handleAnalyzeIdea = async () => {
        if (!businessIdeaInput.trim()) {
            setLeanCanvasAiOutput('<div class="p-4 text-red-700 bg-red-50 rounded-md">Please enter your business idea to get AI guidance.</div>');
            return;
        }

        setIsIdeaAnalysisLoading(true);
        setLeanCanvasAiOutput('<div class="text-center text-slate-600 p-8 flex items-center justify-center"><svg class="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating your Lean Canvas insights...</div>');

        const promptText = `Given the business idea: '${businessIdeaInput}', generate initial content for each block of a Lean Canvas. For each block, provide a concise suggestion (2-4 sentences) relevant to this specific idea. Format your response as a JSON object with keys: 'problem', 'solution', 'uvp', 'advantage', 'cs', 'channels', 'metrics', 'cost', 'rev'.`;

        try {
            let chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: promptText }] });
            const payload = {
                contents: chatHistory,
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            "problem": { "type": "STRING", "description": "Concise suggestion for the Problem block, focusing on customer pain points." },
                            "solution": { "type": "STRING", "description": "Concise suggestion for the Solution block, outlining the core offering." },
                            "uvp": { "type": "STRING", "description": "Concise suggestion for the Unique Value Proposition." },
                            "advantage": { "type": "STRING", "description": "Concise suggestion for the Unfair Advantage." },
                            "cs": { "type": "STRING", "description": "Concise suggestion for the Customer Segments, including early adopters." },
                            "channels": { "type": "STRING", "description": "Concise suggestion for the Channels." },
                            "metrics": { "type": "STRING", "description": "Concise suggestion for Key Metrics." },
                            "cost": { "type": "STRING", "description": "Concise suggestion for Cost Structure." },
                            "rev": { "type": "STRING", "description": "Concise suggestion for Revenue Streams." }
                        },
                        required: ["problem", "solution", "uvp", "advantage", "cs", "channels", "metrics", "cost", "rev"]
                    }
                }
            };
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const jsonString = result.candidates[0].content.parts[0].text;
                const generatedCanvas = JSON.parse(jsonString);

                let outputHtml = '';
                const lcBlockOrder = ['problem', 'solution', 'uvp', 'cs', 'channels', 'metrics', 'cost', 'rev', 'advantage']; // Logical order for display
                const blockTitles: { [key: string]: string } = { // Map keys to display titles
                    'problem': 'Problem', 'solution': 'Solution', 'uvp': 'Unique Value Proposition',
                    'advantage': 'Unfair Advantage', 'cs': 'Customer Segments', 'channels': 'Channels',
                    'metrics': 'Key Metrics', 'cost': 'Cost Structure', 'rev': 'Revenue Streams'
                };

                lcBlockOrder.forEach(key => {
                    if ((generatedCanvas as any)[key]) {
                        outputHtml += `
                            <div class="bg-emerald-50 border border-emerald-200 rounded-md p-4 mb-4">
                                <h4 class="font-semibold text-emerald-700 mb-2">${blockTitles[key] || key.charAt(0).toUpperCase() + key.slice(1)}</h4>
                                <p class="text-slate-700">${(generatedCanvas as any)[key]}</p>
                            </div>
                        `;
                    }
                });
                setLeanCanvasAiOutput(outputHtml);

            } else {
                setLeanCanvasAiOutput('<div class="p-4 text-red-700 bg-red-50 rounded-md">Error: Could not generate AI guidance. Please try a different idea or try again later.</div>');
                console.error('Gemini API response structure unexpected or empty:', result);
            }
        } catch (error: any) {
            setLeanCanvasAiOutput(`<div class="p-4 text-red-700 bg-red-50 rounded-md">Error: ${error.message}. Failed to fetch AI guidance. Please check your network connection.</div>`);
            console.error('Error calling Gemini API:', error);
        } finally {
            setIsIdeaAnalysisLoading(false);
        }
    };

    const createGridItem = (id: string, title: string, canvasType: 'bmc' | 'lc') => {
        const isActive = (canvasType === 'bmc' && activeBmcBlock === id) || (canvasType === 'lc' && activeLcBlock === id);
        const handleClick = () => {
            if (canvasType === 'bmc') {
                setActiveBmcBlock(id);
            } else {
                setActiveLcBlock(id);
            }
        };

        return (
            <div
                key={id}
                id={`${canvasType}-${id}`}
                className={`canvas-grid-item bg-white p-4 h-28 sm:h-32 rounded-lg shadow-sm border-2 ${isActive ? 'border-teal-600 active' : 'border-slate-200'} flex items-center justify-center text-center font-semibold text-slate-700`}
                onClick={handleClick}
            >
                {title}
            </div>
        );
    };

    const bmcBlocks = [
        createGridItem('kp', appData.bmc.kp.title, 'bmc'),
        createGridItem('ka', appData.bmc.ka.title, 'bmc'),
        createGridItem('vp', appData.bmc.vp.title, 'bmc'),
        createGridItem('cr', appData.bmc.cr.title, 'bmc'),
        createGridItem('cs', appData.bmc.cs.title, 'bmc'),
        createGridItem('kr', appData.bmc.kr.title, 'bmc'),
        createGridItem('ch', appData.bmc.ch.title, 'bmc'),
        // These will be replaced by the actual cost and revenue items below to maintain layout
        <div key="bmc-placeholder1" className="col-span-1 sm:col-span-1"></div>,
        <div key="bmc-placeholder2" className="col-span-2 sm:col-span-2"></div>,
    ];

    // Manually place cost and revenue for BMC grid to ensure correct layout
    const bmcCostItem = createGridItem('cost', appData.bmc.cost.title, 'bmc');
    const bmcRevenueItem = createGridItem('rev', appData.bmc.rev.title, 'bmc');

    // Custom rendering for BMC grid to achieve the 3x3 with merged bottom cells look
    const renderBmcGrid = () => (
        <>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {bmcBlocks[0]} {bmcBlocks[1]} {bmcBlocks[2]}
                {bmcBlocks[3]} {bmcBlocks[4]} {bmcBlocks[5]}
                {bmcBlocks[6]}
                {bmcCostItem}
                {bmcRevenueItem}
            </div>
        </>
    );

    const lcBlocks = [
        createGridItem('problem', appData.lc.problem.title, 'lc'),
        createGridItem('solution', appData.lc.solution.title, 'lc'),
        createGridItem('uvp', appData.lc.uvp.title, 'lc'),
        createGridItem('advantage', appData.lc.advantage.title, 'lc'),
        createGridItem('cs', appData.lc.cs.title, 'lc'),
        createGridItem('channels', appData.lc.channels.title, 'lc'),
        createGridItem('metrics', appData.lc.metrics.title, 'lc'),
        createGridItem('cost', appData.lc.cost.title, 'lc'),
        createGridItem('rev', appData.lc.rev.title, 'lc'),
    ];

    const renderLcGrid = () => {
        // Adjust the order for LC display to match typical layout, like:
        // Problem | Solution | UVP
        // Customers| Channels | Metrics
        // Cost Structure | Revenue Streams | Unfair Advantage (often put differently)
        // Re-ordering directly in JSX based on common LC layouts
        return (
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {createGridItem('problem', appData.lc.problem.title, 'lc')}
                {createGridItem('solution', appData.lc.solution.title, 'lc')}
                {createGridItem('uvp', appData.lc.uvp.title, 'lc')}
                {createGridItem('cs', appData.lc.cs.title, 'lc')}
                {createGridItem('channels', appData.lc.channels.title, 'lc')}
                {createGridItem('metrics', appData.lc.metrics.title, 'lc')}
                {createGridItem('cost', appData.lc.cost.title, 'lc')}
                {createGridItem('rev', appData.lc.rev.title, 'lc')}
                {createGridItem('advantage', appData.lc.advantage.title, 'lc')}
            </div>
        );
    };

    const currentBmcBlockData = activeBmcBlock ? appData.bmc[activeBmcBlock as keyof typeof appData.bmc] : null;
    const currentLcBlockData = activeLcBlock ? appData.lc[activeLcBlock as keyof typeof appData.lc] : null;

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 mt-12 border-t border-slate-200 pt-8">
            <header className="text-center mb-10">
                <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-2">Business Canvas Interactive Guide</h1>
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
                <p className="text-lg text-slate-600 max-w-3xl mx-auto">An interactive tool to help startups visualize, analyze, and iterate on their business models. Choose the right canvas and build your strategy.</p>
            </header>

            <main>
                <div className="border-b border-slate-200 mb-8">
                    <nav className="-mb-px flex justify-center space-x-4 sm:space-x-8" aria-label="Tabs">
                        <button
                            className={`tab-button whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'compare' ? 'text-teal-600 border-teal-600' : 'text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                            onClick={() => setActiveTab('compare')}
                        >
                            Compare Canvases
                        </button>
                        <button
                            className={`tab-button whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'bmc' ? 'text-teal-600 border-teal-600' : 'text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                            onClick={() => setActiveTab('bmc')}
                        >
                            Business Model Canvas
                        </button>
                        <button
                            className={`tab-button whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'lc' ? 'text-teal-600 border-teal-600' : 'text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                            onClick={() => setActiveTab('lc')}
                        >
                            Lean Canvas
                        </button>
                        <button
                            className={`tab-button whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'myIdea' ? 'text-teal-600 border-teal-600' : 'text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                            onClick={() => setActiveTab('myIdea')}
                        >
                            My Business Idea (AI)
                        </button>
                        <button
                            className={`tab-button whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'practices' ? 'text-teal-600 border-teal-600' : 'text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                            onClick={() => setActiveTab('practices')}
                        >
                            Best Practices
                        </button>
                    </nav>
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
                {activeTab === 'compare' && (
                    <div className="content-panel fade-in">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Which Canvas is Right for You?</h2>
                            <p className="text-slate-600 max-w-2xl mx-auto">Both frameworks help visualize a business model, but they are designed for different stages and goals. The Lean Canvas focuses on problem-solution fit for early-stage startups, while the Business Model Canvas provides a broader strategic overview for scaling businesses.</p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="font-bold text-xl text-slate-800 text-center mb-4">Canvas Focus Comparison</h3>
                                <div className="chart-container">
                                    <canvas ref={chartRef}></canvas>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="font-bold text-xl text-slate-800 mb-4">Core Differences at a Glance</h3>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-slate-700">🎯 Target Audience</h4>
                                        <p className="text-sm text-slate-600"><strong className="text-teal-700">LC:</strong> Early-stage startups navigating high uncertainty.</p>
                                        <p className="text-sm text-slate-600"><strong className="text-amber-700">BMC:</strong> Established businesses or startups with product-market fit, focusing on scaling.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-700">🔍 Key Focus</h4>
                                        <p className="text-sm text-slate-600"><strong className="text-teal-700">LC:</strong> Problem-centric. Validating a problem worth solving before building.</p>
                                        <p className="text-sm text-slate-600"><strong className="text-amber-700">BMC:</strong> Customer-centric. Creating, delivering, and capturing value efficiently.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-700">🧩 Replaced Blocks</h4>
                                        <p className="text-sm text-slate-600">The Lean Canvas replaces four BMC blocks to better suit startup needs:</p>
                                        <ul className="list-disc list-inside text-sm text-slate-600 mt-1">
                                            <li>Key Partners ➔ <strong className="text-teal-700">Problem</strong></li>
                                            <li>Key Activities ➔ <strong className="text-teal-700">Solution</strong></li>
                                            <li>Key Resources ➔ <strong className="text-teal-700">Key Metrics</strong></li>
                                            <li>Customer Relationships ➔ <strong className="text-teal-700">Unfair Advantage</strong></li>
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
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'bmc' && (
                    <div className="content-panel fade-in">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Business Model Canvas Explorer</h2>
                            <p className="text-slate-600 max-w-2xl mx-auto">Click on any block to learn more. The BMC is a strategic map for understanding, designing, and documenting your business model, focusing on how all parts work together to create and capture value.</p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <div id="bmc-grid" className="grid grid-cols-3 gap-3 sm:gap-4">
                                    {renderBmcGrid()}
                                </div>
                            </div>
                            <div id="bmc-details" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[300px]">
                                <h3 className="font-bold text-xl text-teal-600 mb-2">{currentBmcBlockData?.title || 'Select a block'}</h3>
                                <p className="font-medium text-slate-700 mb-4">{currentBmcBlockData?.definition || 'The details of the selected block will appear here.'}</p>
                                <p className="text-slate-600">{currentBmcBlockData?.guidance}</p>
                                {currentBmcBlockData && (
                                    <>
                                        <button
                                            className={`mt-4 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 ${isBmcGeminiLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            onClick={() => getGeminiGuidance(currentBmcBlockData.title, currentBmcBlockData.definition, 'bmc')}
                                            disabled={isBmcGeminiLoading}
                                        >
                                            {isBmcGeminiLoading ? (
                                                <span className="flex items-center">
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    Generating...
                                                </span>
                                            ) : (
                                                '✨ Get AI Guidance'
                                            )}
                                        </button>
                                        {bmcGeminiResponse && (
                                            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-sm" dangerouslySetInnerHTML={{ __html: bmcGeminiResponse }}></div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'lc' && (
                    <div className="content-panel fade-in">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Lean Canvas Explorer</h2>
                            <p className="text-slate-600 max-w-2xl mx-auto">Click on any block to learn more. The LC is an agile, problem-centric tool designed to help startups find a viable business model by focusing on validation and learning.</p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <div id="lc-grid" className="grid grid-cols-3 gap-3 sm:gap-4">
                                    {renderLcGrid()}
                                </div>
                            </div>
                            <div id="lc-details" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[300px]">
                                <h3 className="font-bold text-xl text-teal-600 mb-2">{currentLcBlockData?.title || 'Select a block'}</h3>
                                <p className="font-medium text-slate-700 mb-4">{currentLcBlockData?.definition || 'The details of the selected block will appear here.'}</p>
                                <p className="text-slate-600">{currentLcBlockData?.guidance}</p>
                                {currentLcBlockData && (
                                    <>
                                        <button
                                            className={`mt-4 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 ${isLcGeminiLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            onClick={() => getGeminiGuidance(currentLcBlockData.title, currentLcBlockData.definition, 'lc')}
                                            disabled={isLcGeminiLoading}
                                        >
                                            {isLcGeminiLoading ? (
                                                <span className="flex items-center">
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    Generating...
                                                </span>
                                            ) : (
                                                '✨ Get AI Guidance'
                                            )}
                                        </button>
                                        {lcGeminiResponse && (
                                            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-sm" dangerouslySetInnerHTML={{ __html: lcGeminiResponse }}></div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'myIdea' && (
                    <div className="content-panel fade-in">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">My Business Idea: AI Consultant</h2>
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
                            <p className="text-slate-600 max-w-2xl mx-auto">Describe your business idea below, and Gemini will help you populate a Lean Canvas with initial insights tailored to your concept. This is a starting point for your strategic planning!</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
                            <label htmlFor="business-idea-input" className="block text-slate-700 text-lg font-semibold mb-2">Describe Your Business Idea:</label>
                            <textarea
                                id="business-idea-input"
                                rows={5}
                                className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 mb-4"
                                placeholder="e.g., 'An online platform connecting local farmers directly with consumers for fresh produce delivery.'"
                                value={businessIdeaInput}
                                onChange={(e) => setBusinessIdeaInput(e.target.value)}
                            ></textarea>
                            <button
                                className={`px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 flex items-center justify-center ${isIdeaAnalysisLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={handleAnalyzeIdea}
                                disabled={isIdeaAnalysisLoading}
                            >
                                {isIdeaAnalysisLoading ? (
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    'Get AI-Powered Lean Canvas'
                                )}
                            </button>
                        </div>

                        {leanCanvasAiOutput && (
                            <div id="lean-canvas-ai-output" className="fade-in" dangerouslySetInnerHTML={{ __html: leanCanvasAiOutput }}></div>
                        )}
                    </div>
                )}

                {activeTab === 'practices' && (
                    <div className="content-panel fade-in">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Best Practices & Common Pitfalls</h2>
                            <p className="text-slate-600 max-w-2xl mx-auto">Building a great canvas is an iterative process. Avoid common mistakes and follow best practices to make your canvas a powerful strategic tool.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-2xl font-bold text-green-600 mb-4 flex items-center">✅ Best Practices</h3>
                                <ul className="space-y-3">
                                    {appData.practices.best.map((item, index) => (
                                        <li key={index} className="text-slate-600 flex items-start">
                                            <span className="mr-3 mt-1">{item.icon}</span><span dangerouslySetInnerHTML={{ __html: item.text }}></span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-2xl font-bold text-red-600 mb-4 flex items-center">❌ Common Pitfalls</h3>
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
                                <ul className="space-y-3">
                                    {appData.practices.pitfalls.map((item, index) => (
                                        <li key={index} className="text-slate-600 flex items-start">
                                            <span className="mr-3 mt-1">{item.icon}</span><span dangerouslySetInnerHTML={{ __html: item.text }}></span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default BusinessCanvasGuide;
