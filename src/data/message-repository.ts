import { get } from "http";
import {getMessageCollection}  from "../client/mongo-connnect";

export class Message {
  private userId;
  private username;
  private timestamp;
  private channelId;
  private message;
  private messageId;

  //timestamp : username(userId) : message

  constructor(userId, username, timestamp, channelId, message, messageId) {
    this.userId = userId;
    this.username = username;
    this.timestamp = timestamp;
    this.channelId = channelId;
    this.message = message;
    this.messageId = messageId;
  }

  save() {
    return getMessageCollection()
      .updateOne(
        { _id: this.messageId },
        { $set: this },
        { upsert: true } // This will insert a new document if one doesn't exist with the provided _id
      )
      .then((result) => {
        console.log(result);
      })
      .catch((err) => {
        console.log(err);
      });
  }
}

export async function deleteAllMessages(){
  await getMessageCollection().deleteMany({});
}

export async function getAllMessages(){
  return await getMessageCollection().find({}).toArray();
}
/*
//to be used for the analysis
export async function getformattedMessages(){
  const messages = await getAllMessages();
  const formattedMessages = messages.map((message) => {
    return `${message.timestamp} : ${message.username}(${message.userId}) : ${message.message}`;
  });
  return formattedMessages.join("\n");
}
*/
export async function getFormatedMessages() {
  const messages = await getAllMessages(); // Assuming this function returns a promise with the raw message data

  // Map the raw message data to the desired format
  const formattedMessages = messages.map((message) => {
    return {
      from: message.username,     // Assuming 'username' field exists and should be used for 'from'
      from_id: `user${message.userId}`, // Prefixing 'user' to the userId
      text: message.message       // Assuming 'message' field exists for the message text
    };
  });

  return JSON.stringify(formattedMessages, null, 2);
}

export async function saveMessage(telegramPayload: any){
  const message = convertToMessageObject(telegramPayload);
  if (message) {
    await message.save();
  }
}

export function convertToMessageObject(telegramPayload: any): Message | null {
  const messageData = telegramPayload.message;
  if (!messageData) {
    return null;
  }

  const userId = messageData.from?.id;
  const username = messageData.from?.username;
  const timestamp = new Date(messageData.date * 1000); // Telegram date is in Unix timestamp format
  const channelId = messageData.chat?.id;
  const message = messageData.text;
  const messageId = telegramPayload.update_id;
  const firstname = messageData.from?.first_name;

  if (userId && username && channelId && message && firstname) {
    return new Message(
      userId,
      username,
      timestamp,
      channelId,
      message,
      messageId
    );
  }

  return null;
}