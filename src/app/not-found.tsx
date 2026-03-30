import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md px-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-2">
          <span className="text-2xl font-black text-white">A</span>
        </div>
        <h1 className="text-4xl font-black text-foreground">404</h1>
        <p className="text-lg font-semibold text-foreground">Page not found</p>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist or you do not have permission to view it.
        </p>
        <Button asChild>
          <Link href="/">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
