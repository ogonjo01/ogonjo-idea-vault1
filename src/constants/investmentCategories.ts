export const INVESTMENT_CATEGORIES = [
  '📈 Stocks & ETFs',
  '🏘 Real Estate',
  '💰 Crypto & Blockchain',
  '🧾 Bonds & Fixed Income',
  '🏦 Cash & Safe Instruments',
  '⚖️ Commodities & Metals',
  '🧪 Alternatives (VC, Art, etc.)',
  '👵 Retirement & Long-Term',
  '🐣 Beginner’s Corner',
  '📰 Market News & Trends',
] as const;

export type InvestmentCategory = typeof INVESTMENT_CATEGORIES[number];