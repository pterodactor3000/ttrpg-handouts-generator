---
change_id: remove-account
title: Close an account and purge it after 30 days
status: plan_reviewed
created: 2026-10-01
updated: 2026-10-01
archived_at: null
roadmap_id: S-13
---

## Notes

Roadmap S-13. Planned on 2026-10-01.

- Complexity: High.
- `/settings` shows the email, a change-password form, and account deletion.
- Deletion asks for the current password. A wrong password or a failed save leaves the GM signed in.
- Day 0 ends every session and blocks later sign-in. The auth user stays until purge, because deleting it would cascade the handouts.
- Shared handouts stay readable for 30 days and show the deletion instant in the viewer's local timezone.
- A Cloudflare cron deletes the auth user after that instant. Handouts go with the existing cascade.
- No reactivation.
