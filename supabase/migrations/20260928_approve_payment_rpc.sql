-- ==============================================================================
-- NEW ERA - PAYMENT APPROVAL & ENROLLMENT ATOMIC RPC
-- File: supabase/migrations/20260928_approve_payment_rpc.sql
-- Run this in your Supabase SQL Editor to enable 100% database-level transaction atomicity.
-- ==============================================================================

-- 0. Ensure public.enrollments has expires_at column if not present in base schema
alter table public.enrollments add column if not exists expires_at timestamptz;

create or replace function public.approve_payment_and_enroll(
  p_payment_id uuid,
  p_approved_by text default null,
  p_period text default 'monthly'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment record;
  v_current_enrollment record;
  v_period_days integer;
  v_base_time timestamptz;
  v_new_expires_at timestamptz;
  v_payment_source text;
  v_was_already_approved boolean := false;
begin
  -- 1. Lock payment row for update to prevent race conditions
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'To‘lov topilmadi');
  end if;

  if v_payment.status = 'cancelled' or v_payment.status = 'rejected' then
    return jsonb_build_object('ok', false, 'error', 'To‘lov bekor qilingan yoki rad etilgan');
  end if;

  v_was_already_approved := (v_payment.status = 'approved');

  -- 2. Determine duration in days
  v_period_days := case
    when coalesce(p_period, 'monthly') = 'daily' then 1
    when coalesce(p_period, 'monthly') = 'yearly' then 365
    else 30
  end;

  v_payment_source := coalesce('payment:' || v_payment.order_id, 'payment:' || v_payment.id::text);

  -- 3. Acquire transaction-level advisory lock on (user_id, course_id)
  -- This guarantees concurrent approvals for the same user & course are serialized even if no enrollment row exists yet.
  perform pg_advisory_xact_lock(hashtext(v_payment.user_id::text || ':' || v_payment.course_id::text));

  -- 4. Lock or fetch existing active enrollment for user & course
  select * into v_current_enrollment
  from public.enrollments
  where user_id = v_payment.user_id and course_id = v_payment.course_id for update;

  if v_payment.status = 'approved' then
    if v_current_enrollment.id is not null and v_current_enrollment.status = 'active'
       and (v_current_enrollment.expires_at is null or v_current_enrollment.expires_at > now()) then
      -- Payment already approved and enrollment is active — keep existing state (idempotent)
      return jsonb_build_object('ok', true, 'payment', to_jsonb(v_payment), 'was_already_approved', true);
    end if;
    -- Already-approved payment missing active enrollment — RECOVERY PATH
    v_base_time := now();
    v_new_expires_at := v_base_time + (v_period_days || ' days')::interval;
  else
    -- Unapproved payment approval path:
    if v_current_enrollment.id is not null and v_current_enrollment.status = 'active' then
      -- If already extended by a prior attempt of this payment order, reuse expires_at (no double-extend)
      if v_current_enrollment.source = v_payment_source and v_current_enrollment.expires_at > now() then
        v_new_expires_at := v_current_enrollment.expires_at;
      elsif v_current_enrollment.expires_at is not null and v_current_enrollment.expires_at > now() then
        v_base_time := v_current_enrollment.expires_at;
        v_new_expires_at := v_base_time + (v_period_days || ' days')::interval;
      else
        v_base_time := now();
        v_new_expires_at := v_base_time + (v_period_days || ' days')::interval;
      end if;
    else
      v_base_time := now();
      v_new_expires_at := v_base_time + (v_period_days || ' days')::interval;
    end if;
  end if;

  -- 5. Upsert enrollment
  insert into public.enrollments (user_id, course_id, status, source, expires_at)
  values (
    v_payment.user_id,
    v_payment.course_id,
    'active',
    v_payment_source,
    v_new_expires_at
  )
  on conflict (user_id, course_id)
  do update set
    status = 'active',
    source = excluded.source,
    expires_at = excluded.expires_at;

  -- 6. Update payment record status if not already approved
  if v_payment.status <> 'approved' then
    update public.payments
    set status = 'approved',
        approved_at = now(),
        paid_at = coalesce(paid_at, now()),
        approved_by = p_approved_by
    where id = p_payment_id
    returning * into v_payment;
  end if;

  return jsonb_build_object('ok', true, 'payment', to_jsonb(v_payment), 'was_already_approved', v_was_already_approved);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', SQLERRM);
end;
$$;

revoke execute on function public.approve_payment_and_enroll(uuid, text, text) from public, anon, authenticated;
grant execute on function public.approve_payment_and_enroll(uuid, text, text) to service_role;
