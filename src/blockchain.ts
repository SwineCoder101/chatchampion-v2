import dotenv from "dotenv";
import { WeiPerEther, ethers, formatEther } from "ethers";
import { ChatResult } from "./analysis"
import { UserWallet, getWalletByUserId, hasWallet, saveWallet,getWalletBySecretMessage, updateWallet } from "./data/wallet-repository"
import { create } from "domain";
import randomatic from "randomatic";



dotenv.config();

const tokenAbi = [
    "function rewardUsers(address[] users, uint256[] scores)",
    "function airDrop(address)",
    "function transfer(address to, uint256 value) public returns (bool)",
    "function balanceOf(address owner) view returns (uint256)",
  ];
const provider = new ethers.JsonRpcProvider(process.env.RPC);
const deployerWallet = new ethers.Wallet(
  process.env.DEPLOYER_PRIVATE_KEY,
  provider
);
const ChatChampionContract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  tokenAbi,
  deployerWallet
);

type MintWalletResult = {
    wallet: UserWallet;
    transactionReceiptUrl: string;
    secretMessage: string;
}

export function createSecretMessage(): string {
    return randomatic('Aa0!', 10);;
}

export async function mintWallet(
    userId: string
  ): Promise<MintWalletResult> {

    const hasWalletFlag = await hasWallet(userId);
    

    if(hasWalletFlag) {
        console.error("User already has a wallet.");
        const existingWallet = await getWalletByUserId(userId);
        return {wallet: existingWallet, transactionReceiptUrl: "", secretMessage: existingWallet.getSecretMessage()};
    }

    const secretMessage = createSecretMessage();
    const wallet = ethers.Wallet.createRandom();
    const address: string = wallet.address;
    const privateKey: string = wallet.privateKey;
    const databaseWallet = new UserWallet(userId, address, privateKey, secretMessage);
    await saveWallet(databaseWallet);

    const tx = await ChatChampionContract.airDrop(address);
    await tx.wait();
    const transactionReceiptURL = `${process.env.TX_EXPLORER}${tx.hash}`;
    return {
        wallet: databaseWallet,
        transactionReceiptUrl: transactionReceiptURL, // Send this to the user as a message.
        secretMessage
    };
  }

  export async function reward(chatResult: ChatResult): Promise<string> {
    let addresses: string[] = [];
    let scores: number[] = [];
    for (let i = 0; i < chatResult.users.length; i++) {
        addresses.push(chatResult.users[i].address);
        scores.push(chatResult.users[i].score);
        console.log("address: " + chatResult.users[i].address + "  Score: " + chatResult.users[i].score);
    }
    const tx = await ChatChampionContract.rewardUsers(addresses, scores);
    await tx.wait();

    const receiptUrl = process.env.TX_EXPLORER + "/tx/" + tx.hash.toString();

    return receiptUrl;
  }

  export const getAddressFromSignature = async (message: string, signature: string) => {
    try{
      const wallet: UserWallet = await getWalletBySecretMessage(message);
      const address = ethers.verifyMessage(message, signature);
      const isSignedIn = wallet ? true : false;

      console.log("address: ", address);
      console.log("isSignedIn: ", isSignedIn);

      if (isSignedIn) {
        wallet.setWalletAddress(address);
        await updateWallet(wallet);
      }

      return {address, isSignedIn};
    }catch(error){
        console.log(error);
    }
  }


  // Switch to a self custody wallet
async function redeemTokens(
    userId: string,
    personalWalletAddress: string,
  ): Promise<string> {
    try {
      const wallet: UserWallet = await getWalletByUserId(userId);
      const privateKey = wallet.getPrivateKey();
      const custodialWallet = new ethers.Wallet(privateKey, provider);
      const ChatChampionContractAsUser = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        tokenAbi,
        custodialWallet
      );
  
      // Fund gas, code should be replaced
      await deployerWallet.sendTransaction({
        to: custodialWallet,
        value: ethers.parseEther("0.05"),
      });
  
      const balance: ethers.BigNumberish = await ChatChampionContractAsUser.balanceOf(custodialWallet);
  
      if (ethers.getBigInt(balance) < ethers.getBigInt(100)) {
        console.error(
          `ERROR: User ${userId} has too low balance. Cannot proceed with the transfer.`
        );
        return;
      }
      const result = await ChatChampionContractAsUser.transfer(
        personalWalletAddress,
        balance
      );
      console.log(
        `Successfully transferred ${balance.toString()} tokens to ${personalWalletAddress} for user ${userId}. Transaction Hash: ${
          result.hash
        }`
      );
  
      return process.env.TX_EXPLORER + result.hash;
    } catch (error) {
      console.error(
        `ERROR: Failed to redeem tokens for user ${userId}. Details: ${error.message}`
      );
    }
  }
  