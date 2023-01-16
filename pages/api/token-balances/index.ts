import { Alchemy, Network } from "alchemy-sdk";
import { NextApiRequest, NextApiResponse } from "next";

const CACHE_TIME = 1800;
const alchemySettings = {
  apiKey: "", // Replace with your Alchemy API Key.
  network: Network.ETH_MAINNET, // Replace with your network.
};
const BIT_CONTRACT_ADDRESS = "0x1A4b46696b2bB4794Eb3D4c26f1c55F9170fa4C5";
const BIT_BURN_ADDRESS = "0x000000000000000000000000000000000000dead";
const BITDAO_TREASURY_ADDRESS = "0x78605Df79524164911C144801f41e9811B7DB73D";
const BITDAO_LP_WALLET_ADDRESS = "0x5C128d25A21f681e678cB050E551A895c9309945";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    let alchemyApi = req.query.alchemyApi;
    if (!alchemyApi) {
      res.json({
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

    // const [accountAddress, ...tokenContractAddresses] = addresses;
    const getBalances = async (address: string) => {
      const balances = await alchemy.core.getTokenBalances(address, [
        BIT_CONTRACT_ADDRESS,
      ]);
      return balances;
    };

    const results = {
      bitBalancesData: await getBalances(BITDAO_TREASURY_ADDRESS),
      bitLPTokenBalancesData: await getBalances(BITDAO_LP_WALLET_ADDRESS),
      bitBurnedBalancesData: await getBalances(BIT_BURN_ADDRESS),
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
