export const ANALYSIS_ACTIONS = [
  "Technical Analysis",
  "Fundamental Analysis",
  "Stock Performance",
  "Market Performance",
  "Sector Rotation",
] as const;

export type AnalysisAction = (typeof ANALYSIS_ACTIONS)[number];

export const ANALYSIS_MARKETS = [
  "Korea (KOSPI)",
  "Thailand (SET)",
  "Japan (Nikkei)",
] as const;

export type AnalysisMarket = (typeof ANALYSIS_MARKETS)[number];

/** Market Performance and Sector Rotation are market-wide, not tied to a single stock. */
export function actionNeedsStock(action: AnalysisAction): boolean {
  return action !== "Market Performance" && action !== "Sector Rotation";
}

interface BuildAnalysisPromptInput {
  action: AnalysisAction;
  market: AnalysisMarket;
  stock: string;
}

export function buildAnalysisPrompt({ action, market, stock }: BuildAnalysisPromptInput): string {
  const symbol = stock.trim();

  switch (action) {
    case "Technical Analysis":
      return `/stock-analysis Run a technical analysis on ${symbol} in the ${market} market.`;
    case "Fundamental Analysis":
      return `/stock-analysis Run a fundamental analysis on ${symbol} in the ${market} market.`;
    case "Stock Performance":
      return `/stock-analysis Analyze the recent performance of ${symbol} in the ${market} market.`;
    case "Market Performance":
      return `/stock-analysis Analyze the overall performance of the ${market} market.`;
    case "Sector Rotation":
      return `/stock-analysis Run a sector rotation analysis for the ${market} market. Include both outstanding (leading) sectors and underperforming (lagging) sectors.`;
  }
}
