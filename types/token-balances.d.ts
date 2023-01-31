interface TokenBalances {
  success: boolean;
  statusCode: number;
  results: TokenBalancesResults;
}

interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
}

interface TokenBalancesResults {
  bitTotalSupply: string;
  bitBalancesData: {
    address: string;
    tokenBalances: TokenBalance[];
  };
  bitLPTokenBalancesData: {
    address: string;
    tokenBalances: TokenBalance[];
  };
  bitCirculatingSupply: string;
}

export type { TokenBalances };
