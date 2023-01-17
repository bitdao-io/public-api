import {
  NextApiRequest,
  NextApiResponse
} from "next";
import { getAnalyticsDataRecursivelyFrom } from "@/services/analytics";

// - Constants
const CACHE_TIME = 1800;

// Main handler to construct response
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // get now as unix ts
    const timestamp = new Date().getTime() / 1000;

    // fetch all data (from cache if available)
    const data = await getAnalyticsDataRecursivelyFrom(timestamp);
    
    // no data then 500
    if (!data) {
      return res.json({
        success: false,
        statusCode: 500,
        message: "no-data-found",
      });
    }

    // first result in the raw csv file is always incomplete...
    data.body.list.shift();

    // get the total amount contributed to date...
    const result = {
      total: data.body.list.reduce((total, row) => {
        return total + row.contributeVolume;
      }, 0),
      history: data.body.list
    };

    // set up response...
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
    res.setHeader(
      "Cache-Control",
      `s-maxage=${CACHE_TIME}, stale-while-revalidate=${2 * CACHE_TIME}`
    );
    res.json({
      success: true,
      statusCode: 200,
      result: result,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        statusCode: 500,
        message: error?.message
      });
  }
};

export default handler;
