// Fetch portfolio data for these addresses
import {
  BITDAO_TREASURY_ADDRESS,
  BITDAO_LP_WALLET_ADDRESS,
} from "@/config/general";

// Convert bigNumber to abbreviated number (1B, 10M etc...)
import { abbrvNumber } from "@/services/analytics";

// Map data exposed in this endpoint to graphql entities
import { dataHandler as PortfolioBalance } from "../../portfolio/[[...addresses]]";

// map Portfolio data entries into the portfolioBalance entity and record any missing Tokens
export const mapPortfolioData = async (tokens: { address: string }[]) => {
  // wrap in a try catch to avoid 500 error
  try {
    // get the balance data
    const _portfolioBalances = await PortfolioBalance(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      process.env.ALCHEMY_API_KEY!,
      [BITDAO_TREASURY_ADDRESS, BITDAO_LP_WALLET_ADDRESS]
    );

    // construct an array to hold the single portfolio
    const portfolios = [
      {
        id: `${BITDAO_TREASURY_ADDRESS}-${BITDAO_LP_WALLET_ADDRESS}`,
        name: `BitDAO Treasury`,
        totalValueInUSD: _portfolioBalances.totalValueInUSD,
        totalValueInUSDAbbrv: abbrvNumber(_portfolioBalances.totalValueInUSD),
      },
    ];

    // construct array of PortfolioBalances
    const portfolioBalances = _portfolioBalances.portfolio.map((balance, key) => {
      // if this is an LP balance then we should make a new token to show it as such
      const tokenAddress = balance.parent === BITDAO_LP_WALLET_ADDRESS ? balance.parent + '-' + balance.address : balance.address
      // record the token if its not in the tokens list
      const tokenIndex = tokens.findIndex((token) => {
        return token.address === tokenAddress;
      });
      const token = {
        id: tokenAddress,
        address: balance.address,
        symbol: balance.symbol,
        name: (balance.parent === BITDAO_LP_WALLET_ADDRESS ? "Univ3 LP " : "") + balance.name,
        decimals: balance.decimals,
        logo: balance.logo,
      };
      if (tokenIndex === -1) {
        tokens.push(token);
      } else {
        tokens.splice(tokenIndex, 1, token);
      }

      // conforms to schema
      return {
        id: `BitDAO Treasury-${key}`,
        portfolio: `${BITDAO_TREASURY_ADDRESS}-${BITDAO_LP_WALLET_ADDRESS}`,
        heldBy: balance.parent,
        token: tokenAddress,
        amount: balance.amount,
        perOfHoldings: balance.perOfHoldings,
        // lock the value and price to 2dps (these are USD amounts)
        value: parseFloat(`${Math.round(balance.value * 100) / 100}`),
        price: parseFloat(`${Math.round(balance.price * 100) / 100}`),
      };
    });

    // return the mapped entities
    return {
      portfolios,
      portfolioBalances,
      tokens,
    };
  } catch {

    // return empty mapping
    return {
      tokens,
      portfolios: [],
      portfolioBalances: [],
    };
  }
};
