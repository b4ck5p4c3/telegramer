# telegramer

Telegram Bot API proxy for supporting multiple bots without using separate bots

On any webhook request, it sends webhook data to all sub-bots, and on reply it just proxifies it to Telegram Bot API

## Environment
- `TELEGRAM_BOT_TOKEN` - Telegram Bot token
- `PUBLIC_ENDPOINT_URL` - URL for Telegram API setWebhook (should proxy to `/` of `PUBLIC_ENDPOINT_PORT`)
- `PUBLIC_ENDPOINT_PORT` - Port of public (webhook receiver) endpoint
- `PRIVATE_ENDPOINT_PORT` - Port of private (Telegram API proxy) endpoint
- `SUB_BOTS` - List of sub-bot endpoints (POST of webhooks)
 
  Example: `http://10.0.2.211:8001/telegram,http://10.0.2.211:8002/telegram`
- `STUB_BOT_TOKEN` - Fake Telegram Bot token for private endpoint, default is `1337008:B4CKSP4CEB4CKSP4CEB4CKSP4CEB4CKSP4C`