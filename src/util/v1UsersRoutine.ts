import dotenv from "dotenv";
import { ethers } from 'ethers';
import { MongoClient } from 'mongodb';
import V1_USER_IDS from "./constants";
dotenv.config();

const { MONGO_URI, DATABASE_NAME,  WALLET_COLLECTION} = process.env;
const mongoUri = MONGO_URI;
const databaseName = DATABASE_NAME;
const walletCollection = WALLET_COLLECTION;
const client = new MongoClient(mongoUri);

// This is a simple interface for UserWallet for TypeScript type checking
interface UserWallet {
  userId: string;
  walletAddress: string;
  privateKey: string;
}

async function addWalletsForUserIds(userIds: string[]): Promise<void> {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected successfully to MongoDB server');

    // Select the database and collection
    const database = client.db(databaseName);
    const collection = database.collection(walletCollection);

    // Process each userId to create a new wallet and insert it into the database
    for (const userId of userIds) {
      // Generate a new wallet
      const wallet = ethers.Wallet.createRandom();

      // Create a UserWallet object
      const userWallet: UserWallet = {
        userId: userId,
        walletAddress: wallet.address,
        privateKey: wallet.privateKey,
      };

      // Insert the wallet into the MongoDB database
      await collection.insertOne(userWallet);
      console.log(`Wallet for user ${userId} added to MongoDB.`);
    }
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    // Ensure that the client will close when you finish/error
    await client.close();
  }
}


  async function main (){
    addWalletsForUserIds(V1_USER_IDS);
  }

  main().then(() => console.log('V1 wallets added successfully.'));