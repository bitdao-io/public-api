import { Alchemy, Network, TokenBalance, TokenBalancesResponse } from "alchemy-sdk";
import { NextApiRequest, NextApiResponse } from "next";

import {
  BITDAO_CONTRACT_ADDRESS,
  BITDAO_BURN_ADDRESS,
  BITDAO_TREASURY_ADDRESS,
  BITDAO_LP_WALLET_ADDRESS,
  BITDAO_LOCKED_ADDRESSES
} from "config/general";

import { BigNumber, Contract } from "ethers";
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

    const getTotalSupply = async () => {
      // Example reading from a contract directly...
      const provider = await alchemy.config.getProvider();

      const abi = [
        "function totalSupply() view returns (uint256)",
      ];
      
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
      return `${parseFloat(totalSupply) - bitBalanceTotal - bitLPTokenTotal - bitBurnedTotal - bitLockedTotal}`;
    };

    // returns the actual balance held within the TokenBalancesResponse
    const getBalance = (balance: TokenBalancesResponse) => {
      return parseFloat(balance.tokenBalances[0].tokenBalance || "0")
    }
    
    // retrieve balance data for BITDAO_CONTRACT_ADDRESS given EOA address
    const getBalances = async (address: string) => {
      const balances = await alchemy.core.getTokenBalances(address, [
        BITDAO_CONTRACT_ADDRESS,
      ]);

      // normalise each of the discovered balances
      balances.tokenBalances = balances.tokenBalances.map((balance: TokenBalance) => {
        // format to ordinary value (to BIT)
        balance.tokenBalance = formatUnits(
          BigNumber.from(balance.tokenBalance),
          18
        ).toString()
  
        return balance;
      });

      return balances;
    };

    // get all async calls in parallel
    const [
      bitTotalSupply, 
      bitBalancesData, 
      bitLPTokenBalancesData, 
      bitBurnedBalancesData,
      // collect up all other addresses into an array (this represents anything passed in BITDAO_LOCKED_ADDRESSES)
      ...bitLockedBalancesData
    ] = await Promise.all([
      getTotalSupply(),
      getBalances(BITDAO_TREASURY_ADDRESS),
      getBalances(BITDAO_LP_WALLET_ADDRESS),
      getBalances(BITDAO_BURN_ADDRESS),
      // get balance from each of the locked addresses
      ...BITDAO_LOCKED_ADDRESSES.map(async (address) => getBalances(address)) 
    ]);

    // extract the total from each of the balanceData structs
    const bitBalanceTotal = getBalance(bitBalancesData);
    const bitLPTokenTotal = getBalance(bitLPTokenBalancesData);
    const bitBurnedTotal = getBalance(bitBurnedBalancesData);

    // sum all balances in the list of locked addresses
    const bitLockedTotal = bitLockedBalancesData.reduce((total: number, balance: TokenBalancesResponse) => total + getBalance(balance), 0);
    
    // construct results
    const results = {
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
      bitCirculatingSupply: getCirculatingSupply(bitTotalSupply, bitBalanceTotal, bitLPTokenTotal, bitBurnedTotal, bitLockedTotal),
    };

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
