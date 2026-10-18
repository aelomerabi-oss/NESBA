-- 022: Direct messages: recipients may only mark messages read
--
-- The "Recipients mark messages read" UPDATE policy allowed the recipient to
-- change any column, including content and sender_id. Limit the UPDATE
-- privilege to read_at so the policy can only be used for read receipts.

revoke update on public.direct_messages from anon, authenticated;
grant update (read_at) on public.direct_messages to authenticated;
