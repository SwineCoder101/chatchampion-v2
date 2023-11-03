import dotenv from "dotenv";
import { ethers } from 'ethers';
import { MongoClient } from 'mongodb';
dotenv.config();

const { MONGO_URI, DATABASE_NAME,  WALLET_COLLECTION} = process.env;
const mongoUri = MONGO_URI;
const databaseName = DATABASE_NAME;
const walletCollection = WALLET_COLLECTION;
const client = new MongoClient(mongoUri);

// This is a simple interface for UserWallet for TypeScript type checking
interface UserWallet {
  _id: string;
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
        _id: userId,
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

const v1UserIds = [
"user1025110875",
"user1215243372",
"user1386759162",
"user1416734808",
"user1464004228",
"user1504733653",
"user1592764845",
"user1594037031",
"user1605718416",
"user1724078560",
"user1784852088",
"user1796341903",
"user1801721272",
"user188370039",
"user2002162567",
"user2135878396",
"user218779178",
"user228949841",
"user352937388",
"user478708293",
"user5020999937",
"user5338078853",
"user5671819603",
"user5809778581",
"user5987259731",
"user6128355040",
"user6276920373",
"user6645472629",
"user6683623451",
"user844089560",
"user919386808"];
addWalletsForUserIds(v1UserIds)
  .then(() => console.log('V1 wallets added successfully.'))
  .catch(console.error);
