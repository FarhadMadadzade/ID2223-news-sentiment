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
import pandas as pd


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
    def compute_metrics(eval_pred): 
        logits, labels = eval_pred
        predictions = np.argmax(logits, axis=-1)
        return metric.compute(predictions=predictions, references=labels)
    return compute_metrics


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

    id2label = {0: "Negative", 1: "Positive", 2: "Neutral"}
    label2id = {val: key for key, val in id2label.items()}

    def model_init():
        return AutoModelForSequenceClassification.from_pretrained('bert-base-cased', return_dict=True, num_labels=3,
                                                             id2label=id2label, label2id=label2id)

    metric = evaluate.load("accuracy")
    compute_metrics = get_compute_metrics(metric)
    
    training_args = TrainingArguments(
        output_dir="bert_sentiment_trainer", 
        evaluation_strategy="steps",
        num_train_epochs=8,
        save_total_limit=3,
        seed=42,
        lr_scheduler_type='constant_with_warmup',
        warmup_steps=50,
        max_steps=3000,
        save_strategy="steps",
        save_steps=250,
        fp16=False,
        eval_steps=250,
        logging_steps=25,
        report_to=["tensorboard"],
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        greater_is_better=True,
    ) 

    tokenized_train_dataset = tokenized_datasets["train"].shuffle(seed=55)
    tokenized_test_dataset = tokenized_datasets["test"].shuffle(seed=55)
    
    trainer = Trainer(
        args=training_args,
        train_dataset=tokenized_train_dataset,
        eval_dataset=tokenized_test_dataset,
        compute_metrics=compute_metrics,
        model_init=model_init,
        tokenizer=embedding_tokenizer,
    )

    trainer.train()

    import json
    from transformers import pipeline

    pipe = pipeline("text-classification", model="Artanis1551/bert_sentiment_trainer")
    results = pipe(list(testing_data["text"]))

    json_dict = json.loads(str(results).replace('\'', '\"'))
    predictions = pd.DataFrame.from_dict(json_dict)

    predicted_labels = [pipe.model.config.label2id[x] for x in predictions['label']] 

    old_accuracy = metric.compute(predictions=predicted_labels, references=test_dataset['label'])
    print("old model metric = " + str(old_accuracy))

    new_accuracy = trainer.predict(tokenized_test_dataset).metrics["test_accuracy"]
    print("new model metric = " + str(new_accuracy))

    if new_accuracy > old_accuracy:
        trainer.push_to_hub()

if __name__ == "__main__":
    train()
