import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import {setupWebhook,sendMessage} from "./client/web-hook";
import { connect } from "http2";
import { connectToMongo } from "./client/mongo-connnect";
import  { Message,convertToMessageObject ,deleteAllMessages,saveMessage, getFormatedMessages } from "./data/message-repository";
import { analyzeChat } from "./analysis"
import path from 'path';
import { reward } from "./blockchain";

dotenv.config();

const { PORT, TELEGRAM_TOKEN, SERVER_URL, MAINET_EXPLORER_URL } = process.env;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const URI = `/webhook/${TELEGRAM_TOKEN}`;
const webhookURL = `${SERVER_URL}${URI}`;

const app = express();
app.use(express.json());




app.post(URI, async (req: Request, res: Response) => {
    try {
      const chunk = req.body;
      const chatId = chunk.message.chat.id;
      const userId = chunk.message.from.id;
      const sentMessage = chunk.message.text;
      console.log("chatId", chatId);
      console.log(chunk);
      // ChatCache.addUpdate(chatId, req.body);
      await saveMessage(req.body);
    
      const regexRedeem = /^\/redeem\s+(\S+)/;
      const matchForRedeem = sentMessage.match(regexRedeem);
  

  
      //analyze the chat
       if (sentMessage === "/analyze") {
        const updates = await getFormatedMessages();
        await sendMessage(chatId, "Analysing the chat now ...");
        const chatResult = await analyzeChat(updates);
        if (chatResult.users.length < 1) {
          sendMessage(chatId, "I made a mistake in my JSON file and could not reward any users.");
        }
        //await sendMessage(chatId, chatResult.analysis + "\n" + chatResult.users.join("\n"));
        const rewardReceipt = await reward(chatResult);
        await sendMessage(chatId, chatResult.analysis + "\n" + rewardReceipt);
        //ChatCache.resetChat(chatId);
      }
  
      if (sentMessage === "/start") {
        const welcomeMsg = `Welcome Chat Champion! 🌟🚀🎉
  
              Welcome to Chat Champions, an engaging Telegram community where you can earn tokens by chatting, engaging with communities, and sharing your humor through jokes. Join us, climb the leaderboard for rewards, participate in fun challenges, and reach out to our Chatbot Champions for assistance. Don't forget to create your wallet by messaging our admins to enhance your Chat Champions experience! 🌟💬🚀🎉
              
              Why be a Chat Champion?
              - Earn tokens by chatting and engaging with communities. 💬💰
              - Share humor and make jokes to add positivity. 😂😁
              - Climb the leaderboard for exciting rewards. 🏆🎁
              - Participate in regular challenges and special events. 🌈🎉
              - Chatbot Champions are ready to assist you. 🤖💼
              - Create your wallet for an enhanced experience. 💼✨
              - To redeem your tokens, type /redeem <address>💰
              
              Join now and DM our admins to get EXCLUSIVE ACCESS and WIN CHAMP Tokens!💬🏆`;
  
        await sendMessage(chatId, welcomeMsg);
      }
  
      // Send the response after the asynchronous operation is complete
      res.status(200).send("ok");
    } catch (error) {
      console.error(error);
  
      // Since no response has been sent yet, it's safe to send the error response here
      res.status(500).send("Internal Server Error");
    }
  });

const CONNECT_WALLET_HTML_PATH = "../connectWallet/dist";
const CONNECT_WALLET_HTML = `${CONNECT_WALLET_HTML_PATH}/index.html`;

app.use('/connectWallet', express.static(path.join(__dirname, "../connectWallet/dist")));


app.get('/connectWallet', (req, res) => {
    res.sendFile(path.join(__dirname, CONNECT_WALLET_HTML));
});


app.listen(PORT, async () => {
    console.log(`Server running on port: ${PORT}`);
    try {
      await setupWebhook();
      await connectToMongo();
    } catch (error) {
      console.error("Webhook setup failed:", error.message);
    }
  });















      //   if (matchForRedeem) {
    //     const address = matchForRedeem[1];
    //     let userWalletInfo = await queryDatabaseByUserId(userId + "A");
    //     console.log(userWalletInfo);
  
    //     if (!userWalletInfo || !userWalletInfo.address) {
    //       await sendMessage(
    //         chatId,
    //         "The following user does not have a wallet: " +
    //           userWalletInfo.username
    //       );
    //     }
  
    //     if (!userWalletInfo || !userWalletInfo.address) {
    //       await sendMessage(
    //         chatId,
    //         "The following user had already redeemed" +
    //           userWalletInfo.username +
    //           " to address: " +
    //           userWalletInfo.address
    //       );
    //     }
  
    //     await sendMessage(
    //       chatId,
    //       "about to redeem tokens for " +
    //         userWalletInfo.username +
    //         " to address: " +
    //         address
    //     );
  
    //     const urlReciept = await redeemTokens(
    //       userWalletInfo.username,
    //       address,
    //       userWalletInfo.key,
    //       userWalletInfo.address
    //     );
  
    //     // await deleteRowByUsername(userWalletInfo.username);
    //     // await addToDatabase(userId + "A", userWalletInfo.username, '', address);
  
    //     const numberOftokens = await balanceOf(address);
    //   }
  