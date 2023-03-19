// Return graphql server as next request handler
import type { NextApiRequest, NextApiResponse } from "next";

// Construct subgraph flavoured graphql server
import { parse, createSubgraph, Entities } from "subgraphql";

// Base most entity ids on the BITDAO_CONTRACT_ADDRESS
import { BITDAO_CONTRACT_ADDRESS, USDT_CONTRACT_ADDRESS } from "@/config/general";

// Map from the internal api to GraphQL Entity arrays
import { mapAnalyticsData } from "./mappings/analyticsData";
import { mapPortfolioData } from "./mappings/portfolioData";
import { mapTokenBalanceData } from "./mappings/tokenBalanceData";
import { mapBuybacksData } from "./mappings/buybacksData";

// parse the schema into a SimpleSchema
const schema = parse(`
  type Analytic @entity {
    id: ID
    entries: [AnalyticEntry!]! @derivedFrom(field: "analytics")
    total: BigDecimal
    totalAbbrv: String 
  }

  type AnalyticEntry @entity {
    id: ID
    analytics: Analytic!
    date: String
    dateTime: Timestamp
    ethPrice: BigDecimal
    bitPrice: BigDecimal
    tradeVolume: BigDecimal
    contributeVolume: BigDecimal
    ethAmount: BigDecimal
    ethCount: BigDecimal
    usdtAmount: BigDecimal
    usdtCount: BigDecimal
    bitAmount: BigDecimal
    bitCount: BigDecimal
  }

  type Token @entity {
    id: ID!
    tokenBalances: [TokenBalance!]! @derivedFrom(field: "token")
    holders: [Holder!]! @derivedFrom(field: "token")
    portfolioBalances: [PortfolioBalance!]! @derivedFrom(field: "token")
    address: Bytes
    symbol: String
    name: String
    decimals: Int
    logo: String
  }

  type TokenBalance @entity {
    id: ID!
    token: Token!
    address: Bytes
    name: String
    totalSupply: BigDecimal
    circulatingSupply: BigDecimal
    lockedTotal: BigDecimal
    burnedTotal: BigDecimal
    balanceTotal: BigDecimal
    LPTokenTotal: BigDecimal
    balances: [Holder!]! @derivedFrom(field: "token")
  }

  type Holder @entity {
    id: ID
    name: String
    token: TokenBalance!
    tokenBalance: BigDecimal
  }

  type Portfolio @entity {
    id: ID!
    name: String
    totalValueInUSD: BigDecimal
    totalValueInUSDAbbrv: String
    portfolio: [PortfolioBalance!]! @derivedFrom(field: "portfolio")
  }

  type PortfolioBalance @entity {
    id: ID!
    portfolio: Portfolio!
    token: Token!
    amount: BigDecimal
    price: BigDecimal
    value: BigDecimal
    perOfHoldings: String
  }

  type Buyback @entity {
    id: ID!
    date_time_utc: Timestamp
    asset_1: Token
    asset_1_amount: BigDecimal
    asset_2: Token
    asset_2_amount: BigDecimal
    rate: BigDecimal
  }

`);

// run set-up to fill entities async
const setup = async (): Promise<Entities> => {
  // get arrays of entities for each of the schema'd entities
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
  // map these from the mapping fns (they might also mutate the tokens list)
  const { analytics, analyticEntries } = await mapAnalyticsData();
  const { tokenBalances, holders } = await mapTokenBalanceData(tokens);
  const { portfolios, portfolioBalances } = await mapPortfolioData(tokens);

  // resolve data through parser (all results are limited to a max of 500 entries if no 'first' arg is provided)
  const buybacks = await mapBuybacksData()

  // Provide the entities as an object of arrays
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
};

// export a new handler at the requested graphqlEndpoint (this should match the api path)
export default createSubgraph<NextApiRequest, NextApiResponse>({
  // pass in the parsed schema
  schema,
  // setup the entities (can we cache this?)
  entities: setup(),
  // set the enpoint
  graphqlEndpoint: `/api/v1/graphql`,
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
