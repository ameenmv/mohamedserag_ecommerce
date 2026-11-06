# Spec 021: WhatsApp alerts (open-wa)

Scope decided 2026-11-05 (kept small on purpose):
1. A new order sends a WhatsApp message with all the details to the admin number(s).
2. "Notify me": when a product that had waiting requests is available again, each waiting customer gets one WhatsApp message with the product name and link.
Nothing else is sent (no status updates, no marketing).

## Provider
- OpenWA (github.com/rmyndharis/OpenWA, unofficial self-hosted WhatsApp Web gateway, image `ghcr.io/rmyndharis/openwa:0.29.0`) running as its own container, called over internal HTTP (`POST /api/sessions/{id}/messages/send-text`, `X-API-Key` header). Env: `OPEN_WA_URL`, `OPEN_WA_KEY`, `OPEN_WA_SESSION`. Without them the feature is simply off (no errors). The earlier `openwa/wa-automate` image was dropped: its bundled 4.76 no longer completes WhatsApp Web login.
- A small `WhatsAppSender` interface in the API so the provider can be swapped later (official Cloud API).
- Number: the owner's own number for the trial.

## Behaviour
- Sending never blocks or fails an order or a stock update: it runs after the database commit, errors are caught and logged.
- Every attempt is logged in the existing `WhatsAppMessage` table (new channel value `open_wa`, status sent/failed); the dashboard order page already lists WhatsApp messages.
- Admin settings (dashboard > settings): on/off switch and one or more admin numbers (Egyptian mobile, normalised with the shared phone normaliser).
- Notify-me: triggered when a product's availability goes from out of stock to in stock (stock edits, order cancellation returning stock, imports); each waiting request is messaged once, then marked `sent` (the existing `sentAt`); a failed send leaves it `waiting` so the admin can still use the manual button.

## Done when
- API unit tests with a fake sender cover: order message content, disabled/missing config, failure isolation, notify-me trigger once per restock and idempotency; lint, typecheck, tests green; docker compose has an optional `wa` service profile; docs/OPERATIONS.md explains pairing by QR.
