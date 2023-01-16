import type { NextPage } from 'next'
import type { AppProps } from 'next/app'
import type { ReactElement, ReactNode } from 'react'

type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

type StatusCode = 200 | 400 | 500 | 404

interface VercelAPIResponse<T> {
  statusCode: StatusCode
  success: boolean
  value: T
  message?: string
}

export type {
  NextPageWithLayout,
  AppPropsWithLayout,
  VercelAPIResponse,
  StatusCode,
}
