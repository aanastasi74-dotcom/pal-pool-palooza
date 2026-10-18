# Roadmap

- [x] Locate the reusable competition admin console insertion point.
- [x] Add promoter listing, nomination, and confirmed removal.
- [x] Add competition-scoped incentive and invitation-limit settings.
- [x] Enforce archived competition read-only behavior.
- [x] Run typecheck, build diagnostics, and admin smoke checks.

## S3.6 admin finishes
- [x] Implement refund receipt upload and confirmation email without undoing a refund on email failure.
- [x] Clarify already-paid cash records in incentive and refund dialogs.
- [x] Add field help and unlimited caps represented by an omitted teto property.
- [x] Fresh automatic typecheck/build diagnostics passed; all 10 rule tests passed.
- [ ] Live refund upload is blocked: existing storage INSERT policy requires the first folder to be auth.uid(), not devolucoes; permission changes are outside the requested scope. Authenticated smoke also unavailable with external unmanaged Supabase.
