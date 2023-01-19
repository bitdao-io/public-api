import { Alchemy, Network, TokenBalance } from "alchemy-sdk";
import { NextApiRequest, NextApiResponse } from "next";

import {
  BIT_CONTRACT_ADDRESS,
  BIT_BURN_ADDRESS,
  BITDAO_TREASURY_ADDRESS,
  BITDAO_LP_WALLET_ADDRESS
} from "config/general";

import { BigNumber } from "ethers";
import { formatUnits } from "ethers/lib/utils";

const CACHE_TIME = 1800;
const alchemySettings = {
  apiKey: "", // Replace with your Alchemy API Key.
  network: Network.ETH_MAINNET, // Replace with your network.
};

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

    alchemySettings.apiKey = String(req.query.alchemyApi);

    const alchemy = new Alchemy(alchemySettings);

    const getBalances = async (address: string) => {
      const balances = await alchemy.core.getTokenBalances(address, [
        BIT_CONTRACT_ADDRESS,
      ]);
      return balances;
    };

    const normaliseBalances = (balance: TokenBalance) => {
      // format to ordinary value (ef xBIT)
      balance.tokenBalance = formatUnits(
        BigNumber.from(balance.tokenBalance),
        18
      ).toString()

      return balance;
    }

    const results = {
      bitBalancesData: await getBalances(BITDAO_TREASURY_ADDRESS),
      bitLPTokenBalancesData: await getBalances(BITDAO_LP_WALLET_ADDRESS),
      bitBurnedBalancesData: await getBalances(BIT_BURN_ADDRESS),
    };

    // normalise each of the discovered balances
    results.bitBalancesData.tokenBalances = results.bitBalancesData.tokenBalances.map(normaliseBalances)
    results.bitLPTokenBalancesData.tokenBalances = results.bitLPTokenBalancesData.tokenBalances.map(normaliseBalances)
    results.bitBurnedBalancesData.tokenBalances = results.bitBurnedBalancesData.tokenBalances.map(normaliseBalances)

    res.setHeader(
      "Cache-Control",
      `s-maxage=${CACHE_TIME}, stale-while-revalidate=${2 * CACHE_TIME}`
    );
    res.json({
      success: true,
      statusCode: 200,
      results: results,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, statusCode: 500, message: error?.message });
  }
};

export default handler;
