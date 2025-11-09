import { createLogger } from "./logger";

const logger = createLogger("telegram");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Sends a message to the configured Telegram group using Markdown formatting
 * @param message The message to send (supports Markdown formatting)
 */
export async function sendTelegramMessage(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    logger.warn(
      "Telegram configuration missing - TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set"
    );
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error(
        {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        },
        "Failed to send Telegram message"
      );
      return;
    }

    const result = await response.json();
    if (!result.ok) {
      logger.error({ error: result }, "Telegram API returned error");
      return;
    }

    logger.info("Telegram message sent successfully");
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Error sending Telegram message"
    );
  }
}
