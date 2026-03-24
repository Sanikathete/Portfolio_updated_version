export const INDIAN_STOCKS = [
  { symbol: 'RELIANCE', company: 'Reliance Industries', sector: 'Energy', exchange: 'NSE', price: 2847.5, change: 1.24, sentiment: 'Positive', sentimentScore: 0.78 },
  { symbol: 'TCS', company: 'Tata Consultancy Services', sector: 'IT', exchange: 'NSE', price: 3421.0, change: -0.45, sentiment: 'Neutral', sentimentScore: 0.52 },
  { symbol: 'INFY', company: 'Infosys Ltd', sector: 'IT', exchange: 'NSE', price: 1456.8, change: 0.89, sentiment: 'Positive', sentimentScore: 0.71 },
  { symbol: 'HDFCBANK', company: 'HDFC Bank Ltd', sector: 'Banking', exchange: 'NSE', price: 1623.4, change: -1.12, sentiment: 'Negative', sentimentScore: 0.32 },
  { symbol: 'WIPRO', company: 'Wipro Ltd', sector: 'IT', exchange: 'NSE', price: 478.6, change: 2.31, sentiment: 'Positive', sentimentScore: 0.81 },
  { symbol: 'BAJFINANCE', company: 'Bajaj Finance Ltd', sector: 'Finance', exchange: 'NSE', price: 6892.0, change: 0.67, sentiment: 'Positive', sentimentScore: 0.65 },
  { symbol: 'ICICIBANK', company: 'ICICI Bank Ltd', sector: 'Banking', exchange: 'NSE', price: 1089.3, change: 1.55, sentiment: 'Positive', sentimentScore: 0.74 },
  { symbol: 'LTIM', company: 'LTIMindtree Ltd', sector: 'IT', exchange: 'NSE', price: 5234.7, change: -0.23, sentiment: 'Neutral', sentimentScore: 0.49 },
  { symbol: 'AXISBANK', company: 'Axis Bank Ltd', sector: 'Banking', exchange: 'NSE', price: 1067.2, change: 0.94, sentiment: 'Positive', sentimentScore: 0.68 },
  { symbol: 'SBIN', company: 'State Bank of India', sector: 'Banking', exchange: 'NSE', price: 812.4, change: -0.78, sentiment: 'Neutral', sentimentScore: 0.55 },
  { symbol: 'MARUTI', company: 'Maruti Suzuki India', sector: 'Auto', exchange: 'NSE', price: 11240.0, change: 1.02, sentiment: 'Positive', sentimentScore: 0.72 },
  { symbol: 'TATAMOTORS', company: 'Tata Motors Ltd', sector: 'Auto', exchange: 'NSE', price: 923.6, change: 2.14, sentiment: 'Positive', sentimentScore: 0.77 },
  { symbol: 'SUNPHARMA', company: 'Sun Pharmaceutical', sector: 'Pharma', exchange: 'NSE', price: 1678.9, change: -0.56, sentiment: 'Neutral', sentimentScore: 0.51 },
  { symbol: 'HINDUNILVR', company: 'Hindustan Unilever', sector: 'FMCG', exchange: 'NSE', price: 2234.5, change: 0.33, sentiment: 'Positive', sentimentScore: 0.63 },
  { symbol: 'NESTLEIND', company: 'Nestle India Ltd', sector: 'FMCG', exchange: 'NSE', price: 24560.0, change: -0.14, sentiment: 'Neutral', sentimentScore: 0.58 },
];

export const generateChartData = (days: number, base: number, volatility: number) =>
  Array.from({ length: days }, (_, index) => ({
    date: new Date(Date.now() - (days - index) * 86400000).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    value: Math.round((base + (Math.random() - 0.48) * volatility * index * 0.1) * 100) / 100,
  }));

export const MOCK_PORTFOLIO = [
  { symbol: 'TCS', company: 'Tata Consultancy Services', quantity: 10, buyPrice: 3200, currentPrice: 3421, pe: 28.4, discount: 6.85, sector: 'IT' },
  { symbol: 'INFY', company: 'Infosys Ltd', quantity: 25, buyPrice: 1380, currentPrice: 1456.8, pe: 22.1, discount: 5.56, sector: 'IT' },
  { symbol: 'RELIANCE', company: 'Reliance Industries', quantity: 5, buyPrice: 2700, currentPrice: 2847.5, pe: 31.2, discount: 5.46, sector: 'Energy' },
  { symbol: 'HDFCBANK', company: 'HDFC Bank Ltd', quantity: 15, buyPrice: 1700, currentPrice: 1623.4, pe: 19.8, discount: -4.51, sector: 'Banking' },
  { symbol: 'WIPRO', company: 'Wipro Ltd', quantity: 50, buyPrice: 420, currentPrice: 478.6, pe: 17.6, discount: 13.95, sector: 'IT' },
];

export const MOCK_NEWS = [
  { id: 1, headline: 'TCS Wins $2.5B Deal With European Banking Giant', summary: 'Tata Consultancy Services secures a multi-year digital transformation contract, boosting investor confidence ahead of Q4 results.', sentiment: 'Positive', score: 0.84, source: 'Economic Times', time: '2 hours ago', ticker: 'TCS' },
  { id: 2, headline: 'RBI Holds Repo Rate at 6.5% Amid Global Uncertainty', summary: 'Reserve Bank of India maintains status quo on interest rates as global inflation concerns persist, impacting banking sector outlook.', sentiment: 'Neutral', score: 0.51, source: 'Mint', time: '4 hours ago', ticker: 'HDFCBANK' },
  { id: 3, headline: 'Reliance Retail Eyes 500 New Outlets in FY2025', summary: 'Reliance Retail plans aggressive expansion across Tier 2 and Tier 3 cities with fresh capital allocation of Rs 12,000 crore.', sentiment: 'Positive', score: 0.79, source: 'Business Standard', time: '6 hours ago', ticker: 'RELIANCE' },
  { id: 4, headline: 'Infosys Cuts FY25 Revenue Guidance to 1-3%', summary: 'Infosys revises its annual revenue growth guidance downward citing sluggish demand from North American BFSI clients.', sentiment: 'Negative', score: 0.22, source: 'NDTV Profit', time: '8 hours ago', ticker: 'INFY' },
  { id: 5, headline: 'Wipro Partners With NVIDIA for AI Infrastructure Push', summary: 'Wipro announces a strategic partnership with NVIDIA to co-develop AI-powered enterprise solutions for global clients.', sentiment: 'Positive', score: 0.88, source: 'Financial Express', time: '12 hours ago', ticker: 'WIPRO' },
  { id: 6, headline: 'HDFC Bank Q3 NPA Ratio Rises Slightly to 1.26%', summary: 'HDFC Bank reports marginal uptick in gross NPA ratio, though management remains confident about asset quality trajectory.', sentiment: 'Negative', score: 0.31, source: 'Reuters India', time: '1 day ago', ticker: 'HDFCBANK' },
  { id: 7, headline: 'Bajaj Finance Reports 28% YoY AUM Growth in Q3', summary: 'Strong consumer lending demand drives Bajaj Finance to record assets under management growth exceeding analyst estimates.', sentiment: 'Positive', score: 0.83, source: 'Moneycontrol', time: '1 day ago', ticker: 'BAJFINANCE' },
  { id: 8, headline: 'Tata Motors EV Sales Hit Record 25,000 Units in February', summary: 'Tata Motors EV division posts best-ever monthly sales, capturing 62% of domestic electric passenger vehicle market share.', sentiment: 'Positive', score: 0.91, source: 'Autocar India', time: '2 days ago', ticker: 'TATAMOTORS' },
];
