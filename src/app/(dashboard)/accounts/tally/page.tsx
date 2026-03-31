import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TallyExportForm } from '@/components/tally/tally-export-form'
import { FileSpreadsheet } from 'lucide-react'

export default function TallyExportPage() {
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">Tally Export</h1>
        <p className="text-muted-foreground text-sm">
          Export data in CSV format for manual import into Tally Prime.
        </p>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>Usage:</strong> Select the export type and date range, then click Export. The CSV file will download automatically. Import the file into Tally Prime via Gateway of Tally → Import Data.
      </div>

      <div className="grid gap-4">
        {[
          {
            title: 'Sales Invoices',
            description: 'All finalized invoices with line items, GST, and customer details',
            type: 'invoices',
          },
          {
            title: 'Payment Receipts',
            description: 'All recorded payments grouped by method (Cash / UPI / Card / EMI)',
            type: 'payments',
          },
          {
            title: 'GST Report (GSTR-1)',
            description: 'B2C and B2B taxable supplies for GST filing',
            type: 'gst',
          },
          {
            title: 'Inventory Stock',
            description: 'Current stock levels and transaction history',
            type: 'inventory',
          },
        ].map((item) => (
          <Card key={item.type}>
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <CardTitle className="text-sm font-semibold">{item.title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TallyExportForm exportType={item.type} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
