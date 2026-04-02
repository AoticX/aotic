import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const sb = createServiceClient()

  const { data: issues } = await sb.from('issue_categories').select('*')
  if (!issues || issues.length === 0) {
    await sb.from('issue_categories').insert([
      { name: 'Swirl Marks / Holograms', description: 'Improper polishing or washing marks' },
      { name: 'Water Spots / Etching', description: 'Hard water deposits on paint' },
      { name: 'Ceramic Coating High Spots', description: 'Uneven or unlevelled coating application' },
      { name: 'Uneven Shine', description: 'Inconsistent gloss levels across panels' },
      { name: 'Dust Nibs', description: 'Dust trapped during PPF installation' },
      { name: 'PPF Lifting / Peeling', description: 'Edges of PPF coming loose' },
      { name: 'Interior Stains Remaining', description: 'Upholstery stains not fully removed' },
      { name: 'Odour Issue', description: 'Lingering smell after interior treatment' },
      { name: 'Window Tint Bubbles', description: 'Air or dust trapped under tint film' },
      { name: 'Parts Damage', description: 'Accidental damage to trims or emblems' }
    ])
  }

  const { data: verticals } = await sb.from('verticals').select('*')
  const verticalMap = (verticals || []).reduce((acc: any, v: any) => ({...acc, [v.code]: v.id}), {})

  const { data: qcLists } = await sb.from('qc_checklist_templates').select('*')
  if (!qcLists || qcLists.length === 0) {
    const templates = []
    if (verticalMap['auto_detailing']) {
      templates.push(
        { vertical_id: verticalMap['auto_detailing'], item_text: 'Bodywork thoroughly washed and decontaminated', sort_order: 1 },
        { vertical_id: verticalMap['auto_detailing'], item_text: 'Interior vacuumed and surfaces wiped down', sort_order: 2 },
        { vertical_id: verticalMap['auto_detailing'], item_text: 'Glass cleaned inside and out, streak-free', sort_order: 3 },
        { vertical_id: verticalMap['auto_detailing'], item_text: 'Tyres and trims dressed appropriately', sort_order: 4 }
      )
    }
    if (verticalMap['ceramic_coating']) {
      templates.push(
        { vertical_id: verticalMap['ceramic_coating'], item_text: 'Paint correction completed (no swirl marks visible)', sort_order: 1 },
        { vertical_id: verticalMap['ceramic_coating'], item_text: 'Surface prepped with IPA wipe-down', sort_order: 2 },
        { vertical_id: verticalMap['ceramic_coating'], item_text: 'Coating applied evenly without high spots', sort_order: 3 },
        { vertical_id: verticalMap['ceramic_coating'], item_text: 'Coating properly cured according to manufacturer specs', sort_order: 4 }
      )
    }
    if (verticalMap['ppf']) {
      templates.push(
        { vertical_id: verticalMap['ppf'], item_text: 'Film alignment perfect on all edges', sort_order: 1 },
        { vertical_id: verticalMap['ppf'], item_text: 'No dust nibs or debris trapped under film', sort_order: 2 },
        { vertical_id: verticalMap['ppf'], item_text: 'All edges wrapped and tucked securely without lifting', sort_order: 3 }
      )
    }
    if (templates.length > 0) {
      await sb.from('qc_checklist_templates').insert(templates)
    }
  }

  return NextResponse.json({ success: true, message: 'Seeded' })
}
