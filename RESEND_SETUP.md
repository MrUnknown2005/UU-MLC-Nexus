# Resend + Supabase setup — farewell email on account deletion

This is the one-time setup so the `delete_own_account()` database function can send a
warm goodbye email **before** it deletes the member's account. The email is sent from
inside Postgres via the **pg_net** extension, using a Resend API key kept in **Supabase
Vault** (never in the app, never hard-coded).

You only do this once. Work top to bottom.

> Note: exact button labels / DNS records shown in the Resend dashboard are generated
> per account, so **copy the exact values Resend shows you** — the ones below are the
> shape, not literal strings to paste.

---

## Part A — In Resend (you)

### 1. Create the account
- Go to **resend.com** → sign up (Google/GitHub or email).
- Free tier is generous: ~**3,000 emails/month, 100/day, 1 domain** — far more than a club needs.

### 2. Choose how you'll send — pick ONE

**Option 1 — quick test, no domain (start here):**
- Use Resend's shared sender **`onboarding@resend.dev`** as your "from" address.
- ⚠️ Limitation: it **only delivers to the email address you signed up to Resend with.**
  Perfect for a first smoke test, useless for real members.

**Option 2 — real sending (do this before launch):**
- Dashboard → **Domains** → **Add Domain** → enter a domain you own (e.g. `yourdomain.com`
  or a subdomain like `mail.yourdomain.com`).
- Resend shows you a set of **DNS records to add at your DNS host** (GoDaddy, Cloudflare, etc.):
  - a **TXT (SPF)** record,
  - a **TXT (DKIM)** record (usually a `resend._domainkey...` host),
  - a **MX** record (for bounce/complaint handling),
  - optionally a **TXT (DMARC)** record.
- Add each one **exactly as shown**, then click **Verify**. Propagation can take minutes to a few hours.
- Once verified, your "from" address becomes e.g. `UU MLC Nexus <noreply@yourdomain.com>`.

### 3. Create an API key
- Dashboard → **API Keys** → **Create API Key**.
- Permission: **Sending access** (you don't need full access).
- Copy the **`re_...`** key immediately — it's shown **once**.

### 4. Decide your "from" address
- Test: `onboarding@resend.dev`
- Real: `UU MLC Nexus <noreply@yourdomain.com>`
- Tell me which one and I'll bake it into the function.

---

## Part B — In Supabase (you, in the SQL editor)

### 1. Enable pg_net
- Dashboard → **Database** → **Extensions** → search **`pg_net`** → enable it.
- (SQL alternative, if you prefer: run `create extension if not exists pg_net;`)
- This gives you `net.http_post(...)`, which makes outbound HTTP calls from Postgres.

### 2. Store the Resend key in Vault
Run this in the **SQL editor** (paste your real `re_...` key):

```sql
select vault.create_secret(
  're_your_real_key_here',   -- the secret
  'resend_api_key',          -- the name we read it back by
  'Resend API key for the farewell email'
);
```

Read it back to confirm it's there (this is safe to run; don't share the output):

```sql
select decrypted_secret is not null as key_present
from vault.decrypted_secrets
where name = 'resend_api_key';
```

You want `key_present = true`. ✅

---

## Part C — the email-send snippet the function will use

This is the piece that goes **near the top** of `delete_own_account()`, **before** any
`DELETE`. You don't run this by itself — it's here so you can see how the pieces connect.

```sql
declare
  v_key   text;
  v_email text;
  v_name  text;
  v_req   bigint;
begin
  -- 1. capture identity BEFORE deleting anything
  select email into v_email from auth.users where id = auth.uid();
  select full_name into v_name from public.profiles where id = auth.uid();

  -- 2. read the Resend key from Vault
  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'resend_api_key';

  -- 3. queue the farewell email (named args, so argument order can't bite us)
  if v_key is not null and v_email is not null then
    select net.http_post(
      url     := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_key,
        'Content-Type',  'application/json'
      ),
      body    := jsonb_build_object(
        'from',    'UU MLC Nexus <noreply@YOURDOMAIN>',   -- <-- your from-address
        'to',      v_email,
        'subject', 'Thank you for being part of UU MLC Nexus',
        'text',    'Hi ' || coalesce(v_name, 'there') || ', ...plain-text body...',
        'html',    '<p>Hi ' || coalesce(v_name, 'there') || ',</p> ...html body...'
      )
    ) into v_req;
  end if;

  -- 4. ...then the DELETEs, ending with:  delete from auth.users where id = auth.uid();
end;
```

**Why this ordering is safe — the nice property of pg_net:**
`net.http_post` is **asynchronous**. It doesn't send the email on the spot; it drops the
request (body and all) into a queue, and a background worker sends it **after the
transaction commits**. Two consequences, both good for us:

1. The email body is **captured at call time**, so the address is already baked in before
   we delete the `auth.users` row — deletion can't erase it out from under us.
2. The queue insert is **part of the same transaction**. If the deletion fails and rolls
   back, the queued email rolls back too — so we never send "goodbye" to someone whose
   account still exists.

**Security:** the key lives only in Vault and in a local variable; it's never logged,
never returned, never sent to the client.

---

## The farewell email (warm, plain — the club voice)

**Subject:** Thank you for being part of UU MLC Nexus

**Plain text:**
```
Hi {name},

Your UU MLC Nexus account has been deleted and all of your data removed — exactly as you asked.

Thank you for being part of the club. It was a genuine pleasure having you with us,
and the door is always open if you ever want to come back.

Take care,
The UU MLC Nexus team
```

**Minimal HTML** (same words; kept simple on purpose):
```html
<div style="font-family: system-ui, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a;">
  <p>Hi {name},</p>
  <p>Your UU MLC Nexus account has been deleted and all of your data removed — exactly as you asked.</p>
  <p>Thank you for being part of the club. It was a genuine pleasure having you with us,
     and the door is always open if you ever want to come back.</p>
  <p>Take care,<br>The UU MLC Nexus team</p>
</div>
```

---

## How to test safely
1. Set up Vault + pg_net (Part B) with `onboarding@resend.dev` as the from-address.
2. Send yourself a one-off test from the SQL editor:
   ```sql
   select net.http_post(
     url     := 'https://api.resend.com/emails',
     headers := jsonb_build_object('Authorization', 'Bearer ' ||
                 (select decrypted_secret from vault.decrypted_secrets where name = 'resend_api_key'),
                 'Content-Type', 'application/json'),
     body    := jsonb_build_object(
       'from', 'onboarding@resend.dev',
       'to',   'YOUR_RESEND_SIGNUP_EMAIL',
       'subject', 'Resend test',
       'text', 'It works.')
   );
   ```
3. Check delivery. Then look at the response Postgres recorded:
   ```sql
   select id, status_code, created
   from net._http_response
   order by created desc
   limit 5;
   ```
   `status_code = 200` means Resend accepted it.

---

## The one thing left to finish the function
I won't write the destructive `delete_own_account()` body until I know your real foreign
keys — a wrong `ON DELETE` guess could fail mid-delete or touch other members' data
(e.g. `todos.created_by`). Run this **read-only** query and paste the result:

```sql
select
  tc.table_name,
  kcu.column_name,
  ccu.table_schema || '.' || ccu.table_name as references_table,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and (ccu.table_name = 'profiles'
       or (ccu.table_schema = 'auth' and ccu.table_name = 'users'))
order by tc.table_name, kcu.column_name;
```

With that + your from-address, I'll hand you the full `delete_own_account()` to paste in.
