import { formatUnits, getAddress } from "viem";

import { Alchemy, Network, TokenBalance } from "alchemy-sdk";
import { NextApiRequest, NextApiResponse } from "next";

import { fetchBalances } from "@/utils/getBalances";
import { getTokenList } from "@/utils/tokenList";
import {
  MANTLE_L2_TREASURY_ADDRESS,
  MANTLE_TREASURY_ADDRESS,
} from "config/general";
import { request } from "graphql-request";
import { TreasuryToken } from "types/treasury.d";

/**
 * @swagger
 * /portfolio:
 *  get:
 *    tags: [Balance]
 *    summary: Get treasury balances
 *
 *    description: |-
 *      **Returns balances from all tokens**
 *
 *    parameters:
 *    - name: alchemyApi
 *      in: query
 *      required: true
 *
 *    responses:
 *
 *      200:
 *        description: treasury balances
 *        content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Portfolio'
 *
 *      500:
 *        description: alchemyApi not provided
 *        success: false
 *        statusCode: 500
 *        message: alchemyApi not provided
 */
const HashZero =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const CACHE_TIME = 1800;
const COIN_GECKO_API_URL = "https://pro-api.coingecko.com/api/v3/";
const COIN_GECKO_API_KEY = process.env.COIN_GECKO_API_KEY;
const alchemySettings = {
  apiKey: "", // Replace with your Alchemy API Key.
  network: Network.ETH_MAINNET, // Replace with your network.
};
const ETH_DECIMALS = 18;

const queryLP = `
query QueryLP($address:Bytes!) {
  positions(where: {owner: $address}) {
    id
    pool {
      id
      totalValueLockedETH
      totalValueLockedToken0
      totalValueLockedToken1
      totalValueLockedUSD
    }
    owner
    depositedToken0
    depositedToken1
    token1 {
      decimals
      symbol
      id
      name
    }
    token0 {
      decimals
      id
      name
      symbol
    }
  }
}`;

export interface Positions {
  positions: {
    token0: { id: string };
    token1: { id: string };
    pool: { totalValueLockedToken0: string; totalValueLockedToken1: string };
  }[];
}

const UNISWAP_SUBGRAPH = process.env.NEXT_PUBLIC_UNISWAP_SUBGRAPH;
const getUniswapLP = async (address: string) => {
  const variables = {
    address: address,
  };
  try {
    const data: Positions = await request(
      UNISWAP_SUBGRAPH as string,
      queryLP,
      variables
    );
    const dataTokens = data.positions[0] as {
      token0: { id: string };
      token1: { id: string };
      pool: { totalValueLockedToken0: string; totalValueLockedToken1: string };
    };
    const formatedData: Array<TokenBalance & { isLP: boolean }> = [
      {
        contractAddress: dataTokens.token0.id,
        tokenBalance: dataTokens.pool.totalValueLockedToken0,
        error: null,
        isLP: true,
      },
      {
        contractAddress: dataTokens.token1.id,
        tokenBalance: dataTokens.pool.totalValueLockedToken1,
        error: null,
        isLP: true,
      },
    ];
    return formatedData;
  } catch (error) {
    return { contractAddress: "string", tokenBalance: null, error: error };
  }
};

const getL2Tokens = async () => {
  // get list of L2 mantle tokens
  const { l2Tokens } = await getTokenList();
  // fetch L2 balances
  return fetchBalances(MANTLE_L2_TREASURY_ADDRESS, l2Tokens);
};

