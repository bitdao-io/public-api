// Return graphql server as next request handler
import type { NextApiRequest, NextApiResponse } from "next";

// Construct subgraph flavoured graphql server
import { createSubgraph } from "subgraphql";

// Map from the internal api to GraphQL Entity arrays
import { mapPortfolioData } from "./mappings/portfolioData";
import { mapTokenBalanceData } from "./mappings/tokenBalanceData";

// We define these two tokens manually so that they're present for buyback joins incase the other mapped data doesn't include them
import { USDT_CONTRACT_ADDRESS } from "@/config/general";

// Export a new handler at the requested graphqlEndpoint (this should match the api path)
export default createSubgraph<NextApiRequest, NextApiResponse>({
  // needs to be defined explicitly because our endpoint lives at a different path other than `/graphql`
  // - see: https://github.com/vercel/next.js/blob/canary/examples/api-routes-graphql/pages/api/graphql.ts
  graphqlEndpoint: `/api/v1/graphql`, // would be nice if we could infer this
  // pass in the subgraph style schema
  schema: `

    type Token @entity {
      id: ID!
      tokenBalances: [TokenBalance!]! @derivedFrom(field: "token")
      holders: [Holder!]! @derivedFrom(field: "token")
      portfolioBalances: [PortfolioBalance!]! @derivedFrom(field: "token")
      address: Bytes!
      symbol: String!
      name: String!
      decimals: Int!
      logo: String!
    }

    type TokenBalance @entity {
      id: ID!
      token: Token!
      address: Bytes!
      name: String!
      totalSupply: BigDecimal!
      circulatingSupply: BigDecimal!
      lockedTotal: BigDecimal!
      mantleCoreTotal: BigDecimal!
      balanceTotal: BigDecimal!
      LPTokenTotal: BigDecimal!
      balances: [Holder!]! @derivedFrom(field: "token")
    }

    type Holder @entity {
      id: ID
      name: String!
      token: TokenBalance!
      tokenBalance: BigDecimal!
    }

    type Portfolio @entity {
      id: ID!
      name: String!
      totalValueInUSD: BigDecimal!
      totalValueInUSDAbbrv: String!
      portfolio: [PortfolioBalance!]! @derivedFrom(field: "portfolio")
    }

    type PortfolioBalance @entity {
      id: ID!
      portfolio: Portfolio!
      heldBy: String!
      token: Token!
      amount: BigDecimal!
      price: BigDecimal!
      value: BigDecimal!
      perOfHoldings: String!
    }
  `,
  // setup the entities
  entities: async () => {
    // define usdt and bit manually for buyback joins
    const tokens = [
      // {
      //   id: TOKEN_CONTRACT_ADDRESS,
      //   address: TOKEN_CONTRACT_ADDRESS,
      //   symbol: "MNT",
      //   name: "Mantle",
      //   decimals: 18,
      //   logo: "https://w3s.link/ipfs/bafybeiejli4rjcqvjsld4wprhylfa6uvhta5vhivauh3bc6x56hracob3i/token-logo.png",
      // },
      {
        id: USDT_CONTRACT_ADDRESS,
        address: USDT_CONTRACT_ADDRESS,
        symbol: "USDT",
        name: "Tether",
        decimals: 6,
        logo: "https://static.alchemyapi.io/images/assets/825.png",
      },
    ];

    // map all entities from the mapping fns (they can mutate the tokens list by ref)
    const [{ portfolios, portfolioBalances }, { tokenBalances, holders }] =
      await Promise.all([
        mapPortfolioData(tokens),
        mapTokenBalanceData(tokens),
      ]);

    // provide the entities as an object of arrays (mapped 1:1 against the @entities defined in the schema)
    return {
      Token: tokens,
      Holder: holders,
      TokenBalance: tokenBalances,
      Portfolio: portfolios,
      PortfolioBalance: portfolioBalances,
    };
  },
  // set a default query for graphiql
  defaultQuery: `
    {
      # these balances reflect onchain values....
      tokenBalances {
        LPTokenTotal
        balanceTotal
        lockedTotal
        mantleCoreTotal
        totalSupply
        balances {
          name
          tokenBalance
          token {
            name
            address
          }
        }
      }
      # these balances reflect onchain values...
      portfolios {
        name
        totalValueInUSD
        totalValueInUSDAbbrv
        portfolio(where: { amount_gt: "1000" }) {
          amount
          id
          heldBy
          perOfHoldings
          price
          value
          token {
            address
            name
            symbol
          }
        }
      }
    }
  `,
});
