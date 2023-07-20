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
  totalSupply: string;
  treasuryBalanceData: {
    address: string;
    tokenBalances: TokenBalance[];
  };
  treasuryLPBalanceData: {
    address: string;
    tokenBalances: TokenBalance[];
  };
  lockedBalancesData: {
    address: string;
    tokenBalances: TokenBalance[];
  };
  mantleCoreData: {
    address: string;
    tokenBalances: TokenBalance[];
  };
  treasuryBalanceTotal: string;
  treasuryLPTokenTotal: string;
  mantleCoreTotal: string;
  lockedTotal: string;
  circulatingSupply: string;
}

// export { TokenBalances };
