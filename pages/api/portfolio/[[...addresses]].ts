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

    let totalBalances: Array<TokenBalance> = [];
    const alchemy = new Alchemy(alchemySettings);
    for (const address of addresses) {
      // TODO: parallelize this: check all `await` cases
      const balances = await alchemy.core.getTokenBalances(address);
      totalBalances = [...totalBalances, ...balances.tokenBalances];
    }

    const nonZeroTokenBalances = totalBalances.filter((token: TokenBalance) => {
      return token.tokenBalance !== HashZero;
    });

    const ethBalanceInBigNumber = await alchemy.core.getBalance(addresses[0]);
    // RE: https://docs.ethers.io/v5/api/utils/bignumber/#BigNumber--notes-safenumbers
    const ethBalanceInNumber = Number(
      formatUnits(ethBalanceInBigNumber, ETH_DECIMALS)
    );

    const tokensAddresses = nonZeroTokenBalances.map(
      (token: TokenBalance) => token.contractAddress
    );

    const ethUSDPriceResponse = await fetch(
      `${COIN_GECKO_API_URL}simple/price?ids=ethereum&vs_currencies=USD`
    );
    const { ethereum } = await ethUSDPriceResponse.json(); // TODO: type it

    const ethToken: TreasuryToken = {
      address: "eth",
      amount: ethBalanceInNumber,
      logo: "https://token-icons.s3.amazonaws.com/eth.png",
      name: "Ethereum",
      price: ethereum.usd,
      symbol: "ETH",
      decimals: ETH_DECIMALS,
      value: ethBalanceInNumber * ethereum.usd,
    };

    const tokenUSDPricesResponse = await fetch(
      `${COIN_GECKO_API_URL}simple/token_price/ethereum?contract_addresses=${tokensAddresses.toString()}&vs_currencies=USD`
    );
    const tokenUSDPrices = await tokenUSDPricesResponse.json(); // TODO: type it

    const withPriceNonZeroBalances = nonZeroTokenBalances.filter(
      (token: TokenBalance) => {
        return tokenUSDPrices[token.contractAddress]?.usd;
      }
    );

    let totalValueInUSD = 0;
    const erc20Tokens = [];
    for (const item of withPriceNonZeroBalances) {
      const balanceInString = item.tokenBalance;

      const metadata = await alchemy.core.getTokenMetadata(
        item.contractAddress
      );

      const balanceInNumber = balanceInString
        ? Number(formatUnits(balanceInString, metadata.decimals || 18))
        : 0;

      const erc20Token: TreasuryToken = {
        address: item.contractAddress,
        amount: balanceInNumber,
        name: metadata.name ?? "",
        symbol: metadata.symbol ?? "",
        decimals: metadata.decimals ?? 18, // TODO: double-check it
        logo: metadata.logo ?? "",
        price: tokenUSDPrices[item.contractAddress].usd,
        value: balanceInNumber * tokenUSDPrices[item.contractAddress].usd,
      };

      erc20Tokens.push(erc20Token);
      totalValueInUSD += erc20Token.value;
    }

    totalValueInUSD += ethToken.value;
    const portfolio = [...erc20Tokens, ethToken];

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
