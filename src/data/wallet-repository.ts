import { ObjectId } from "mongodb";
import {getWalletCollection} from "../client/mongo-connnect";
import { connect } from "http2";
import { connectToMongo } from "../client/mongo-connnect";
import { get } from "http";
import { all } from "axios";

class UserWallet {
    private walletAddress: string;
    private privateKey: string;
    private userId: string;
    private secretMessage: string;

    constructor(userId, walletAddress, privateKey, secretMessage) {
        this.walletAddress = walletAddress;
        this.privateKey = privateKey;
        this.userId = userId;
        this.secretMessage = secretMessage;
    }

    setWalletAddress(walletAddress) {
        this.walletAddress = walletAddress;
    }

    getWalletAddress() {
        return this.walletAddress;
    }

    getSecretMessage() {
        return this.secretMessage;
    }

    getPrivateKey() {
        return this.privateKey;
    }

    getUserId() {
        return this.userId;
    }
}

export async function hasWallet(userId: string) : Promise<boolean>{ 
    const walletFound = await getWalletCollection().findOne({userId: userId});

    if(walletFound) {
        return true;
    }
    return false;
}

async function saveWallet(wallet: UserWallet) : Promise<boolean>{

    const walletFound = await getWalletCollection().findOne({userId: wallet.getUserId()});

    if(walletFound) {
        console.log("Wallet already exists");
        return false;
    }

    await getWalletCollection()
    .insertOne(wallet)
    .then((result) => {
        console.log(result);
    }).catch((err) => {
        console.log(err);
    });
    return true;
}

async function saveWalletFromStart(userId,secretMessage) : Promise<boolean>{
    const walletFound = await getWalletCollection().findOne({userId: userId});

    if(walletFound) {
        console.log("Wallet already exists");
        return false;
    }

    const databaseWallet = new UserWallet(userId, "", "", secretMessage);

    await getWalletCollection()
    .insertOne(databaseWallet)
    .then((result) => {
        console.log(result);
    }).catch((err) => {
        console.log(err);
    });
    return true;
}

async function updateWallet(wallet: UserWallet) : Promise<boolean>{
    const walletFound = await getWalletCollection().findOne({userId: wallet.getUserId()});

    if(!walletFound) {
        console.log("Wallet not found");
        return false;
    }

    await getWalletCollection()
    .updateOne({userId: wallet.getUserId()}, {$set: {walletAddress: wallet.getWalletAddress(), privateKey: wallet.getPrivateKey()}})
    .then((result) => {
        console.log(result);
    }).catch((err) => {
        console.log(err);
    });
    return true;
}

async function deleteWallet(userId) {
    const walletFound = await getWalletCollection().findOne({userId: userId});

    if(!walletFound) {
        console.log("Wallet not found");
        return false;
    }

    await getWalletCollection()
    .deleteOne({userId: userId})
    .then((result) => {
        console.log(result);
    }).catch((err) => {
        console.log(err);
    });
    return true;
}

async function getWalletByUserId(userId: string) : Promise<UserWallet>{
    try {
        const allWallets = await getWalletCollection().find({}).toArray();
        const result = allWallets.find((wallet) => wallet.userId.toString() === userId);
        if (!result) {
            console.error("No user with the userId " + userId + " in the database.");
        }
        return new UserWallet(result.userId, result.walletAddress, result.privateKey, result.secretMessage);
    } catch (err) {
        console.log(err);
        throw err;
    }
}

async function getWalletBySecretMessage(secretMessage: string) : Promise<UserWallet>{
    try {
        const result = await getWalletCollection().findOne({ secretMessage: secretMessage });
        if (!result) {
            console.error("No user with the secretMessage " + secretMessage + " in the database.");
        }
        return new UserWallet(result.userId, result.walletAddress, result.privateKey, result.secretMessage);
    } catch (err) {
        console.log(err);
        throw err;
    }
}

export {UserWallet, saveWallet, updateWallet, deleteWallet, getWalletByUserId, saveWalletFromStart, getWalletBySecretMessage};
