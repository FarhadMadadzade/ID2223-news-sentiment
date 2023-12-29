import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const parseTime = (posted) => {
    const [value, unit] = posted.split(" ");
    const date = new Date();
    if (unit.includes("minute")) {
        date.setMinutes(date.getMinutes() - parseInt(value));
    } else if (unit.includes("hour")) {
        date.setHours(date.getHours() - parseInt(value));
    } else if (unit.includes("day")) {
        date.setDate(date.getDate() - parseInt(value));
    } else {
        return null;
    }
    return date;
};


const getArticle = (card, fromDate) => {
    const headline = card.querySelector("h4.s-title")?.textContent;
    const posted = card.querySelector("span.s-time")?.textContent.replace("·", "").trim();
    const text = card.querySelector("p.s-desc")?.textContent.trim();
    const aElement = card.querySelector("a.thmb");
    const href = aElement !== null ? aElement.href : "";

    const postedDate = parseTime(posted);
    if (postedDate < fromDate) {
        return null;
    }

    return {
        headline,
        posted: postedDate,
        text: text.replace("...", ""),
        href: href
    };
};


export async function getNewsHeadlines(search, maxArticlesPerSearch = 50) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);

    const headers = {
        'accept': '*/*',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-US,en;q=0.9',
        'referer': 'https://www.google.com',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36 Edg/85.0.564.44',
    };

    console.info(`Collecting articles for ${search}`);
    let url = `https://news.search.yahoo.com/search?p=${search}`;
    let articles = [];
    let uniqueArticles = new Set();
    let counter = 0;

    while (true) {
        const response = await fetch(url, { headers });
        const text = await response.text();
        const dom = new JSDOM(text);
        const cards = dom.window.document.querySelectorAll("div.NewsArticle");

        for (let card of cards) {
            const article = getArticle(card, fromDate);
            if (article) {
                const articleSet = [article.headline, article.posted]
                if (!uniqueArticles.has(articleSet) && counter < maxArticlesPerSearch) {
                    uniqueArticles.add(article.href);
                    articles.push(article);
                    counter++;
                }
            }
        }

        try {
            url = dom.window.document.querySelector("a.next").href;
            await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
            break;
        }
    }
    console.info(`Total articles for ${search}: ${articles.length}`);
    return articles;
}

