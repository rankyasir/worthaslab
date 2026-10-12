# SUPERSEDED — DO NOT USE (2026-10-11 ~18:35 PKT)

Live inspection of NOWPayments' actual signup form confirmed personal Gmail
addresses are officially accepted (only extra fields: business sphere + website
URL, or a short activity description for individuals). No corporate-domain email
is required for crypto-only accounts. This Zoho fallback is NOT needed.

Original draft below for reference only.

---

## Why Zoho
- Zoho Mail "Forever Free" plan: $0, up to 5 users, 5 GB per user, custom domain.
- Caveat: no IMAP/POP on free — web + mobile app only. Fine for receiving
  NOWPayments verification + payout notifications.
- Alternative free options if Zoho's free plan isn't available in his region:
  wait — Zoho free plan is region-dependent; confirm availability during signup.

## Steps (needs the worthaslab domain — user owns the domain already)
1. Go to zoho.com/mail → sign up for the Free plan with a personal email.
2. Add domain: worthaslab.com (or whichever domain he owns).
3. Verify domain ownership: add the TXT record Zoho gives at the domain registrar
   (wherever the domain is registered).
4. Add Zoho's MX records at the registrar (Zoho provides exact values during setup).
5. Create mailbox user, e.g. billing@worthaslab.com.
6. Use billing@worthaslab.com as the NOWPayments signup email.

## Notes
- Keep the NOWPayments account email SEPARATE from the listings-only Gmail and
  the outreach Gmail.
- Never store NOWPayments API key / IPN secret in files or memory — server env
  variables only at integration time.
- This draft becomes moot if NOWPayments accepts plain Gmail (live check running).
