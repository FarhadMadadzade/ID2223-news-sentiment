import express from "express";
import { getNewsHeadlines } from "./yahoo-scraper.js";
import { pipeline } from "@xenova/transformers";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
const port = 3001; // You can choose any port that suits your setup

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

let pipe = await pipeline("text-classification", "Xenova/distilroberta-finetuned-financial-news-sentiment-analysis")

app.post("/analyze-sentiment", async (req, res) => {
    const { searchKey } = req.body;
    if (!searchKey) {
        return res.status(400).json({ error: "Search key is required" });
    }

    try {
        const headlines = await getNewsHeadlines(searchKey);

        for (let headline of headlines) {
            let sentiment = await pipe(headline.text)
            headline.sentiment = sentiment[0].label
        }
        return res.json({ result: headlines });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Something went wrong" });
    }
});

app.listen(port, () => {
    console.info(`Server is running on port ${port}`);
});