// remove duplicates symbols and sum their amounts
const reduceTokens = (data: TreasuryToken[]): TreasuryToken[] => {
  return Object.values(
    data.reduce<Record<string, TreasuryToken>>((acc, el) => {
      const uniqueKey = el.symbol;

      if (!acc[uniqueKey]) {
        acc[uniqueKey] = el;
      } else {
        acc[uniqueKey].amount += el.amount;
        acc[uniqueKey].value += el.value;
      }
      return acc;
    }, {})
  );
};
// Get the results using the alchemyApi key provided
// RE: - https://docs.alchemy.com/reference/sdk-gettokenbalances
//     - https://docs.alchemy.com/docs/how-to-get-all-tokens-owned-by-an-address
export const dataHandler = async (alchemyApi: string, addresses: string[]) => {
  alchemySettings.apiKey = String(alchemyApi);
  const alchemy = new Alchemy(alchemySettings);

  const [
    balancesSet,
    balancesLP,
    balancesSetL2,
    ethBalanceInBigNumber,
    { ethereum },
  ] = await Promise.all([
    // get token balances of every address as balancesSet
    Promise.all(
      addresses.map(async (item) => {
        return alchemy.core.getTokenBalances(item);
      })
    ),
    // get LP positions from uniswap subgraph as balancesLP
    getUniswapLP(addresses[0]),
    // get L2 tokens balances as balancesSetL2
    getL2Tokens(),
    // get eth balance as ethBalanceInBigNumber
    alchemy.core.getBalance(addresses[0]),
    // get current ETH price in USD as ethereum
    fetch(
      `${COIN_GECKO_API_URL}simple/price?ids=ethereum&vs_currencies=USD&x_cg_pro_api_key=${COIN_GECKO_API_KEY}`
    )
      .then(async (response) => await response.json())
      .catch(async () => {
        // fallback
        const res = await fetch(
          `https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD`
        );
        const data = JSON.parse(await res.text());

        return {
          ethereum: {
            usd: data.USD,
          },
        };
      }),
  ]);

  let totalBalances: Array<TokenBalance & { parent: string; isLP?: boolean }> =
    [];

  balancesSet[0].tokenBalances.push(
    ...[
      ...(balancesLP as Array<TokenBalance>),
      ...(balancesSetL2 as Array<TokenBalance>),
    ]
  );

  for (const item of balancesSet) {
    totalBalances = [
      ...totalBalances,
      ...(
        item.tokenBalances as unknown as Array<
          TokenBalance & { parent: string }
        >
      ).map((balance) => {
        balance.parent = item.address;

        return balance;
      }),
    ];
  }
  // remove tokens with zero hashes (no balance in hex)
  const nonZeroTokenBalances = totalBalances.filter((token: TokenBalance) => {
    return token.tokenBalance !== HashZero;
  });

  // RE: https://docs.ethers.io/v5/api/utils/bignumber/#BigNumber--notes-safenumbers
  // need to sum eth on L1 and L2 as eth will have not metadata as not an erc20
  const ethL2 = balancesSetL2.find((token) => {
    return (
      token.contractAddress === "0x0000000000000000000000000000000000000000"
    );
  });
  // sum L1 and L2 eth
  const ethBalanceInNumber =
    Number(
      formatUnits(BigInt(ethBalanceInBigNumber.toString()), ETH_DECIMALS)
    ) + Number(formatUnits(BigInt(ethL2?.tokenBalance || "0"), ETH_DECIMALS));

  // setup api metadata for eth by default
  const ethToken: TreasuryToken = {
    address: "eth",
    parent: getAddress(addresses[0]),
    amount: ethBalanceInNumber,
    logo: "https://token-icons.s3.amazonaws.com/eth.png",
    name: "Ethereum",
    price: ethereum.usd || 0,
    symbol: "ETH",
    decimals: ETH_DECIMALS,
    value: ethBalanceInNumber * ethereum.usd,
    perOfHoldings: "%",
  };
  // create a array of strings for bulk call
  const tokensAddresses = nonZeroTokenBalances.map(
    (token: TokenBalance) => token.contractAddress
  );
  // bulk fetch usd quotes for every token
  let tokenUSDPrices: Record<string, { usd: number }> = {};
  // try first with the paid coingecko account
  try {
    const tokenUSDPricesResponse = await fetch(
      `${COIN_GECKO_API_URL}simple/token_price/ethereum?contract_addresses=${tokensAddresses.toString()}&vs_currencies=USD&x_cg_pro_api_key=${COIN_GECKO_API_KEY}`
    );

    tokenUSDPrices = (await tokenUSDPricesResponse.json()) as Record<
      string,
      { usd: number }
    >;
    // if paid account is failing use the open one
  } catch {
    const tokenUSDPricesResponse = await Promise.all(
      tokensAddresses.map(async (address) => {
        const token = await alchemy.core.getTokenMetadata(address);
        // remove bad tokens and ignore peeps as metadata will be added manually
        if (
          address !== "0xba962a81f78837751be8a177378d582f337084e6" &&
          token.symbol &&
          token.symbol.length < 29 &&
          token.symbol.indexOf(".com") == -1
        ) {
          const res = await fetch(
            `https://min-api.cryptocompare.com/data/price?fsym=${token.symbol}&tsyms=USD`
          );
          const data = JSON.parse(await res.text());

          return {
            token: address,
            price: data.USD,
          };
        } else {
          return {
            token: address,
            price: 0,
          };
        }
      })
    );
    tokenUSDPrices = tokenUSDPricesResponse.reduce(
      (tokenUSDPrices, set) => {
        tokenUSDPrices[set.token] = {
          usd: set.price,
        };

        return tokenUSDPrices;
      },
      {} as Record<string, { usd: number }>
    );
  }

  // remove tokens without usd value
  const withPriceNonZeroBalances = nonZeroTokenBalances.filter(
    (token: TokenBalance) => {
      // price could be missing for peeps -- add it back in here if absent...
      if (
        token.contractAddress === "0xba962a81f78837751be8a177378d582f337084e6"
      ) {
        tokenUSDPrices[token.contractAddress] = tokenUSDPrices[
          token.contractAddress
        ] || {
          usd: 650,
        };
      }

      return tokenUSDPrices[token.contractAddress]?.usd;
    }
  );
  // fetch alchemy erc20 tokens metadata: decimals, symbol, etc we need decimals to convert values
  const metadataSet = await Promise.all(
    withPriceNonZeroBalances.map((item) =>
      alchemy.core.getTokenMetadata(item.contractAddress)
    )
  );
  // create a variable to accumulate the total value of portfolio
  let totalValueInUSD = ethToken.value;

  const erc20Tokens: Array<TreasuryToken> = [];
  withPriceNonZeroBalances.forEach((item, index) => {
    // dirty filter out bitdao for now

    const balanceInString = item.tokenBalance;

    const balanceInNumber = balanceInString
      ? balanceInString.startsWith("0x")
        ? Number(
            formatUnits(
              BigInt(balanceInString),
              metadataSet[index].decimals || 18
            )
          )
        : Number(balanceInString)
      : 0;

    const erc20Token: TreasuryToken = {
      address: getAddress(item.contractAddress),
      parent: getAddress(item.parent),
      amount: balanceInNumber,
      name: `${item.isLP ? "UniV3LP " : ""}${metadataSet[index].name}` ?? "",
      symbol: item.isLP
        ? `${metadataSet[index].symbol}(LP)`
        : metadataSet[index].symbol ?? "",
      decimals: metadataSet[index].decimals ?? 18, // TODO: double-check it
      logo: metadataSet[index].logo?.length
        ? (metadataSet[index].logo as string)
        : "",
      price: tokenUSDPrices[item.contractAddress].usd || 0,
      value: balanceInNumber * (tokenUSDPrices[item.contractAddress].usd || 0),
      perOfHoldings: "%",
    };

    erc20Tokens.push(erc20Token);
    totalValueInUSD += erc20Token.value || 0;
  });

  // cleanup tokens duplication and sum values
  const erc20TokensMerge = reduceTokens(erc20Tokens);
  const portfolio = [ethToken, ...erc20TokensMerge].map((token) => {
    token.perOfHoldings =
      Math.round((100 / totalValueInUSD) * token.value * 100) / 100 + "%";

    return token;
  });

  return { totalValueInUSD, portfolio };
};

// exporting nextjs req handler as default
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const alchemyApi = req.query.alchemyApi;
    if (!alchemyApi) {
      return res.json({
        success: false,
        statusCode: 500,
        message: "alchemyApi not provided",
      });
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    if (req.method == "OPTIONS") {
      res.setHeader(
        "Access-Control-Allow-Methods",
        "PUT, POST, PATCH, DELETE, GET"
      );
      return res.status(200).json({});
    }

    let addresses = undefined;
    if (req.query.addresses) {
      addresses =
        (req.query.addresses[0] as string).split(",") || req.query.addresses;
    } else {
      // addresses = [MANTLE_TREASURY_ADDRESS, BITDAO_LP_WALLET_ADDRESS];
      addresses = [MANTLE_TREASURY_ADDRESS];
    }

    // get the result from dataHandler
    const result = await dataHandler(alchemyApi as string, addresses);

    res.setHeader(
      "Cache-Control",
      `s-maxage=${CACHE_TIME}, stale-while-revalidate=${2 * CACHE_TIME}`
    );
    res.json({
      success: true,
      statusCode: 200,
      value: result,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, statusCode: 500, message: error?.message });
  }
};

export default handler;
