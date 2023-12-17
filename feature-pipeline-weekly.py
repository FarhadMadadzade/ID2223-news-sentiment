import re
import csv
from time import sleep
from bs4 import BeautifulSoup
import requests
from datetime import datetime, timedelta

headers = {
    "accept": "*/*",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "en-US,en;q=0.9",
    "referer": "https://www.google.com",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36 Edg/85.0.564.44",
}


def parse_time(posted):
    # Split the string into value and unit
    value, unit, _ = posted.split()

    # Convert the value to an integer
    value = int(value)

    # Calculate the datetime object based on the unit
    if "minute" in unit:
        time = datetime.now() - timedelta(minutes=value)
    elif "hour" in unit:
        time = datetime.now() - timedelta(hours=value)
    elif "day" in unit:
        time = datetime.now() - timedelta(days=value)
    else:
        return None

    return time


def get_article(card):
    """Extract article information from the raw html"""
    headline = card.find("h4", "s-title").text
    source = card.find("span", "s-source").text
    posted = card.find("span", "s-time").text.replace("·", "").strip()
    description = card.find("p", "s-desc").text.strip()

    article = {
        "headline": headline,
        "source": source,
        "posted": parse_time(posted),
        "description": description,
    }
    return article


def get_the_news(search):
    """Run the main program"""
    template = "https://news.search.yahoo.com/search?p={}"
    url = template.format(search)
    articles = []
    links = set()

    while True:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, "html.parser")
        cards = soup.find_all("div", "NewsArticle")

        # extract articles from page
        for card in cards:
            article = get_article(card)
            link = article[-1]
            if not link in links:
                links.add(link)
                articles.append(article)

        # find the next page
        try:
            url = soup.find("a", "next").get("href")
            sleep(1)
        except AttributeError:
            break

    # save article data
    with open("results.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Headline", "Source", "Posted", "Description", "Link"])
        writer.writerows(articles)

    return articles


news = get_the_news("Tesla")
print(news)
