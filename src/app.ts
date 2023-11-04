import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import {setupWebhook} from "./client/web-hook";
import { connect } from "http2";
import { connectToMongo } from "./client/mongo-connnect";

dotenv.config();

const { PORT, TELEGRAM_TOKEN, SERVER_URL, MAINET_EXPLORER_URL } = process.env;

const app = express();
app.use(express.json());


app.get("/", (req: Request, res: Response) => {
    res.send("Welcome to the bot server!");
  });

app.listen(PORT, async () => {
    console.log(`Server running on port: ${PORT}`);
    try {
      await setupWebhook();
      await connectToMongo();
    } catch (error) {
      console.error("Webhook setup failed:", error.message);
    }
  });