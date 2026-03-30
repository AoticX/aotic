'use client'

import { Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { LoginSchema, type LoginInput } from '@/lib/validations'
import { signIn } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

function LoginForm() {
  const searchParams = useSearchParams()
  const errorMessage = searchParams.get('error')
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  })

  function onSubmit(data: LoginInput) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('email', data.email)
      formData.set('password', data.password)
      await signIn(formData)
    })
  }

  return (
    <Card className="border-sidebar-border bg-sidebar-background/80 shadow-2xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl text-white">Sign in</CardTitle>
        <CardDescription className="text-sidebar-foreground/60">
          Enter your credentials to access the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <div className="mb-4 rounded-md bg-destructive/15 border border-destructive/30 px-4 py-3 text-sm text-destructive">
            {decodeURIComponent(errorMessage)}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sidebar-foreground/80">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@aotic.com"
              autoComplete="email"
              disabled={isPending}
              className="bg-sidebar-accent border-sidebar-border text-white placeholder:text-sidebar-foreground/30 focus-visible:ring-sidebar-ring"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sidebar-foreground/80">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isPending}
              className="bg-sidebar-accent border-sidebar-border text-white placeholder:text-sidebar-foreground/30 focus-visible:ring-sidebar-ring"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 font-semibold"
            disabled={isPending}
          >
            {isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4">
            <span className="text-2xl font-black text-white">A</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">AOTIC</h1>
          <p className="text-sm text-sidebar-foreground/60 mt-1">
            Automotive Customization Management System
          </p>
        </div>

        <Suspense fallback={<div className="h-64 rounded-xl bg-sidebar-accent/30 animate-pulse" />}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-sidebar-foreground/30">
          Access is restricted to authorized AOTIC personnel only.
          <br />
          Contact your administrator to request access.
        </p>
      </div>
    </div>
  )
}
