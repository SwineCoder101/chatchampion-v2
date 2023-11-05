import cors from 'cors';
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import path from 'path';
import { analyzeChat } from "./analysis";
import { createSecretMessage, getAddressFromSignature, mintWallet, reward, redeemTokens } from "./blockchain";
import { connectToMongo } from "./client/mongo-connnect";
import { sendMessage, setupWebhook } from "./client/web-hook";
import { deleteAllMessages, getFormatedMessages, saveMessage } from "./data/message-repository";
import { saveWalletFromStart } from "./data/wallet-repository";


dotenv.config();

const { PORT, TELEGRAM_TOKEN, SERVER_URL, MAINET_EXPLORER_URL } = process.env;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const URI = `/webhook/${TELEGRAM_TOKEN}`;
const webhookURL = `${SERVER_URL}${URI}`;

const app = express();
app.use(express.json());

// Set up a whitelist and check against it:
const whitelist = ['http://localhost:5173', SERVER_URL]; // Replace with your frontend's URL
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.options('*', cors(corsOptions));

app.use(cors(corsOptions));


app.post('/signWallet', async (req: Request, res: Response) => {
    console.log('signing the wallet here....   ');
    try{
        const chunk = req.body;
        console.log("about to sign wallet here....");
        const {address, isSignedIn} = await getAddressFromSignature(chunk.message,chunk.signature);

        return res.status(200).send({isSignedIn, address});
    }catch(error){
        console.error(error);
        return res.status(500).send({isSignedIn: false});
    };
});


app.post(URI, async (req: Request, res: Response) => {
    try {
      const chunk = req.body;
      const chatId = chunk.message.chat.id;
      const userId = chunk.message.from.id;
      const sentMessage = chunk.message.text || "";
      console.log("chatId", chatId);
      console.log(chunk);
      let isCommand = false;
    
      const regexRedeem = /^\/redeem\s+(\S+)/;
      const matchForRedeem = sentMessage.match(regexRedeem);

      const regexCreateWallet = /^\/createWallet\s+(\S+)/;
      const matchForCreateWallet = sentMessage.match(regexCreateWallet);

      //check if chunk has new_chat_participant
      if (chunk.message.new_chat_participant) {
        console.log("--------------> new user joined");
        const newUserInfo = chunk.message.new_chat_participant;
        const {secretMessage} = await mintWallet(newUserInfo.id);
      }

      if (matchForRedeem){
        const address = matchForRedeem[1];
        console.log("--------------> redeeming for address: ", address);
        await redeemTokens(userId, address);
        // await sendMessage(chatId, `redeemed for address: ${address} with minted tokens: ${transactionReceiptUrl}`);
      }

      if (matchForCreateWallet) {
        const userId = matchForCreateWallet[1];
        console.log("--------------> creating wallet for user id: ", userId);
        const {secretMessage, transactionReceiptUrl} = await mintWallet(userId);
        await sendMessage(chatId, `creating wallet for user id with minted tokens: ${transactionReceiptUrl}`);
      }
      
  
      //analyze the chat
       if (sentMessage === "/analyze") {
        const updates = await getFormatedMessages();
        await sendMessage(chatId, "Analysing the chat now ...");
        const chatResult = await analyzeChat(updates);
        console.log(chatResult.users.length);
        if (chatResult.users.length == 0) {
          sendMessage(chatId, "I made a mistake in my JSON file and could not reward any users.");
        } else {
          //await sendMessage(chatId, chatResult.analysis + "\n" + chatResult.users.join("\n"));
          const rewardReceipt = await reward(chatResult);
          await sendMessage(chatId, chatResult.analysis + "\n" + rewardReceipt);
          await deleteAllMessages();
        }
        isCommand = true;

      }
  
      if (sentMessage === "/start") {
        const secretMessage = createSecretMessage();
        const isNew = await saveWalletFromStart(userId, secretMessage);
        
        const welcomeMsg = `Welcome Chat Champion! 🌟🚀🎉
  
              Welcome to Chat Champions, an engaging Telegram community where you can earn tokens by chatting, engaging with communities, and sharing your humor through jokes. Join us, climb the leaderboard for rewards, participate in fun challenges, and reach out to our Chatbot Champions for assistance. Don't forget to create your wallet by messaging our admins to enhance your Chat Champions experience! 🌟💬🚀🎉
              
              Why be a Chat Champion?
              - Earn tokens by chatting and engaging with communities. 💬💰
              - Share humor and make jokes to add positivity. 😂😁
              - Climb the leaderboard for exciting rewards. 🏆🎁
              - Participate in regular challenges and special events. 🌈🎉
              - Chatbot Champions are ready to assist you. 🤖💼
              - Create your wallet for an enhanced experience. 💼✨

              How to be a Chat Champion?
              - To redeem your tokens, type /redeem <address>💰
              - To recieve tokens in your own wallet click connect and enter the secret message ${secretMessage} 💼
              
              Join now and DM our admins to get EXCLUSIVE ACCESS and WIN CHAMP Tokens!💬🏆`;
  
        await sendMessage(chatId, welcomeMsg);
        isCommand = true;
      }

      if (!isCommand){
          await saveMessage(req.body);
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