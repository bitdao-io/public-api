import { formatUnits, getAddress } from "viem";

import { Alchemy, Network, TokenBalance } from "alchemy-sdk";
import { NextApiRequest, NextApiResponse } from "next";

import { MANTLE_TREASURY_ADDRESS } from "config/general";
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

// Get the results using the alchemyApi key provided
// RE: - https://docs.alchemy.com/reference/sdk-gettokenbalances
//     - https://docs.alchemy.com/docs/how-to-get-all-tokens-owned-by-an-address
export const dataHandler = async (alchemyApi: string, addresses: string[]) => {
  alchemySettings.apiKey = String(alchemyApi);

  const alchemy = new Alchemy(alchemySettings);

  const [balancesSet, ethBalanceInBigNumber, { ethereum }] = await Promise.all([
    Promise.all(
      addresses.map(async (item) => {
        return await alchemy.core.getTokenBalances(item);
      })
    ),
    alchemy.core.getBalance(addresses[0]),
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

  let totalBalances: Array<TokenBalance & { parent: string }> = [];
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
  const nonZeroTokenBalances = totalBalances.filter((token: TokenBalance) => {
    return token.tokenBalance !== HashZero;
  });

  // RE: https://docs.ethers.io/v5/api/utils/bignumber/#BigNumber--notes-safenumbers
  const ethBalanceInNumber = Number(
    formatUnits(BigInt(ethBalanceInBigNumber.toString()), ETH_DECIMALS)
  );

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

  const tokensAddresses = nonZeroTokenBalances.map(
    (token: TokenBalance) => token.contractAddress
  );

  let tokenUSDPrices: Record<string, { usd: number }> = {};
  try {
    const tokenUSDPricesResponse = await fetch(
      `${COIN_GECKO_API_URL}simple/token_price/ethereum?contract_addresses=${tokensAddresses.toString()}&vs_currencies=USD&x_cg_pro_api_key=${COIN_GECKO_API_KEY}`
    );

    tokenUSDPrices = (await tokenUSDPricesResponse.json()) as Record<
      string,
      { usd: number }
    >;
  } catch {
    const tokenUSDPricesResponse = await Promise.all(
      tokensAddresses.map(async (address) => {
        const token = await alchemy.core.getTokenMetadata(address);
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
    tokenUSDPrices = tokenUSDPricesResponse.reduce((tokenUSDPrices, set) => {
      tokenUSDPrices[set.token] = {
        usd: set.price,
      };

      return tokenUSDPrices;
    }, {} as Record<string, { usd: number }>);
  }

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

  const metadataSet = await Promise.all(
    withPriceNonZeroBalances.map((item) =>
      alchemy.core.getTokenMetadata(item.contractAddress)
    )
  );

  let totalValueInUSD = ethToken.value;

  const erc20Tokens: Array<TreasuryToken> = [];
  withPriceNonZeroBalances.forEach((item, index) => {
    // dirty filter out bitdao for now
    if (metadataSet[index]?.name !== "BitDAO") {
      const balanceInString = item.tokenBalance;

      const balanceInNumber = balanceInString
        ? Number(
            formatUnits(
              BigInt(balanceInString),
              metadataSet[index].decimals || 18
            )
          )
        : 0;

      const erc20Token: TreasuryToken = {
        address: getAddress(item.contractAddress),
        parent: getAddress(item.parent),
        amount: balanceInNumber,
        name: metadataSet[index].name ?? "",
        symbol: metadataSet[index].symbol ?? "",
        decimals: metadataSet[index].decimals ?? 18, // TODO: double-check it
        logo: metadataSet[index].logo ?? "",
        price: tokenUSDPrices[item.contractAddress].usd || 0,
        value:
          balanceInNumber * (tokenUSDPrices[item.contractAddress].usd || 0),
        perOfHoldings: "%",
      };

      erc20Tokens.push(erc20Token);
      totalValueInUSD += erc20Token.value || 0;
    }
  });

  const portfolio = [...erc20Tokens, ethToken].map((token) => {
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
      addresses = (req.query.addresses[0] as string).split(",");
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
