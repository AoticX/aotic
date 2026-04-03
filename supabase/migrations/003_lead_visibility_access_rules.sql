-- Session 11 (2026-04-03)
-- Lead visibility and edit rules alignment:
-- 1) Owner/Manager/Front Desk/Accounts can view all leads.
-- 2) Sales can view leads they created or are assigned to.
-- 3) Assigned salesperson can edit assigned leads.

-- Replace lead SELECT policy
DROP POLICY IF EXISTS "Sales and above can view leads in their branch" ON leads;

CREATE POLICY "Lead visibility by role and ownership"
  ON leads FOR SELECT TO authenticated
  USING (
    has_role('owner')
    OR has_role('branch_manager')
    OR has_role('front_desk')
    OR has_role('accounts_finance')
    OR (has_role('sales_executive') AND (assigned_to = auth.uid() OR created_by = auth.uid()))
  );

-- Replace lead UPDATE policy
DROP POLICY IF EXISTS "Assigned salesperson or manager can update leads" ON leads;

CREATE POLICY "Lead updates by assignment and role"
  ON leads FOR UPDATE TO authenticated
  USING (
    has_role('owner')
    OR has_role('branch_manager')
    OR (has_role('sales_executive') AND (assigned_to = auth.uid() OR created_by = auth.uid()))
    OR (has_role('front_desk') AND created_by = auth.uid())
  )
  WITH CHECK (
    has_role('owner')
    OR has_role('branch_manager')
    OR (has_role('sales_executive') AND (assigned_to = auth.uid() OR created_by = auth.uid()))
    OR (has_role('front_desk') AND created_by = auth.uid())
  );
