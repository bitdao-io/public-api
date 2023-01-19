export const ANALYTICS_CHART_100_DAY_ENDPOINT_PREFIX = 'https://api.bitdao.io/analytics/chart-100-day-'
  
// Get the current day (from UTC)
export const getDay = (timestamp: number) => {
  const date = new Date(timestamp * 1000)
  date.setUTCHours(0, 0, 0, 0)
  const pad = (n: number) => (n < 10 ? '0' : '') + n
  const y = date.getUTCFullYear()
  const m = pad(date.getUTCMonth() + 1)
  const d = pad(date.getUTCDate())
  return y + '-' + m + '-' + d
};

// Get an abbreviated form of the number
export const abbrvNumber = (num: number) => {
  // Alter numbers larger than 1k
  if (num >= 1e3) {
    const units = ["k", "M", "B", "T"];
    const order = Math.floor(Math.log(num) / Math.log(1000));
    const unitname = units[(order - 1)];
    
    // output number remainder + unitname
    return `${Math.floor((num * 100) / 1000 ** order) / 100}${unitname}`
  }
  
  // return formatted original number
  return num.toLocaleString()
};

// Recursively fetch from the most recently dated file
export const getAnalyticsDataRecursivelyFrom = async (
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
