import { createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Award } from 'lucide-react'

export default async function CertificatesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const { data: certs } = await db
    .from('delivery_certificates')
    .select('id, certificate_number, customer_name, vehicle_details, qc_passed_at, pdf_url, created_at, job_cards(reg_number)')
    .order('created_at', { ascending: false })
    .limit(100)

  const certificates = (certs ?? []) as {
    id: string
    certificate_number: string
    customer_name: string
    vehicle_details: { reg_number?: string; model?: string } | null
    qc_passed_at: string | null
    pdf_url: string | null
    created_at: string
    job_cards: { reg_number: string } | null
  }[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Quality Certificates</h1>
        <p className="text-muted-foreground text-sm">{certificates.length} certificate(s) issued</p>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Award className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No certificates issued yet.</p>
            <p className="text-xs text-muted-foreground">Certificates are generated from delivered job cards.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>QC Date</TableHead>
                  <TableHead>PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-mono text-sm font-medium">{cert.certificate_number}</TableCell>
                    <TableCell>{cert.customer_name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {cert.job_cards?.reg_number ?? cert.vehicle_details?.reg_number ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cert.qc_passed_at ? new Date(cert.qc_passed_at).toLocaleDateString('en-IN') : '—'}
                    </TableCell>
                    <TableCell>
                      {cert.pdf_url ? (
                        <a
                          href={cert.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Award className="h-3 w-3" /> View PDF
                        </a>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
