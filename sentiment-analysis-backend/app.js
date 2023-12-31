import express from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import { getNewsHeadlines } from './yahoo-scraper.js';
let app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(function (req, res, next) {

    res.setHeader("Access-Control-Allow-Origin", "https://news-sentiment-analyzer.web.app")

    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    next();
})


app.get("/analyze-sentiment", async (req, res) => {
    const { searchKey, maxArticlesPerSearch } = req.query;
    if (!searchKey) {
        return res.status(400).json({ error: "Search key is required" });
    }
    try {
        const headlines = await getNewsHeadlines(searchKey, maxArticlesPerSearch);
        return res.status(200).json({ result: headlines });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Something went wrong" });
    }
});

app.get('/', (req, res) => {
    res.send('Hello from App Engine!');
});

export default app;
