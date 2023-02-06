export interface Portfolio {
  success: boolean;
  statusCode: number;
  value: PortfolioResults;
}

export interface PortfolioResults {
  totalValueInUSD: number;
  portfolio: PortfolioData[];
}

export interface PortfolioData {
  address: string;
  amount: number;
  logo: string;
  name: string;
  price: number;
  symbol: string;
  decimals: number;
  value: number;
  perOfHoldings: string;
}

// export type { Portfolio };
