// Return graphql server as next request handler
import type { NextApiRequest, NextApiResponse } from "next";

// Construct subgraph flavoured graphql server
import { createSubgraph } from "subgraphql";

// Map from the internal api to GraphQL Entity arrays
import { mapBuybacksData } from "./mappings/buybacksData";
import { mapAnalyticsData } from "./mappings/analyticsData";
import { mapPortfolioData } from "./mappings/portfolioData";
import { mapTokenBalanceData } from "./mappings/tokenBalanceData";

// We define these two tokens manually so that they're present for buyback joins incase the other mapped data doesn't include them
import { BITDAO_CONTRACT_ADDRESS, USDT_CONTRACT_ADDRESS } from "@/config/general";

// Export a new handler at the requested graphqlEndpoint (this should match the api path)
export default createSubgraph<NextApiRequest, NextApiResponse>({
  // needs to be defined explicitly because our endpoint lives at a different path other than `/graphql`
  // - see: https://github.com/vercel/next.js/blob/canary/examples/api-routes-graphql/pages/api/graphql.ts
  graphqlEndpoint: `/api/v1/graphql`, // would be nice if we could infer this
  // pass in the subgraph style schema
  schema: `
    type Analytic @entity {
      id: ID!
      entries: [AnalyticEntry!]! @derivedFrom(field: "analytics")
      total: BigDecimal!
      totalAbbrv: String!
    }

    type AnalyticEntry @entity {
      id: ID!
      analytics: Analytic!
      date: String!
      dateTime: Timestamp!
      ethPrice: BigDecimal!
      bitPrice: BigDecimal!
      tradeVolume: BigDecimal!
      contributeVolume: BigDecimal!
      ethAmount: BigDecimal!
      ethCount: BigDecimal!
      usdtAmount: BigDecimal!
      usdtCount: BigDecimal!
      bitAmount: BigDecimal!
      bitCount: BigDecimal!
    }

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
      burnedTotal: BigDecimal!
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

    type Buyback @entity {
      id: ID!
      date_time_utc: Timestamp!
      asset_1: Token!
      asset_1_amount: BigDecimal!
      asset_2: Token!
      asset_2_amount: BigDecimal!
      rate: BigDecimal!
    }
  `,
  // setup the entities
  entities: async () => {    
    // define usdt and bit manually for buyback joins
    const tokens = [
      {
        id: BITDAO_CONTRACT_ADDRESS,
        address: BITDAO_CONTRACT_ADDRESS,
        symbol: "BIT",
        name: "BitDAO",
        decimals: 18,
        logo: "https://static.alchemyapi.io/images/assets/11221.png",
      },
      {
        id: USDT_CONTRACT_ADDRESS,
        address: USDT_CONTRACT_ADDRESS,
        symbol: "USDT",
        name: "Tether",
        decimals: 6,
        logo: "https://static.alchemyapi.io/images/assets/825.png",
      }
    ];

    // map all entities from the mapping fns (they can mutate the tokens list by ref)
    const [
      buybacks,
      { analytics, analyticEntries },
      { portfolios, portfolioBalances },
      { tokenBalances, holders }
    ] = await Promise.all([
      mapBuybacksData(),
      mapAnalyticsData(),
      mapPortfolioData(tokens),
      mapTokenBalanceData(tokens),
    ])
  
    // provide the entities as an object of arrays (mapped 1:1 against the @entities defined in the schema)
    return {
      Analytic: analytics,
      AnalyticEntry: analyticEntries,
      Token: tokens,
      Holder: holders,
      TokenBalance: tokenBalances,
      Portfolio: portfolios,
      PortfolioBalance: portfolioBalances,
      Buyback: buybacks
    };
  },
  // set a default query for graphiql
  defaultQuery: `
    {
      # a new analyticsEntry will be added every day...
      analytics {
        total
        totalAbbrv
        entries(first: 1) {
          date
          bitAmount
          bitCount
          bitPrice
          contributeVolume
          ethAmount
          ethCount
          ethPrice
          tradeVolume
          usdtAmount
          usdtCount
        }
      }
      # this data will not change...
      buybacks(skip: 144905, orderBy: date_time_utc, orderDirection: desc) {
        id
        date_time_utc
        asset_1 {
          symbol
          logo
          name
          decimals
        }
        asset_2 {
          symbol
          logo
          name
          decimals
        }
        asset_1_amount
        asset_2_amount
        rate
      }
      # these balances reflect onchain values....
      tokenBalances {
        LPTokenTotal
        balanceTotal
        lockedTotal
        burnedTotal
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
