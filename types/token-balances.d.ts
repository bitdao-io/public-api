export interface TokenBalances {
  success: boolean;
  statusCode: number;
  results: TokenBalancesResults;
}

export interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
}

export interface TokenBalancesResults {
  bitTotalSupply: string;
  bitBalancesData: {
    address: string;
    tokenBalances: TokenBalance[];
  };
  bitLPTokenBalancesData: {
    address: string;
    tokenBalances: TokenBalance[];
  };
  bitBurnedBalancesData: {
    address: string;
    tokenBalances: TokenBalance[];
  };
  bitCirculatingSupply: string;
}

// export { TokenBalances };
