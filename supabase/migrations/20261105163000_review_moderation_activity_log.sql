-- Review moderation is an administrator action. Preserve it in the Activity Log
-- without creating a customer-facing notification or admin FCM push.
alter table public.admin_activity_events
  drop constraint if exists admin_activity_events_event_type_check;
alter table public.admin_activity_events
  add constraint admin_activity_events_event_type_check check (event_type = any (array[
    'order_created','order_status_changed','order_payment_changed','review_created',
    'review_moderated','review_deleted','customer_registered','customer_profile_updated',
    'support_request_created','support_request_status_changed','support_request_message_received',
    'support_reply_sent','coupon_redeemed','product_created','product_updated','product_deleted',
    'coupon_created','coupon_updated','coupon_deleted','notification_campaign_sent'
  ]::text[]));

create or replace function public.log_admin_review_moderation_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_action text;
  v_subject uuid;
begin
  if v_actor is null or not public.is_admin() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.is_published is not distinct from new.is_published then
      return new;
    end if;
    v_action := case when new.is_published then 'published' else 'hidden' end;
    v_subject := coalesce(new.customer_id, new.user_id);
    insert into public.admin_activity_events(
      event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details
    ) values (
      'review-moderated:' || new.id::text || ':' || transaction_timestamp()::text,
      'review_moderated','review',new.id,v_actor,v_subject,
      'Review ' || v_action,
      format('Administrator %s review by %s.',v_action,coalesce(new.author_name,'a customer')),
      jsonb_build_object(
        'product_id',new.product_id,
        'rating',new.rating,
        'review_text',coalesce(new.review_text,new.body),
        'previously_published',old.is_published,
        'is_published',new.is_published,
        'moderation_action',v_action
      )
    ) on conflict (event_key) do nothing;
    return new;
  end if;

  if tg_op = 'DELETE' then
    v_subject := coalesce(old.customer_id, old.user_id);
    insert into public.admin_activity_events(
      event_key,event_type,entity_type,entity_id,actor_user_id,subject_user_id,title,body,details
    ) values (
      'review-deleted:' || old.id::text || ':' || transaction_timestamp()::text,
      'review_deleted','review',old.id,v_actor,v_subject,
      'Review deleted',
      format('Administrator deleted the %s-star review by %s.',old.rating,coalesce(old.author_name,'a customer')),
      jsonb_build_object(
        'product_id',old.product_id,
        'rating',old.rating,
        'review_text',coalesce(old.review_text,old.body),
        'moderation_action','deleted'
      )
    ) on conflict (event_key) do nothing;
    return old;
  end if;
  return new;
end;
$$;
revoke all on function public.log_admin_review_moderation_activity() from public, anon, authenticated;

drop trigger if exists reviews_log_admin_moderation_update on public.reviews;
create trigger reviews_log_admin_moderation_update
after update of is_published on public.reviews
for each row when (old.is_published is distinct from new.is_published)
execute function public.log_admin_review_moderation_activity();

drop trigger if exists reviews_log_admin_moderation_delete on public.reviews;
create trigger reviews_log_admin_moderation_delete
after delete on public.reviews
for each row execute function public.log_admin_review_moderation_activity();
