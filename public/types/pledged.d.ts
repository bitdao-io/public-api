interface Pledged {
  success: boolean;
  statusCode: number;
  result: PledgedResults;
}

interface PledgedResults {
  total: string;
  totalFull: number;
  history: HistoryData[];
}

interface PledgedHistory {
  success: boolean;
  statusCode: number;
  results: HistoryData[];
}

interface PledgedTotal {
  success: boolean;
  statusCode: number;
  result: string;
}

interface HistoryData {
  date: string;
  ethPrice: number;
  bitPrice: number;
  tradeVolume: number;
  contributeVolume: number;
  ethAmount: number;
  ethCount: number;
  usdtAmount: number;
  usdtCount: number;
  usdcAmount: number;
  usdcCount: number;
  bitAmount: number;
  bitCount: number;
}

export type { Pledged, PledgedTotal, PledgedHistory };
