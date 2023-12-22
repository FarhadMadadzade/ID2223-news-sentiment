from datasets import Dataset, DatasetDict
from transformers import (
    GPT2TokenizerFast,
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
)
import torch
import hopsworks
import numpy as np
import evaluate


def get_decoding(dataset, embedding_object):
    decodings = []
    for data in dataset["embeddings"]:
        decoded_text = embedding_object.decode(data)
        decodings.append(decoded_text)

    dataset_decoded = dataset.copy()
    dataset_decoded["text"] = decodings
    dataset_decoded = dataset_decoded.drop(columns=["embeddings"])
    return dataset_decoded


def get_tokenizer():
    tokenizer = GPT2TokenizerFast.from_pretrained("Xenova/text-embedding-ada-002")
    return tokenizer


def tokenize_function(examples, bert_tokenizer):
    return bert_tokenizer(examples["text"], padding="max_length", truncation=True)


def get_compute_metrics(metric):
    return def compute_metrics(eval_pred): 
        logits, labels = eval_pred
        predictions = np.argmax(logits, axis=-1)
        return metric.compute(predictions=predictions, references=labels)


def train():
    hopsworks_project = hopsworks.login()
    fs = hopsworks_project.get_feature_store()

    training_fg = fs.get_or_create_feature_group("news_sentiment_traindata", version=1)
    test_fg = fs.get_or_create_feature_group("news_sentiment_testdata", version=1)

    training_features = training_fg.read()
    testing_features = test_fg.read()

    embedding_tokenizer = get_tokenizer()
    training_data = get_decoding(training_features, embedding_tokenizer)
    testing_data = get_decoding(testing_features, embedding_tokenizer)

    bert_tokenizer = AutoTokenizer.from_pretrained("bert-base-cased")
    # Convert pandas dataframes to Hugging Face datasets
    train_dataset = Dataset.from_pandas(training_data)
    test_dataset = Dataset.from_pandas(testing_data)

    # Combine datasets into a DatasetDict
    datasets = DatasetDict({"train": train_dataset, "test": test_dataset})
    tokenized_datasets = datasets.map(tokenize_function, batched=True)

    model = AutoModelForSequenceClassification.from_pretrained(
        "bert-base-cased", num_labels=5
    )

    metric = evaluate.load("accuracy")
    compute_metrics = get_compute_metrics(metric)
    
    training_args = TrainingArguments(
        output_dir="test_trainer", evaluation_strategy="epoch"
    )  # TODO add more args based on best hyperparameters, also upload to huggingface

    tokenized_train_dataset = tokenized_datasets["train"].shuffle(seed=55)
    tokenized_test_dataset = tokenized_datasets["test"].shuffle(seed=55)
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_train_dataset,
        eval_dataset=tokenized_test_dataset,
        compute_metrics=compute_metrics,
    )

    trainer.train()


if __name__ == "__main__":
    train()
