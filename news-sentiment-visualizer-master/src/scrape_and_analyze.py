from transformers import GPT2TokenizerFast, pipeline
from time import sleep
from bs4 import BeautifulSoup
import requests
from datetime import datetime, timedelta
import sys


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


def get_news_headlines(search_companies, from_date, max_articles_per_search):
    """
    Get the news headlines for the companies in the search_companies list
    from the from_date until today's date. The maximum number of articles
    returned per company is max_articles_per_search.

    """
    headers = {
        "accept": "*/*",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-US,en;q=0.9",
        "referer": "https://www.google.com",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36 Edg/85.0.564.44",
    }

    if not isinstance(search_companies, list):
        search_companies = [search_companies]

    company_articles = {}
    for search in search_companies:
        print(f"Collecting articles for {search}")
        template = "https://news.search.yahoo.com/search?p={}"
        url = template.format(search)
        articles = []
        links = set()
        counter = 0

        while True:
            response = requests.get(url, headers=headers)
            soup = BeautifulSoup(response.text, "html.parser")
            cards = soup.find_all("div", "NewsArticle")

            # extract articles from page
            for card in cards:
                article = get_article(card, from_date)
                if article:
                    link = article["href"]
                    if not link in links and counter < max_articles_per_search:
                        links.add(link)
                        del article["href"]
                        articles.append(article)
                        counter += 1

            # find the next page
            try:
                url = soup.find("a", "next").get("href")
                sleep(1)
            except AttributeError:
                break

        print(f"Total articles for {search}: {len(articles)}")
        company_articles[search] = articles
    return company_articles




if __name__ == "__main__":
    search_key = sys.argv[1]
    from_date = datetime.now() - timedelta(
        days=7
    )  # Assuming we want articles from the past week
    max_articles_per_search = 10  # Maximum number of articles to analyze per search

    # Get the news headlines
    headlines = get_news_headlines([search_key], from_date, max_articles_per_search)

