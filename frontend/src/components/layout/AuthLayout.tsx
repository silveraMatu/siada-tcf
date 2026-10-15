import type { ReactNode } from 'react'

type AuthLayoutProps = {
  children: ReactNode
  footer?: ReactNode
  subtitle: string
  title: string
  variant?: 'glass'
}

export function AuthLayout({
  children,
  footer,
  subtitle,
  title,
}: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#131715] px-4 py-10 text-[#e6eae5]">
      <section className="w-full max-w-md rounded-xl border border-[#2a322d] bg-[#191e1b] p-6 shadow-xl shadow-black/20 sm:p-8">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#a6aea6]">{subtitle}</p>
        </header>
        {children}
        {footer && <footer className="mt-6 text-center">{footer}</footer>}
      </section>
    </main>
  )
}
