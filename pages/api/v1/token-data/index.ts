import {
  Alchemy,
  Network,
  TokenBalance,
  TokenBalancesResponse,
} from "alchemy-sdk";
import { NextApiRequest, NextApiResponse } from "next";

import {
  BITDAO_LOCKED_ADDRESSES,
  BITDAO_LP_WALLET_ADDRESS,
  MANTLE_CORE_WALLET_ADDRESS,
  MANTLE_TREASURY_ADDRESS,
  TOKEN_CONTRACT_ADDRESS,
} from "config/general";
import { createPublicClient, formatUnits, http, parseAbi } from "viem";
import { mainnet } from "viem/chains";

/**
 * @swagger
 * /token-data:
 *  get:
 *    tags: [Balance]
 *    summary: Get MNT data
 *
 *    description: |-
 *      **Returns MNT supply data**
 *
 *    parameters:
 *    - name: alchemyApi
 *      in: query
 *      required: true
 *
 *    responses:
 *
 *      200:
 *        description: token data
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
  // const provider = await alchemy.config.getProvider();
  const client = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  const abi = "function totalSupply() view returns (uint256)";
  // [
  //   {address:TOKEN_CONTRACT_ADDRESS}
  // ];

  // const erc20 = new Contract(TOKEN_CONTRACT_ADDRESS, abi, provider);
  const erc20 = await client.readContract({
    address: TOKEN_CONTRACT_ADDRESS,
    abi: parseAbi([abi]),
    functionName: "totalSupply",
  });

  return formatUnits(erc20, 18).toString();
};

// subtract locked funds from totalSupplu
const getCirculatingSupply = (
  totalSupply: string,
  mantleCoreTotal: number,
  treasuryBalanceTotal: number,
  treasuryLPTokenTotal: number,
  lockedTotal: number
) => {
  // take any BIT not in the circulating supply away from totalSupply
  return `${
    parseFloat(totalSupply) -
    mantleCoreTotal -
    treasuryBalanceTotal -
    treasuryLPTokenTotal -
    lockedTotal
  }`;
};

// returns the actual balance held within the TokenBalancesResponse
const getBalance = (balance: TokenBalancesResponse) => {
  return parseFloat(balance.tokenBalances[0].tokenBalance || "0");
};

// retrieve balance data for TOKEN_CONTRACT_ADDRESS given EOA address
const getBalances = async (alchemy: Alchemy, address: string) => {
  const balances = await alchemy.core.getTokenBalances(address, [
    TOKEN_CONTRACT_ADDRESS,
  ]);

  // normalise each of the discovered balances
  balances.tokenBalances = balances.tokenBalances.map(
    (balance: TokenBalance) => {
      // format to ordinary value (to BIT)
      balance.tokenBalance = formatUnits(
        BigInt(balance.tokenBalance || 0),
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
    totalSupply,
    mantleCoreData,
    treasuryBalanceData,
    treasuryLPBalanceData,
    // collect up all other addresses into an array (this represents anything passed in BITDAO_LOCKED_ADDRESSES)
    ...lockedBalancesData
  ] = await Promise.all([
    getTotalSupply(alchemy),
    getBalances(alchemy, MANTLE_CORE_WALLET_ADDRESS),
    getBalances(alchemy, MANTLE_TREASURY_ADDRESS),
    getBalances(alchemy, BITDAO_LP_WALLET_ADDRESS),
    // get balance from each of the locked addresses
    ...BITDAO_LOCKED_ADDRESSES.map(async (address) =>
      getBalances(alchemy, address)
    ),
  ]);

  // extract the total from each of the balanceData structs
  const mantleCoreTotal = getBalance(mantleCoreData);
  const treasuryBalanceTotal = getBalance(treasuryBalanceData);
  const treasuryLPTokenTotal = getBalance(treasuryLPBalanceData);

  // sum all balances in the list of locked addresses
  const lockedTotal = lockedBalancesData.reduce(
    (total: number, balance: TokenBalancesResponse) =>
      total + getBalance(balance),
    0
  );

  // construct results
  return {
    totalSupply,
    mantleCoreData,
    treasuryBalanceData,
    treasuryLPBalanceData,
    lockedBalancesData,
    // clean totals as strings....
    mantleCoreTotal: `${mantleCoreTotal}`,
    treasuryBalanceTotal: `${treasuryBalanceTotal}`,
    treasuryLPTokenTotal: `${treasuryLPTokenTotal}`,
    lockedTotal: `${lockedTotal}`,
    // totalSupply with all locked/burned totals subtracted
    circulatingSupply: getCirculatingSupply(
      totalSupply,
      mantleCoreTotal,
      treasuryBalanceTotal,
      treasuryLPTokenTotal,
      lockedTotal
    ),
  };
};

// exporting nextjs req handler as default
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const alchemyApi =
      req.query.alchemyApi || (process.env.ALCHEMY_API_KEY as string);
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
