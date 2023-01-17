import {
  NextApiRequest,
  NextApiResponse
} from "next";

// - Constants
const CACHE_TIME = 1800;
const ANALYTICS_CHART_100_DAY_ENDPOINT_PREFIX = 'https://api.bitdao.io/analytics/chart-100-day-'

// Get the current day (from UTC)
const getDay = (timestamp: number) => {
  const date = new Date(timestamp * 1000)
  date.setUTCHours(0, 0, 0, 0)
  const pad = (n: number) => (n < 10 ? '0' : '') + n
  const y = date.getUTCFullYear()
  const m = pad(date.getUTCMonth() + 1)
  const d = pad(date.getUTCDate())
  return y + '-' + m + '-' + d
};

// Recursively fetch from the most recently dated file
const getAnalyticsDataRecursivelyFrom = async (
  timestamp: number
): Promise < {
  body: {
    list: {
      contributeVolume: number
    }[]
  }
} > => {
  return await fetch(ANALYTICS_CHART_100_DAY_ENDPOINT_PREFIX + getDay(timestamp) + '.json')
    .then((res) => {
      return res.json()
    }).catch(() => {
      return getAnalyticsDataRecursivelyFrom(timestamp - 86400) // 1 day
    })
};

// Main handler to construct response
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // get now as unix ts
    const timestamp = new Date().getTime() / 1000;

    // fetch all data (from cache if available)
    const data = await getAnalyticsDataRecursivelyFrom(
      timestamp
    );
    
    // do data then 500
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
    const result = data.body.list.reduce((total, row) => {
      return total + row.contributeVolume;
    }, 0);

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
      total: result,
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