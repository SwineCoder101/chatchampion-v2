import { ObjectId } from "mongodb";
import {getWalletCollection} from "../client/mongo-connnect";
import { connect } from "http2";
import { connectToMongo } from "../client/mongo-connnect";
import { get } from "http";

class UserWallet {
    private walletAddress: string;
    private privateKey: string;
    private userId: string;

    constructor(userId, walletAddress, privateKey) {
        this.walletAddress = walletAddress;
        this.privateKey = privateKey;
        this.userId = userId;
    }

    getWalletAddress() {
        return this.walletAddress;
    }

    getPrivateKey() {
        return this.privateKey;
    }

    getUserId() {
        return this.userId;
    }
}

async function saveWallet(wallet: Wallet) : Promise<boolean>{

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

async function updateWallet(wallet: Wallet) : Promise<boolean>{
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

async function getWalletByUserId(userId) {
    await getWalletCollection().findOne({userId: userId}).then((result) => {
        console.log(result);
    }
    ).catch((err) => {
        console.log(err);
    });
}

export {Wallet, saveWallet, updateWallet, deleteWallet, getWalletByUserId};