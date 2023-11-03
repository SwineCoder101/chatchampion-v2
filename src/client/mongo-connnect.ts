import { data } from "cheerio/lib/api/attributes";
import dotenv from "dotenv";
import { ethers } from 'ethers';
import { connect } from "http2";
import { MongoClient } from 'mongodb';
dotenv.config();

const { MONGO_URI, DATABASE_NAME,  WALLET_COLLECTION, MESSAGE_COLLECTION} = process.env;
const client = new MongoClient(MONGO_URI);
const database = client.db(DATABASE_NAME);
const getWalletCollection = () => database.collection(WALLET_COLLECTION);
const getMessageCollection = () => database.collection(MESSAGE_COLLECTION);


const connectToMongo = async () => {
client.connect().then(() => {
    console.log('Connected successfully to MongoDB server');
}).catch((err) => {}) }


export {client, getWalletCollection, getMessageCollection, connectToMongo}