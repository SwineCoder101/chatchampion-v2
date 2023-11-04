import dotenv from "dotenv";
import { WeiPerEther, ethers, formatEther } from "ethers";
import { ChatResult } from "./analysis"
import { UserWallet, getWalletByUserId, saveWallet } from "./data/wallet-repository"



dotenv.config();

const tokenAbi = [
    "rewardUsers(address,address,address,uint256,uint256,uint256)",
    "airDrop(address)",
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
}
async function mintWallet(
    userId: string
  ): Promise<MintWalletResult> {
    const wallet = ethers.Wallet.createRandom();
    const address: string = wallet.address;
    const privateKey: string = wallet.privateKey;
    const databaseWallet = new UserWallet(userId, address, privateKey);
    if (!await saveWallet(databaseWallet)) {
        console.error("User already has a wallet.");
        return;
    }
    const tx = await ChatChampionContract.airDrop(address);
    await tx.wait();
    
    const transactionReceiptURL = `${process.env.TX_EXPLORER}${tx.hash}`;
    return {
        wallet: databaseWallet,
        transactionReceiptUrl: transactionReceiptURL // Send this to the user as a message.
    };
  }

  async function reward(chatResult: ChatResult): Promise<string> {
    const tx = await ChatChampionContract.rewardUsers(
        chatResult.users[0].address,
        chatResult.users[1].address,
        chatResult.users[2].address,
        chatResult.users[0].score,
        chatResult.users[1].score,
        chatResult.users[2].score);
    await tx.wait();

    const receiptUrl = process.env.TX_EXPLORER + tx.hash.toString();

    return receiptUrl;
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
  