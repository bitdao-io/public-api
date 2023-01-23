import { HashZero } from "@ethersproject/constants";
import { formatUnits } from "@ethersproject/units";
import { Alchemy, Network, TokenBalance } from "alchemy-sdk";
import { NextApiRequest, NextApiResponse } from "next";

import {
  BITDAO_TREASURY_ADDRESS,
  BITDAO_LP_WALLET_ADDRESS
} from 'config/general';
import { TreasuryToken } from "types/treasury.d";

const CACHE_TIME = 1800;
const COIN_GECKO_API_URL = "https://api.coingecko.com/api/v3/";
const alchemySettings = {
  apiKey: "", // Replace with your Alchemy API Key.
  network: Network.ETH_MAINNET, // Replace with your network.
};
const ETH_DECIMALS = 18;

// RE:
// - https://docs.alchemy.com/reference/sdk-gettokenbalances
// - https://docs.alchemy.com/docs/how-to-get-all-tokens-owned-by-an-address
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

    let addresses = undefined;
    if (req.query.addresses) {
      addresses = (req.query.addresses[0] as string).split(",");
    } else {
      addresses = [
        BITDAO_TREASURY_ADDRESS,
        BITDAO_LP_WALLET_ADDRESS,
      ];
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

    alchemySettings.apiKey = String(req.query.alchemyApi);

    const alchemy = new Alchemy(alchemySettings);
    
    const [balancesSet, ethBalanceInBigNumber, { ethereum }] =
      await Promise.all([
        Promise.all(
          addresses.map(async (item) => {
            return await alchemy.core.getTokenBalances(
              item
            )
          })
        ),
        alchemy.core.getBalance(addresses[0]),
        fetch(
          `${COIN_GECKO_API_URL}simple/price?ids=ethereum&vs_currencies=USD`
        ).then(async (response) => await response.json()),
      ])

    let totalBalances: Array<TokenBalance> = []
    for (const item of balancesSet) {
      totalBalances = [...totalBalances, ...item.tokenBalances]
    }
    const nonZeroTokenBalances = totalBalances.filter((token: TokenBalance) => {
      return token.tokenBalance !== HashZero;
    })

    // RE: https://docs.ethers.io/v5/api/utils/bignumber/#BigNumber--notes-safenumbers
    const ethBalanceInNumber = Number(
      formatUnits(ethBalanceInBigNumber, ETH_DECIMALS)
    );

    const ethToken: TreasuryToken = {
      address: "eth",
      amount: ethBalanceInNumber,
      logo: "https://token-icons.s3.amazonaws.com/eth.png",
      name: "Ethereum",
      price: ethereum.usd,
      symbol: "ETH",
      decimals: ETH_DECIMALS,
      value: ethBalanceInNumber * ethereum.usd,
      perOfHoldings: '%',
    };

    const tokensAddresses = nonZeroTokenBalances.map(
      (token: TokenBalance) => token.contractAddress
    )
    const tokenUSDPricesResponse = await fetch(
      `${COIN_GECKO_API_URL}simple/token_price/ethereum?contract_addresses=${tokensAddresses.toString()}&vs_currencies=USD`
    )
    const tokenUSDPrices = await tokenUSDPricesResponse.json(); // TODO: type it

    const withPriceNonZeroBalances = nonZeroTokenBalances.filter(
      (token: TokenBalance) => {
        return tokenUSDPrices[token.contractAddress]?.usd;
      }
    )

    const metadataSet = await Promise.all(
      withPriceNonZeroBalances.map((item) =>
        alchemy.core.getTokenMetadata(item.contractAddress)
      )
    )

    let totalValueInUSD = ethToken.value;
    const erc20Tokens: Array<TreasuryToken> = []
    withPriceNonZeroBalances.forEach((item, index) => {
      const balanceInString = item.tokenBalance;

      const balanceInNumber = balanceInString
        ? Number(formatUnits(balanceInString, metadataSet[index].decimals || 18))
        : 0;

      const erc20Token: TreasuryToken = {
        address: item.contractAddress,
        amount: balanceInNumber,
        name: metadataSet[index].name ?? "",
        symbol: metadataSet[index].symbol ?? "",
        decimals: metadataSet[index].decimals ?? 18, // TODO: double-check it
        logo: metadataSet[index].logo ?? "",
        price: tokenUSDPrices[item.contractAddress].usd,
        value: balanceInNumber * tokenUSDPrices[item.contractAddress].usd,
        perOfHoldings: '%'
      };

      erc20Tokens.push(erc20Token)
      totalValueInUSD += erc20Token.value
    });

    const portfolio = [...erc20Tokens, ethToken].map((token) => {
      token.perOfHoldings = Math.floor(((100 / totalValueInUSD) * token.value) * 100) / 100 + '%';

      return token;
    });

    res.setHeader(
      "Cache-Control",
      `s-maxage=${CACHE_TIME}, stale-while-revalidate=${2 * CACHE_TIME}`
    );
    res.json({
      success: true,
      statusCode: 200,
      value: { totalValueInUSD, portfolio },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, statusCode: 500, message: error?.message });
  }
};

export default handler;
