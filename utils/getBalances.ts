import { ERC20ABI } from "@/config/general";
import { toHex } from "viem";
import { Token } from "./tokenList";
import { publicClient } from "./web3Client";

const nonZeroTokenBalances = (totalBalances: Token[]) => {
  return totalBalances.filter((token: Token) => {
    return token.balance !== "0";
  });
};

const mapBalances = (tokens: Token[], owner: `0x${string}`) => {
  return tokens.map((token) => {
    return {
      contractAddress: (token.address as string).toLowerCase(),
      error: null,

      tokenBalance: token.balance,
    };
  });
};

export const fetchBalances = async (
  owner: `0x${string}`,
  l2Tokens: [Token]
) => {
  const flattenTokens = l2Tokens.flatMap(
    (token) => token.addressL2 as `0x${string}`
  );
  // map every token to their contract
  const contractsSet = flattenTokens.map((element) => {
    return {
      address: element,
      abi: ERC20ABI,
      functionName: "balanceOf",
      args: [owner],
    };
  });

  // multicall every token contract to fetch the owner balances
  const balance = await publicClient.multicall({
    contracts: contractsSet,
  });

  l2Tokens.map((token, index) => {
    return (token.balance = toHex(balance[index]?.result as string));
  });
  const nonZero = nonZeroTokenBalances(l2Tokens);
  const result = mapBalances(nonZero, owner);
  return result;
};
