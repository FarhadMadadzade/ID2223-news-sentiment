import fetch from "node-fetch";
import cheerio from 'cheerio';

const parseTime = (posted) => {
    const [value, unit] = posted.split(" ");
    const date = new Date();
    if (unit.includes("minute")) {
        date.setMinutes(date.getMinutes() - parseInt(value));
    } else if (unit.includes("hour")) {
        date.setHours(date.getHours() - parseInt(value));
    } else if (unit.includes("day")) {
        date.setDate(date.getDate() - parseInt(value));
    } else if (unit.includes("week")) {
        date.setDate(date.getDate() - 7 * parseInt(value));
    } else if (unit.includes("month")) {
        date.setMonth(date.getMonth() - parseInt(value));
    } else if (unit.includes("year")) {
        date.setFullYear(date.getFullYear() - parseInt(value));
    }
    else {
        return null;
    }
    return date;
};


const getArticle = ($, card, fromDate) => {
    const headline = $(card).find("h4.s-title").text();
    const posted = $(card).find("span.s-time").text().replace("·", "").trim();
    const text = $(card).find("p.s-desc").text().trim();
    const href = $(card).find("a.thmb").attr('href');

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


export async function getNewsHeadlines(search, maxArticlesPerSearch) {
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
    search = search.replace(" ", "+");

    let url = `https://news.search.yahoo.com/search?p=${search}`;
    let articles = [];
    let uniqueArticles = new Set();
    let counter = 0;

    while (true) {
        const response = await fetch(url, { headers });
        const text = await response.text();
        const $ = cheerio.load(text);
        const cards = $("div.NewsArticle");

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const article = getArticle($, card, fromDate);
            if (article) {
                const articleSet = `${article.headline}${article.posted}`;
                if (!uniqueArticles.has(articleSet) && counter < maxArticlesPerSearch) {
                    uniqueArticles.add(articleSet);
                    articles.push(article);
                    counter++;
                }
            }
        }

        const nextUrl = $("a.next").attr("href");
        if (!nextUrl) {
            break;
        }
        url = nextUrl;
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.info(`Total articles for ${search}: ${articles.length}`);
    return articles;
}
