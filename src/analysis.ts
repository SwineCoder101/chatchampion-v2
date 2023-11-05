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
    {"userid": "user1234567890", "score": 8}, 
    {"userid": "user2345678901", "score": 7}, 
    {"userid": "user3456789012", "score": 5}
  ]
  Ensure that the 'userid' corresponds to the unique identifier of the participant in the chat.
  Do not make up other users that are not in the group chat.
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
  export type ChatResult = {
    users: UserResult[];
    analysis: string;
  };

// Rewards can be distributed to the addresses of the users in the ChatResult object.
export async function analyzeChat(chatlog: string): Promise<ChatResult> {
    try {
      const resultScore = await openai.chat.completions.create({
        messages: [{ role: "user", content: instruction_score + '\n\n' + chatlog }],
        model: "hackathon-chat",
        temperature: 0,
      });
      const scoreContent = resultScore?.choices[0]?.message.content;
      console.log(chatlog);
      //console.log("The score content: " + scoreContent);
      let userResults: UserResult[] = await parseUserResults(scoreContent);
      
      const filteredUserResults = [];
      const seenWalletAddresses = {};
      
      for (const userResult of userResults) {
        const wallet: UserWallet = await getWalletByUserId(userResult.userid);
        // Check if the wallet exists and has a non-empty user ID,
        // and also if the wallet address has not been seen before.
        if (wallet && wallet.getUserId() !== "" && !seenWalletAddresses[wallet.getWalletAddress()]) {
          userResult.address = wallet.getWalletAddress();
          userResult.username = await userIdToUsername(userResult.userid);
          filteredUserResults.push(userResult);
          // Mark this wallet address as seen.
          seenWalletAddresses[userResult.address] = true;
        } else {
          console.log("Deleting the score of:", userResult);
        }
      }
      const resultReview = await openai.chat.completions.create({
        messages: [{ role: "user", content: instruction_review + '\n\n' + JSON.stringify(filteredUserResults) + '\n\n' + chatlog }],
        model: "hackathon-chat",
        temperature: 0.15,
      });
      const reviewContent = resultReview?.choices[0]?.message.content;
      //console.log("The review content: " + reviewContent);
      const analysis: string = reviewContent || '';
      const chatResult: ChatResult = {
        users: filteredUserResults,
        analysis: analysis
      }
      return chatResult;
    } catch (error) {
      console.error("Error getting completion from OpenAI:", error);
      throw error;
    }
}
