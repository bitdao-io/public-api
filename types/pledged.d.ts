export interface Pledged {
  success: boolean;
  statusCode: number;
  result: PledgedResults;
}

export interface PledgedResults {
  total: string;
  totalFull: number;
  history: HistoryData[];
}

export interface PledgedHistory {
  success: boolean;
  statusCode: number;
  results: HistoryData[];
}

export interface PledgedTotal {
  success: boolean;
  statusCode: number;
  result: string;
}

export interface HistoryData {
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

// export type { Pledged, PledgedTotal, PledgedHistory };
