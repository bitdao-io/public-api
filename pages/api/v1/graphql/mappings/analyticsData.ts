// Bind ID against the BITDAO_CONTRACT_ADDRESS
import { BITDAO_CONTRACT_ADDRESS } from "@/config/general";

// Get the data from the analytics s3 bucket
import {
  getAnalyticsDataRecursivelyFrom,
  abbrvNumber,
} from "@/services/analytics";

// map the analytics data into AnalyticEntry entries and add a detailed summary as an Analytics entity
export const mapAnalyticsData = async () => {
  // wrap in a try catch to avoid 500 error
  try {
    // get now as unix ts
    const timestamp = new Date().getTime() / 1000;

    // fetch all data (from cache if available)
    const _analyticsData = await getAnalyticsDataRecursivelyFrom(timestamp);

    // first result in the raw csv file is always incomplete...
    _analyticsData.body.list.shift();

    // total the analytics data
    const total = _analyticsData.body.list.reduce((total, row) => {
      return total + row.contributeVolume;
    }, 0);

    // construct analytics to hold entries and total
    const analytics = [
      {
        id: BITDAO_CONTRACT_ADDRESS,
        total: total,
        totalAbbrv: abbrvNumber(total),
      },
    ];

    // all entries from getAnalyticsDataRecursivelyFrom minus today
    const analyticEntries = _analyticsData.body.list.map((entry) => {
      // detail the entry to mark joins
      entry.id = `${BITDAO_CONTRACT_ADDRESS}-${entry.date}`;
      entry.analytics = BITDAO_CONTRACT_ADDRESS;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      entry.dateTime = new Date(entry.date!);

      return entry;
    });

    // return the mapped entities
    return { analytics, analyticEntries };
  } catch {

    // return empty mapping
    return {
      analytics: [],
      analyticEntries: []
    }
  }
};
