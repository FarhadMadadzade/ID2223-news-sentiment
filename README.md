# ID2223-news-sentiment
Project for ID2223

# Data description:
https://huggingface.co/datasets/financial_phrasebank
https://huggingface.co/datasets/zeroshot/twitter-financial-news-sentiment

# Base model description:
https://huggingface.co/bert-base-cased


# Project files and folders:

## sentiment_analysis_backend
All the files necessary for the API used by the app. This includes the javascript version of yahoo_finance_news_scraper. The backend is written using the conventions of NodeJs.

## sentiment_analysis_frontend
All the files necessary for the frontend and using the endpoint from the API as well as the inference API for the model on Huggingface. The frontend is written in React. 

## deploy_weekly_training.sh
This is a shell script used for running a script on modal for retraining the model weekly after new features have been collected.

## feature_pipeline_weekly.py
The pipeline script that collects new features weekly by using the yahoo_finance_news_scraper.py module. Once the new features are collected they are split into training and test sets and uploaded to the respective training and test feature groups on Hopsworks.

## feature_pipeline.ipynb
This is the notebook used to upload the initial features from the base dataset. The code is very similar to the weekly feature pipeline script, but does not collect features using the scraping script. It is also here that we created the train and test feature groups on Hopsworks.

## hyperparameter_search.ipynb
This is a notebook we used to make a hyperparameter search to find the optimal combination of hyperparameters for when we train the model.

## preprocessing_pipeline.ipynb
This notebook was used to preprocess the base data and collect them into csv files (for later use in feature_pipeline.ipynb) as well as figuring out and testing the text embedding tokenizer to see that it works as intended. 

## requirements.txt
The requirements.txt file contains the modules needed to run the python script.

## training_pipeline.py
This script is ran when running the shell script deploy_weekly_training.sh. It collects the training and test features form Hopsworks and runs the finetuning of the bert_base_cased model from Huggingface using the optimal hyperparameters found in the previously mentioned hyperparameter python notebook.

## training_pipeline_notebook.ipynb
This notebook is similar to the training_pipeline.py script but is in a python notebook format. In this notebook we fine-tuned and uploaded the first version of our model to huggingface. 

## yahoo_finance_news_scraper.py
This module contains the functions necessary to do the scraping on yahoo news to find the headlines that are related to a specific search term. 


# How to run the pipelines
## Run the backend locally
You vill need to install node (we used version 18). To run the backend locally on your computer you need to uncomment one line and comment out another. The file is on the filepath sentiment_analysis_backend\app.js. Uncomment line 15 and comment out line 14. This is needed so that the the requests from the frontend are allowed. Change the directory to the sentiment_analysis_backend folder, and run the command
```bash
npm install
npm run dev
```

## Run the frontend locally
You vill need to install node (we used version 18). You also have to create a file in the sentiment_analysis_frontend folder called credentials.json that contains the following:
```json
{
    "huggingface": "<your huggingface API key>"
}
```
To run the frontend locally on your computer you need to uncomment one line and comment out another. The file is on the filepath sentiment_analysis_frontend\src\pages\Index.jsx. Uncomment line 130 and comment out line 129. This is needed to be able to use the API you are running locally on your computer. Change the directory to the sentiment_analysis_frontend folder, and run the command
```bash
npm install
npm run dev
```

## Pipelines
All of the pipeline scripts/notebooks can be run by just running them. Make sure that you have the necessary python modules installed by running the command
```bash
pip install -r requirements.txt
``` 
