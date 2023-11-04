import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

const { PORT, TELEGRAM_TOKEN, SERVER_URL, MAINET_EXPLORER_URL } = process.env;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const URI = `/webhook/${TELEGRAM_TOKEN}`;
export const webhookURL = `${SERVER_URL}${URI}`;

export const setupWebhook = async () => {
    try {
      const { data } = await axios.get(
        `${TELEGRAM_API}/setWebhook?url=${webhookURL}&drop_pending_updates=true`
      );
      console.log(data);
    } catch (error: any) {
      console.error("Error setting up the webhook:", error.message);
    }
  };

  export const sendMessage = async (chatId: string, message: string) => {
    try {
      const { data } = await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: message,
      });
    } catch (error: any) {
      console.error("Error sending message:", error.message);
    }
  }