-- Explicit deny-by-default policies for server-only tables and removal of
-- implicit PUBLIC/anon execution from SECURITY DEFINER functions.

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'account_deletion_email_logs',
    'admin_push_tokens',
    'api_rate_limits',
    'order_confirmation_email_logs',
    'order_status_email_logs',
    'pickup_email_tokens',
    'pickup_tokens',
    'push_delivery_logs',
    'welcome_email_logs'
  ] LOOP
    EXECUTE format('drop policy if exists deny_client_access on public.%I', table_name);
    EXECUTE format(
      'create policy deny_client_access on public.%I for all to anon, authenticated using (false) with check (false)',
      table_name
    );
    EXECUTE format('revoke all on table public.%I from public, anon, authenticated', table_name);
  END LOOP;
END
$$;

DO $$
DECLARE
  function_row record;
BEGIN
  FOR function_row IN
    SELECT p.oid, n.nspname AS schema_name, p.proname AS function_name,
           pg_get_function_identity_arguments(p.oid) AS identity_arguments
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
  LOOP
    EXECUTE format(
      'revoke execute on function %I.%I(%s) from public, anon',
      function_row.schema_name,
      function_row.function_name,
      function_row.identity_arguments
    );
  END LOOP;
END
$$;

-- Intentional public storefront reads: grant only the client roles needed by
-- the storefront, not the implicit PUBLIC role.
grant execute on function public.get_active_storefront_banners() to anon, authenticated;
grant execute on function public.get_product_guarantee_policy() to anon, authenticated;
grant execute on function public.list_available_coupon_offers() to anon, authenticated;
