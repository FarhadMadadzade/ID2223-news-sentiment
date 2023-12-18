import pandas as pd
from datasets import load_dataset
from transformers import GPT2TokenizerFast
import torch
import hopsworks
from transformers import pipeline
from sklearn.model_selection import train_test_split
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


def get_article(card, from_date):
    """Extract article information from the raw html"""
    headline = card.find("h4", "s-title").text
    posted = card.find("span", "s-time").text.replace("·", "").strip()
    text = card.find("p", "s-desc").text.strip()
    a_element = card.find("a", "thmb")
    if a_element:
        headline = a_element.get("title")
        href = a_element.get("href")
    else:
        return None

    posted = parse_time(posted)
    if posted < from_date:
        return None

    article = {
        "headline": headline,
        "posted": posted,
        "text": text.replace("...", ""),
        "href": href,
    }
    return article


def get_news_headlines(search_companies, from_date=None):
    """Run the main program"""
    if not isinstance(search_companies, list):
        search_companies = [search_companies]

    company_articles = {}
    for search in search_companies:
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
                article = get_article(card, from_date)
                if article:
                    link = article["href"]
                    if not link in links:
                        links.add(link)
                        del article["href"]
                        articles.append(article)

            # find the next page
            try:
                url = soup.find("a", "next").get("href")
                sleep(1)
            except AttributeError:
                break

        print("Total articles:", len(articles))
        company_articles[search] = articles
    return company_articles


def get_int_label(label: str):
    if label == "negative":
        return 0
    if label == "positive":
        return 1
    if label == "neutral":
        return 2


def get_labels(companies: list = ["tesla"], num_days_back: int = 1):
    """Get the labels for the headlines"""

    pipe = pipeline(
        "text-classification",
        model="mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis",
    )

    from_date = datetime.now() - timedelta(days=num_days_back)

    companies = get_news_headlines(search_companies=companies, from_date=from_date)

    for _, articles in companies.items():
        for article in articles:
            if article["text"][-1] != "?":
                space = ". "
            else:
                space = " "
            article["text"] = article["headline"] + space + article["text"]
            article["label"] = get_int_label(pipe(article["text"])[0]["label"])
            del article["headline"]
            del article["posted"]


get_labels()
