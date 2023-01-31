interface Portfolio {
  success: boolean;
  statusCode: number;
  value: PortfolioResults;
}

interface PortfolioResults {
  totalValueInUSD: number;
  portfolio: PortfolioData[];
}

interface PortfolioData {
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

export type { Portfolio };
