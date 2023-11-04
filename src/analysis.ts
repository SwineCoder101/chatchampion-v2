import dotenv from "dotenv";
import express, { Request, Response } from "express";
import axios from "axios";
import { WeiPerEther, ethers, formatEther } from "ethers";
import OpenAI from "openai";
import { Chat } from "openai/resources";

dotenv.config();

const { PORT, TELEGRAM_TOKEN, SERVER_URL, MAINET_EXPLORER_URL } = process.env;


const openai = new OpenAI({
    apiKey: "",
    baseURL: "http://flock.tools:8001/v1", // defaults to https://api.openai.com/v1
  });
  const instruction_score = `Analyze the participants of the conversation below based on their humor. Consider elements like wit, puns, timing, and context. Give an integer score to the top participants. The maximum number of people to review is three. Only give output as a JSON file. non-JSON output will break the parsing. The output should have a format like this:   [userid: score]`;
  const instruction_review = `In the chatroom below, participants were rated based on the humor level of their messages. The participants are referenced by userid instead of their names in the leaderboard. Using the provided leaderboard and messages, determine the reasoning behind each participant's score. How do their messages reflect their ranking on the leaderboard? Consider elements such as wit, puns, timing, and the context of the conversation.`;
  

  type UserResult = {
    userid: string;
    username: string;
    address: string;
    score: number;
  };
  type ChatResult = {
    users: UserResult[];
    analysis: string;
  };

  // Placeholder for parseUserResults function - this function should take the score content
  // and extract the relevant information to construct UserResult objects.
  function parseUserResults(scoreContent: string): UserResult[] {
    // This is just a placeholder, you need to implement the logic based on how the score content is structured.
    // Assume it's a JSON array of user results
    try {
      const userResults = JSON.parse(scoreContent);
      return userResults.map((user: any) => ({
        userid: user.userid,
        //address: user.address,
        score: user.score
      }));
    } catch (e) {
      console.error("Error parsing user results:", e);
      throw e;
    }
  }

async function analyzeChat(chatlog: string): Promise<ChatResult> {
    try {
      const resultScore = await openai.chat.completions.create({
        messages: [{ role: "user", content: instruction_score + '\n\n' + chatlog }],
        model: "hackathon-chat",
        temperature: 0,
      });
      const scoreContent = resultScore?.choices[0]?.message.content;

      const resultReview = await openai.chat.completions.create({
        messages: [{ role: "user", content: instruction_review + '\n\n' + scoreContent + '\n\n' + chatlog }],
        model: "hackathon-chat",
        temperature: 0.15,
      });
      const reviewContent = resultReview?.choices[0]?.message.content;
      console.log(scoreContent);
      console.log(reviewContent);
  
      // Placeholder for parsing function - you need to implement it according to your data format
      const userResults: UserResult[] = parseUserResults(scoreContent);
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
    analyzeChat(`{"ok":true,"result":[{"update_id":177312581,
    "message":{"message_id":23,"from":{"id":5338078853,"is_bot":false,"first_name":"Liam","username":"LiamTel","language_code":"en"},"chat":{"id":-4066054986,"title":"Chat Championship","type":"group","all_members_are_administrators":true},"date":1698452054,"text":"hey henrik whatsup , this is a test"}},{"update_id":177312582,
    "message":{"message_id":24,"from":{"id":1386759162,"is_bot":false,"first_name":"Henrik","username":"henrik1111","language_code":"en"},"chat":{"id":-4066054986,"title":"Chat Championship","type":"group","all_members_are_administrators":true},"date":1698452068,"text":"Thanks for giving sample text"}},{"update_id":177312583,
    "message":{"message_id":25,"from":{"id":1386759162,"is_bot":false,"first_name":"Henrik","username":"henrik1111","language_code":"en"},"chat":{"id":-4066054986,"title":"Chat Championship","type":"group","all_members_are_administrators":true},"date":1698452071,"text":"lol"}},{"update_id":177312584,
    "message":{"message_id":26,"from":{"id":5338078853,"is_bot":false,"first_name":"Liam","username":"LiamTel","language_code":"en"},"chat":{"id":-4066054986,"title":"Chat Championship","type":"group","all_members_are_administrators":true},"date":1698452083,"text":"do you know whats blue and not heavy?"}},{"update_id":177312585,
    "message":{"message_id":27,"from":{"id":1386759162,"is_bot":false,"first_name":"Henrik","username":"henrik1111","language_code":"en"},"chat":{"id":-4066054986,"title":"Chat Championship","type":"group","all_members_are_administrators":true},"date":1698452088,"text":"no"}},{"update_id":177312586,
    "message":{"message_id":28,"from":{"id":5338078853,"is_bot":false,"first_name":"Liam","username":"LiamTel","language_code":"en"},"chat":{"id":-4066054986,"title":"Chat Championship","type":"group","all_members_are_administrators":true},"date":1698452093,"text":"light blue"}},{"update_id":177312587,
    "message":{"message_id":29,"from":{"id":1386759162,"is_bot":false,"first_name":"Henrik","username":"henrik1111","language_code":"en"},"chat":{"id":-4066054986,"title":"Chat Championship","type":"group","all_members_are_administrators":true},"date":1698452097,"text":"ahhahhah'"}}]}`);

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