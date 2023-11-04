import dotenv from "dotenv";
import express, { Request, Response } from "express";
import axios from "axios";
import { WeiPerEther, ethers, formatEther } from "ethers";
import OpenAI from "openai";
import { Chat } from "openai/resources";

dotenv.config();

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
  `;
  
  async function userIdToUsername(userId) {
    const normalizedUserId = userId.startsWith('user') ? userId.slice(4) : userId;
    userId = normalizedUserId;
    try {
      const response = await axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChatMember`, {
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

  async function userIdToAddress(userId): Promise<string> {
    // get address from db here
    return "";
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
        userid: scoreObj.userid,
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

async function analyzeChat(chatlog: string): Promise<ChatResult> {
    try {
      const resultScore = await openai.chat.completions.create({
        messages: [{ role: "user", content: instruction_score + '\n\n' + chatlog }],
        model: "hackathon-chat",
        temperature: 0,
      });
      const scoreContent = resultScore?.choices[0]?.message.content;
      console.log("The score content: " + scoreContent);
      let userResults: UserResult[] = parseUserResults(scoreContent);
      
      for (let i = 0; i < userResults.length; i++) {
        userResults[i].username = await userIdToUsername(userResults[i].userid);
        userResults[i].address = await userIdToAddress(userResults[i].userid);
      }
      const scoreStringified = JSON.stringify(userResults);
      console.log("Stringified scores: " + scoreStringified);
      const resultReview = await openai.chat.completions.create({
        messages: [{ role: "user", content: instruction_review + '\n\n' + JSON.stringify(userResults) + '\n\n' + chatlog }],
        model: "hackathon-chat",
        temperature: 0.15,
      });
      const reviewContent = resultReview?.choices[0]?.message.content;
      console.log("The review content: " + reviewContent);
  
      // Placeholder for parsing function - you need to implement it according to your data format
      const analysis: string = reviewContent || ''; // You might want to parse this if it's structured
  
      const chatResult: ChatResult = {
        users: userResults,
        analysis: analysis
      }
      return chatResult;
    } catch (error) {
      console.error("Error getting completion from OpenAI:", error);
      throw error;
    }
}

function main () {
    /*analyzeChat(`{"ok":true,"result":[{"update_id":177312581,
    "message":{"message_id":23,"from":{"id":5338078853,"is_bot":false,"first_name":"Liam","username":"LiamTel","language_code":"en"},"chat":{"id":-4066054986,"title":"Chat Championship","type":"group","all_members_are_administrators":true},"date":1698452054,"text":"hey henrik whatsup , this is a test"}},{"update_id":177312582,
    "message":{"message_id":24,"from":{"id":1386759162,"is_bot":false,"first_name":"Henrik","username":"henrik1111","language_code":"en"},"chat":{"id":-4066054986,"title":"Chat Championship","type":"group","all_members_are_administrators":true},"date":1698452068,"text":"Thanks for giving sample text"}},{"update_id":177312583,
    "message":{"message_id":25,"from":{"id":1386759162,"is_bot":false,"first_name":"Henrik","username":"henrik1111","language_code":"en"},"chat":{"id":-4066054986,"title":"Chat Championship","type":"group","all_members_are_administrators":true},"date":1698452071,"text":"lol"}},{"update_id":177312584,
    "message":{"message_id":26,"from":{"id":5338078853,"is_bot":false,"first_name":"Liam","username":"LiamTel","language_code":"en"},"chat":{"id":-4066054986,"title":"Chat Championship","type":"group","all_members_are_administrators":true},"date":1698452083,"text":"do you know whats blue and not heavy?"}},{"update_id":177312585,
    "message":{"message_id":27,"from":{"id":1386759162,"is_bot":false,"first_name":"Henrik","username":"henrik1111","language_code":"en"},"chat":{"id":-4066054986,"title":"Chat Championship","type":"group","all_members_are_administrators":true},"date":1698452088,"text":"no"}},{"update_id":177312586,
    "message":{"message_id":28,"from":{"id":5338078853,"is_bot":false,"first_name":"Liam","username":"LiamTel","language_code":"en"},"chat":{"id":-4066054986,"title":"Chat Championship","type":"group","all_members_are_administrators":true},"date":1698452093,"text":"light blue"}},{"update_id":177312587,
    "message":{"message_id":29,"from":{"id":1386759162,"is_bot":false,"first_name":"Henrik","username":"henrik1111","language_code":"en"},"chat":{"id":-4066054986,"title":"Chat Championship","type":"group","all_members_are_administrators":true},"date":1698452097,"text":"ahhahhah'"}}]}`);
*/
    analyzeChat(`[
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
}
  main();

/*
async function startAnalysis(messages: string) {
    console.log("Result:\n");
    var result = await analyzeChat(instruction + messages);
    console.log(result);
  
    const reciepts = await distribute(result);
  
    console.log("Reasoning:\n");
    var reasoning = await analyzeChat(
      instruction2 +
        "\n\nLeaderboard:\n" +
        result +
        "\n\nChatroom messages:\n" +
        messages
    );
    return { reasoning, reciepts };
  }

  //analyze the chat
  if (sentMessage === "/analyze") {
    const updates = ChatCache.getUpdates(chatId);
    await sendMessage(chatId, "Analysing the chat now ...");
    const { reasoning, reciepts } = await startAnalysis(updates);
    console.log(reasoning);
    await sendMessage(chatId, reasoning + "\n" + reciepts.join("\n"));
    ChatCache.resetChat(chatId);
  }
*/