import {
  Alchemy,
  Network,
  TokenBalance,
  TokenBalancesResponse,
} from "alchemy-sdk";
import { NextApiRequest, NextApiResponse } from "next";

import {
  BITDAO_BURN_ADDRESS,
  BITDAO_CONTRACT_ADDRESS,
  BITDAO_LOCKED_ADDRESSES,
  BITDAO_LP_WALLET_ADDRESS,
  BITDAO_TREASURY_ADDRESS,
} from "config/general";

import { BigNumber, Contract } from "ethers";
import { formatUnits } from "ethers/lib/utils";

/**
 * @swagger
 * /token-balances:
 *  get:
 *    tags: [Balance]
 *    summary: Get BIT balances
 *
 *    description: |-
 *      **Returns BIT supply balances**
 *
 *    parameters:
 *    - name: alchemyApi
 *      in: query
 *      required: true
 *
 *    responses:
 *
 *      200:
 *        description: token balances
 *        content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenBalances'
 *
 *      500:
 *        description: alchemyApi not provided
 *        success: false
 *        statusCode: 500
 *        message: alchemyApi not provided
 */
const CACHE_TIME = 1800;
const alchemySettings = {
  apiKey: "", // Replace with your Alchemy API Key.
  network: Network.ETH_MAINNET, // Replace with your network.
};

// get the total supply by reasing the contract state
const getTotalSupply = async (alchemy: Alchemy) => {
  // Example reading from a contract directly...
  const provider = await alchemy.config.getProvider();

  const abi = ["function totalSupply() view returns (uint256)"];

  const erc20 = new Contract(BITDAO_CONTRACT_ADDRESS, abi, provider);

  return formatUnits(await erc20.totalSupply(), 18).toString();
};

// subtract locked funds from totalSupplu
const getCirculatingSupply = (
  totalSupply: string,
  bitBalanceTotal: number,
  bitLPTokenTotal: number,
  bitBurnedTotal: number,
  bitLockedTotal: number
) => {
  // take any BIT not in the circulating supply away from totalSupply
  return `${
    parseFloat(totalSupply) -
    bitBalanceTotal -
    bitLPTokenTotal -
    bitBurnedTotal -
    bitLockedTotal
  }`;
};

// returns the actual balance held within the TokenBalancesResponse
const getBalance = (balance: TokenBalancesResponse) => {
  return parseFloat(balance.tokenBalances[0].tokenBalance || "0");
};

// retrieve balance data for BITDAO_CONTRACT_ADDRESS given EOA address
const getBalances = async (alchemy: Alchemy, address: string) => {
  const balances = await alchemy.core.getTokenBalances(address, [
    BITDAO_CONTRACT_ADDRESS,
  ]);

  // normalise each of the discovered balances
  balances.tokenBalances = balances.tokenBalances.map(
    (balance: TokenBalance) => {
      // format to ordinary value (to BIT)
      balance.tokenBalance = formatUnits(
        BigNumber.from(balance.tokenBalance),
        18
      ).toString();

      return balance;
    }
  );

  return balances;
};

// get the results using the alchemyApi key provided
export const dataHandler = async (alchemyApi: string) => {
  alchemySettings.apiKey = String(alchemyApi);

  const alchemy = new Alchemy(alchemySettings);

  // get all async calls in parallel
  const [
    bitTotalSupply,
    bitBalancesData,
    bitLPTokenBalancesData,
    bitBurnedBalancesData,
    // collect up all other addresses into an array (this represents anything passed in BITDAO_LOCKED_ADDRESSES)
    ...bitLockedBalancesData
  ] = await Promise.all([
    getTotalSupply(alchemy),
    getBalances(alchemy, BITDAO_TREASURY_ADDRESS),
    getBalances(alchemy, BITDAO_LP_WALLET_ADDRESS),
    getBalances(alchemy, BITDAO_BURN_ADDRESS),
    // get balance from each of the locked addresses
    ...BITDAO_LOCKED_ADDRESSES.map(async (address) =>
      getBalances(alchemy, address)
    ),
  ]);

  // extract the total from each of the balanceData structs
  const bitBalanceTotal = getBalance(bitBalancesData);
  const bitLPTokenTotal = getBalance(bitLPTokenBalancesData);
  const bitBurnedTotal = getBalance(bitBurnedBalancesData);

  // sum all balances in the list of locked addresses
  const bitLockedTotal = bitLockedBalancesData.reduce(
    (total: number, balance: TokenBalancesResponse) =>
      total + getBalance(balance),
    0
  );

  // construct results
  return {
    bitTotalSupply,
    bitBalancesData,
    bitLPTokenBalancesData,
    bitBurnedBalancesData,
    bitLockedBalancesData,
    // clean totals as strings....
    bitBalanceTotal: `${bitBalanceTotal}`,
    bitLPTokenTotal: `${bitLPTokenTotal}`,
    bitBurnedTotal: `${bitBurnedTotal}`,
    bitLockedTotal: `${bitLockedTotal}`,
    // totalSupply with all locked/burned totals subtracted
    bitCirculatingSupply: getCirculatingSupply(
      bitTotalSupply,
      bitBalanceTotal,
      bitLPTokenTotal,
      bitBurnedTotal,
      bitLockedTotal
    ),
  };
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

    // get the result body from the dataHandler
    const results = await dataHandler(alchemyApi as string);

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
