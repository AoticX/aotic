// Root route — middleware handles redirect to role dashboard or /login
// This page should never render in production; shown only if middleware bypassed.
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/login')
}
