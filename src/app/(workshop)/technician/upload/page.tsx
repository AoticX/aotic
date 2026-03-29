import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PhotoUploader } from '@/components/workshop/photo-uploader'
import { getJobPhotos } from '@/lib/actions/photos'
import Link from 'next/link'

type ActiveJob = {
  id: string
  reg_number: string
  status: string
}

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>
}) {
  const { job: jobId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: jobsData } = await db
    .from('job_cards')
    .select('id, reg_number, status')
    .eq('assigned_to', user!.id)
    .in('status', ['in_progress', 'created'])
    .order('created_at', { ascending: true })

  const jobs = (jobsData ?? []) as ActiveJob[]
  const selectedJobId = jobId ?? jobs[0]?.id ?? null
  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null
  const photos = selectedJobId ? await getJobPhotos(selectedJobId) : []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Upload Photos</h1>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground text-sm">No active jobs assigned to you.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Job selector */}
          {jobs.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-muted-foreground">Select job</p>
              <div className="space-y-2">
                {jobs.map((j) => (
                  <Link
                    key={j.id}
                    href={`/workshop/technician/upload?job=${j.id}`}
                    className={`block px-4 py-3 rounded-md border text-sm font-medium transition-colors ${
                      j.id === selectedJobId
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-input text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {j.reg_number}
                    <span className="ml-2 text-xs capitalize opacity-60">{j.status.replace(/_/g, ' ')}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {selectedJobId && selectedJob && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{selectedJob.reg_number} — Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoUploader jobCardId={selectedJobId} existingPhotos={photos} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
