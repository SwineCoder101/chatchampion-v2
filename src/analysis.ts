import dotenv from "dotenv";
import axios from "axios";
import OpenAI from "openai";
import { UserWallet, getWalletByUserId } from "./data/wallet-repository"
import { connectToMongo } from "./client/mongo-connnect";


dotenv.config();

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const openai = new OpenAI({
    apiKey: "",
    baseURL: "http://flock.tools:8001/v1", // defaults to https://api.openai.com/v1
  });

  const instruction_score = `
  Analyze the participants of the conversation below based on their humor. 
  Consider elements like wit, puns, timing, and context. 
  Assign an integer score to the top three participants based on their humor. 
  Please provide the output in a JSON array with objects containing 'userid' and 'score' keys. 
  For example: 
  [
    {"userid": "user123", "score": 8}, 
    {"userid": "user456", "score": 7}, 
    {"userid": "user789", "score": 5}
  ]
  Ensure that the 'userid' corresponds to the unique identifier of the participant in the chat. 
  The scores should be integers without any additional text or characters.
  `;
  const instruction_review = `
    Based on the humor scores provided for the chatroom participants and the content of their messages, please explain the reasoning behind each participant's score.
    Focus on the use of wit, puns, timing, and how the context of the conversation enhances the humor.
    Provide a detailed analysis in a clear and concise paragraph for each of the top three scored participants.
    Discuss specific messages or exchanges that exemplify their use of humor and contributed to their score.
    Ensure that your explanation aligns with their assigned scores and the dynamics of the conversation.
    Remember to review the messages of each participant on the scoreboard.
    Add a paragraph at the end for each of the chatters who did not get a score where you tell them why they are bad at humor.
  `;
  
  async function userIdToUsername(userId) {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/getChatMember`, {
        params: {
          chat_id: process.env.TELEGRAM_GROUP_ID,
          user_id: userId
        }
      });
  
      if (response.data.ok) {
        const user = response.data.result.user;
        return user.username ? `@${user.username}` : `${user.first_name} ${user.last_name || ''}`.trim();
      } else {
        throw new Error(response.data.description || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error fetching username:', error);
      throw error;
    }
  }

  async function editBotMessage(chatId, messageId, newText) {
    try {
      // Check if the new text is not empty or too long for a Telegram message
      if (!newText || newText.length > 4096) {
        throw new Error('Text is empty or exceeds the maximum length of 4096 characters.');
      }
  
      const response = await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/editMessageText`, {
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        parse_mode: 'Markdown' // Optional: You can use 'Markdown' or 'HTML' for text formatting
      });
  
      if (response.data.ok) {
        console.log('Message edited successfully:', response.data.result);
        return response.data.result;
      } else {
        throw new Error(response.data.description || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }


  type UserResult = {
    userid: string;
    username: string;
    address: string;
    score: number;
  };

  function parseUserResults(scoreContent: string): UserResult[] {
    try {
      // Directly parse the scoreContent string as JSON
      const scoreArray: { userid: string; score: number; }[] = JSON.parse(scoreContent);
  
      return scoreArray.map(scoreObj => ({
        // Normalize the userid while mapping over the scoreArray
        userid: scoreObj.userid.startsWith('user') ? scoreObj.userid.slice(4) : scoreObj.userid,
        username: "unknown", // Placeholder value
        address: "unknown",  // Placeholder value
        score: scoreObj.score
      }));
    } catch (error) {
      console.error("Error parsing user results:", error);
      return [];
    }
  }
  
  type ChatResult = {
    users: UserResult[];
    analysis: string;
  };

// Rewards can be distributed to the addresses of the users in the ChatResult object.
async function analyzeChat(chatlog: string): Promise<ChatResult> {
    try {
      const resultScore = await openai.chat.completions.create({
        messages: [{ role: "user", content: instruction_score + '\n\n' + chatlog }],
        model: "hackathon-chat",
        temperature: 0,
      });
      const scoreContent = resultScore?.choices[0]?.message.content;
      //console.log("The score content: " + scoreContent);
      let userResults: UserResult[] = parseUserResults(scoreContent);
      
      for (let i = 0; i < userResults.length; i++) {
        userResults[i].username = await userIdToUsername(userResults[i].userid);
        const wallet: UserWallet = await getWalletByUserId(userResults[i].userid);
        userResults[i].address = wallet.getWalletAddress();
      }
      //console.log("Stringified scores: " + JSON.stringify(userResults);
      const resultReview = await openai.chat.completions.create({
        messages: [{ role: "user", content: instruction_review + '\n\n' + JSON.stringify(userResults) + '\n\n' + chatlog }],
        model: "hackathon-chat",
        temperature: 0.15,
      });
      const reviewContent = resultReview?.choices[0]?.message.content;
      //console.log("The review content: " + reviewContent);
  
      // Placeholder for parsing function - you need to implement it according to your data format
      const analysis: string = reviewContent || ''; // You might want to parse this if it's structured
  
      const chatResult: ChatResult = {
        users: userResults,
        analysis: analysis
      }
    if (chatResult.users.length > 3) {
        chatResult.users = chatResult.users.slice(0, 3);
    }
    while (chatResult.users.length < 3) {
        chatResult.users.push({
            userid: "",
            username: "",
            address: ZERO_ADDRESS,
            score: 0
        });
    }
      return chatResult;
    } catch (error) {
      console.error("Error getting completion from OpenAI:", error);
      throw error;
    }
}
/*
async function main () {
    await connectToMongo();
    const result = await analyzeChat(`[
        {
          "from": "Cat | Aztec",
          "from_id": "user1464004228",
          "text": "Wow, this bot is brutal"
        },
        {
          "from": "Liam",
          "from_id": "user5338078853",
          "text": "its been thoroughly trained haha"
        },
        {
          "from": "Henrik",
          "from_id": "user1386759162",
          "text": "Liam is the chat champion at the moment"
        },
        {
          "from": "Liam",
          "from_id": "user5338078853",
          "text": "https://flare-explorer.flare.network/token/0xEf2Dc8d7c4667e34ab33B375020c85339d82D173/token-holders"
        },
        {
          "from": "Liam",
          "from_id": "user5338078853",
          "text": "interesting statistics here"
        },
        {
          "from": "Steven Xoao",
          "from_id": "user1594037031",
          "text": "Boring"
        },
        {
          "from": "Steven Xoao",
          "from_id": "user1594037031",
          "text": "Minus points"
        },
        {
          "from": "Steven Xoao",
          "from_id": "user1594037031",
          "text": "💀💀💀"
        },
        {
          "from": "tim | FLock.io",
          "from_id": "user1784852088",
          "text": "wow"
        },
        {
          "from": "tim | FLock.io",
          "from_id": "user1784852088",
          "text": "our model actually works"
        },
        {
          "from": "Cat | Aztec",
          "from_id": "user1464004228",
          "text": "this is a really great idea for measuring and incentivising engagement in crypto communities"
        },
        {
          "from": "tim | FLock.io",
          "from_id": "user1784852088",
          "text": "tears"
        },
        {
          "from": "Steven Xoao",
          "from_id": "user1594037031",
          "text": "Such wow 😮"
        },
        {
          "from": "tim | FLock.io",
          "from_id": "user1784852088",
          "text": "we will provide better ones, currently talking to the team"
        },
        {
          "from": "Cat | Aztec",
          "from_id": "user1464004228",
          "text": "There’s a ton of bots for growth but i know as a dev rel we were always looking for better ways to improve engagement so this is cool"
        },
        {
          "from": "Liam",
          "from_id": "user5338078853",
          "text": "thanks cat 🙂 we were thinking about other use cases and changing the context"
        },
        {
          "from": "Cat | Aztec",
          "from_id": "user1464004228",
          "text": "If you can get this on discord (especially if you can integrate other tokens) this is something I can defo see a few projects using"
        }
      ]
      `);
      console.log(result.users)
      console.log(result.analysis)
}
  main();
*/
  export { ChatResult }
