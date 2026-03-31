'use server'

import { createClient } from '@/lib/supabase/server'

type ExportType = 'invoices' | 'payments' | 'gst' | 'inventory'

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [headers.map(escape).join(',')]
  for (const row of rows) lines.push(row.map(escape).join(','))
  return lines.join('\r\n')
}

export async function exportTallyCSV(exportType: ExportType, fromDate: string, toDate: string): Promise<{ csv: string; filename: string; error?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Inclusive end date — add one day for range query
  const endDate = new Date(toDate)
  endDate.setDate(endDate.getDate() + 1)
  const endStr = endDate.toISOString().split('T')[0]

  if (exportType === 'invoices') {
    const { data, error } = await db
      .from('invoices')
      .select('invoice_number, created_at, customers(full_name, phone), subtotal, discount_amount, tax_amount, total_amount, amount_paid, amount_due, status, job_cards(reg_number)')
      .gte('created_at', fromDate)
      .lt('created_at', endStr)
      .in('status', ['finalized', 'partially_paid', 'paid'])
      .order('created_at')

    if (error) return { csv: '', filename: '', error: error.message }

    const headers = ['Invoice No', 'Date', 'Customer', 'Phone', 'Vehicle', 'Subtotal', 'Discount', 'GST (18%)', 'Total', 'Paid', 'Balance', 'Status']
    const rows = (data ?? []).map((inv: {
      invoice_number: string; created_at: string
      customers: { full_name: string; phone: string } | null
      subtotal: number; discount_amount: number; tax_amount: number
      total_amount: number; amount_paid: number; amount_due: number; status: string
      job_cards: { reg_number: string } | null
    }) => [
      inv.invoice_number,
      new Date(inv.created_at).toLocaleDateString('en-IN'),
      inv.customers?.full_name ?? '',
      inv.customers?.phone ?? '',
      inv.job_cards?.reg_number ?? '',
      Number(inv.subtotal).toFixed(2),
      Number(inv.discount_amount).toFixed(2),
      Number(inv.tax_amount).toFixed(2),
      Number(inv.total_amount).toFixed(2),
      Number(inv.amount_paid).toFixed(2),
      Number(inv.amount_due).toFixed(2),
      inv.status,
    ])

    return { csv: toCSV(headers, rows), filename: `AOTIC_Invoices_${fromDate}_to_${toDate}.csv` }
  }

  if (exportType === 'payments') {
    const { data, error } = await db
      .from('payments')
      .select('id, payment_date, amount, payment_method, reference_number, notes, invoices(invoice_number, customers(full_name))')
      .gte('payment_date', fromDate)
      .lte('payment_date', toDate)
      .order('payment_date')

    if (error) return { csv: '', filename: '', error: error.message }

    const headers = ['Date', 'Invoice No', 'Customer', 'Amount', 'Method', 'Ref No', 'Notes']
    const rows = (data ?? []).map((p: {
      payment_date: string; amount: number; payment_method: string
      reference_number: string | null; notes: string | null
      invoices: { invoice_number: string; customers: { full_name: string } | null } | null
    }) => [
      new Date(p.payment_date).toLocaleDateString('en-IN'),
      p.invoices?.invoice_number ?? '',
      p.invoices?.customers?.full_name ?? '',
      Number(p.amount).toFixed(2),
      p.payment_method,
      p.reference_number ?? '',
      p.notes ?? '',
    ])

    return { csv: toCSV(headers, rows), filename: `AOTIC_Payments_${fromDate}_to_${toDate}.csv` }
  }

  if (exportType === 'gst') {
    const { data, error } = await db
      .from('invoices')
      .select('invoice_number, created_at, customers(full_name, phone), subtotal, discount_amount, tax_amount, total_amount')
      .gte('created_at', fromDate)
      .lt('created_at', endStr)
      .in('status', ['finalized', 'partially_paid', 'paid'])
      .order('created_at')

    if (error) return { csv: '', filename: '', error: error.message }

    const headers = [
      'Invoice No', 'Date', 'Customer', 'Phone',
      'Taxable Value', 'CGST Rate', 'CGST Amount', 'SGST Rate', 'SGST Amount', 'Total GST', 'Invoice Total'
    ]
    const rows = (data ?? []).map((inv: {
      invoice_number: string; created_at: string
      customers: { full_name: string; phone: string } | null
      subtotal: number; discount_amount: number; tax_amount: number; total_amount: number
    }) => {
      const taxable = Number(inv.subtotal) - Number(inv.discount_amount)
      const cgst = Number(inv.tax_amount) / 2
      const sgst = Number(inv.tax_amount) / 2
      return [
        inv.invoice_number,
        new Date(inv.created_at).toLocaleDateString('en-IN'),
        inv.customers?.full_name ?? '',
        inv.customers?.phone ?? '',
        taxable.toFixed(2),
        '9%', cgst.toFixed(2),
        '9%', sgst.toFixed(2),
        Number(inv.tax_amount).toFixed(2),
        Number(inv.total_amount).toFixed(2),
      ]
    })

    return { csv: toCSV(headers, rows), filename: `AOTIC_GST_${fromDate}_to_${toDate}.csv` }
  }

  if (exportType === 'inventory') {
    const { data, error } = await db
      .from('inventory_items')
      .select('name, sku, category, unit, current_stock, cost_price, selling_price')
      .eq('is_active', true)
      .order('category')
      .order('name')

    if (error) return { csv: '', filename: '', error: error.message }

    const headers = ['Name', 'SKU', 'Category', 'Unit', 'Stock', 'Cost Price', 'Selling Price', 'Stock Value']
    const rows = (data ?? []).map((item: {
      name: string; sku: string | null; category: string | null
      unit: string; current_stock: number; cost_price: number | null; selling_price: number | null
    }) => [
      item.name,
      item.sku ?? '',
      item.category ?? '',
      item.unit,
      String(item.current_stock),
      item.cost_price != null ? Number(item.cost_price).toFixed(2) : '',
      item.selling_price != null ? Number(item.selling_price).toFixed(2) : '',
      item.cost_price != null ? (Number(item.cost_price) * item.current_stock).toFixed(2) : '',
    ])

    return { csv: toCSV(headers, rows), filename: `AOTIC_Inventory_${new Date().toISOString().split('T')[0]}.csv` }
  }

  return { csv: '', filename: '', error: 'Unknown export type' }
}
