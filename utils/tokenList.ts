export enum ChainID {
  Mainnet = 1,
  Mantle = 5000,
  Goerli = 5,
  MantleTestnet = 5001,
}

export interface Token {
  chainId: ChainID;
  address: `0x${string}`;
  addressL2?: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  extensions: {
    optimismBridgeAddress: `0x${string}`;
  };
  balance?: bigint | number | string;
  allowance?: bigint;
}

export interface TokenList {
  name: string;
  logoURI: string;
  keywords: Array<string>;
  tokens: Array<Token>;
  timestamp: string;
}
export const getTokenList = async () => {
  const fetchTokens = await fetch(
    "https://token-list.mantle.xyz/mantle.tokenlist.json"
  );
  const response = await fetchTokens.json();

  const l2Tokens = response?.tokens.filter((v: Token) => {
    return v.chainId === 5000;
  });
  const l1Tokens = response?.tokens.filter((v: Token) => {
    return v.chainId === 1;
  });

  l2Tokens.map((token: Token) => {
    token.addressL2 = token.address;
    token.address = l1Tokens.find((tok: Token) => {
      return tok.symbol === token.symbol;
    }).address;
    return token;
  });

  return { l2Tokens, l1Tokens };
};
