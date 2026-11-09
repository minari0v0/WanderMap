import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Noto_Sans_KR } from 'next/font/google'
import { SystemAlertProvider } from '@/components/ui/system-alert'
import { WorkspaceAppShell } from '@/components/layout/workspace-app-shell'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})
const notoSansKr = Noto_Sans_KR({
  variable: '--font-noto-kr',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'WanderMap — 여행 동선 플래너 & 여행 다이어리',
  description:
    '그룹 취향 투표부터 구글 지도(Google Maps) 기반 최적 동선 설계, 마크다운 메모와 사진·별점 기록까지 하나로 이어지는 올인원 여행 플래너 & 다이어리.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f8f8f6',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansKr.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <SystemAlertProvider>
          <WorkspaceAppShell>
            {children}
          </WorkspaceAppShell>
        </SystemAlertProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
