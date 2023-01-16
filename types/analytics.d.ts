interface Contribution {
  contributeVolume: string
  date: string
  ethCount: string
  tradeVolume: string
  usdxCount: string
  bitCount: string
}

interface RawContribution {
  contributeVolume: number
  date: string
  ethAmount: number
  ethCount: number
  ethPrice: number
  bitPrice?: number
  tradeVolume: number
  usdcAmount: number
  usdcCount: number
  usdtAmount: number
  usdtCount: number
  bitAmount?: number
  bitCount?: number
}

export type { Contribution, RawContribution }
