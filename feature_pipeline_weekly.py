import pandas as pd
import hopsworks
from sklearn.model_selection import train_test_split
from yahoo_finance_news_scraper import get_embedded_features


def get_new_features():
    companies = ["AAPL", "AMZN", "GOOGL", "MSFT", "TSLA"]
    embedded_features = get_embedded_features(companies, num_days_back=7)

    return embedded_features


def update_feature_store():
    hopsworks_project = hopsworks.login()
    fs = hopsworks_project.get_feature_store()

    embedded_features = get_new_features()

    df = pd.DataFrame(embedded_features).rename(columns={"text": "embeddings"})
    value_counts = df["label"].value_counts()
    min_value_count = value_counts.min()

    df = df.sample(frac=1).reset_index(drop=True)
    df = (
        df.groupby("label")
        .apply(lambda x: x.sample(min_value_count))
        .reset_index(drop=True)
    )

    X_train, X_test, y_train, y_test = train_test_split(
        df["text"], df["label"], test_size=0.2, stratify=df["label"]
    )

    train_dataset_df = pd.concat([X_train, y_train], axis=1)
    test_dataset_df = pd.concat([X_test, y_test], axis=1)

    fg_train = fs.get_or_create_feature_group(
        name="news_sentiment_traindata", version=1, online_enabled=True
    )
    fg_train.insert(train_dataset_df)

    fg_test = fs.get_or_create_feature_group(
        name="news_sentiment_testdata", version=1, online_enabled=True
    )
    fg_test.insert(test_dataset_df)


if __name__ == "__main__":
    update_feature_store()
