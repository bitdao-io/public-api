interface TreasuryToken {
  address: string | `0x${string}`;
  amount: number;
  decimals: number;
  logo: string;
  name: string;
  price: number;
  symbol: string;
  value: number;
  perOfHoldings: string;
  parent: string;
}

export type { TreasuryToken };
