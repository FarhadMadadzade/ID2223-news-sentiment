import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Heading,
  VStack,
  HStack,
  Stat,
  StatLabel,
  StatHelpText,
  StatArrow,
  useToast,
  Spinner,
  Icon,
  Grid
} from "@chakra-ui/react";
import { FaSearch, FaCircle } from "react-icons/fa";
import SentimentPieChart from "../components/PieChartSentiments";
import { pipeline } from '@xenova/transformers';

class SentimentPipeline {
  static task = 'text-classification';
  static model = 'Xenova/distilroberta-finetuned-financial-news-sentiment-analysis';
  static instance = null;

  static async getInstance() {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model);
    }
    return this.instance;
  }
}
const Index = () => {
  const [searchKey, setSearchKey] = useState("");
  const [articleResults, setArticleResults] = useState([]);
  const [sentimentSumResults, setSentimentSumResults] = useState([]);
  const [todaysArticles, setTodaysArticles] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const sentimentSumByDate = () => {
    const sentimentMap = {
      'positive': 1,
      'negative': -1,
      'neutral': 0,
    };
    const groupedByDate = {};

    const today = new Date();

    articleResults.forEach((article) => {
      const dateString = article.posted.toISOString().split('T')[0];
      if (!groupedByDate[dateString]) {
        groupedByDate[dateString] = 0;
      }
      groupedByDate[dateString] += sentimentMap[article.sentiment];

      if (article.posted.toISOString().split('T')[0] === today.toISOString().split('T')[0]) {
        setTodaysArticles((prev) => [...prev, article]);
      }
    });


    const sentimentSumResult = Object.entries(groupedByDate).map(([date, sentimentSum]) => ({
      date: new Date(date),
      sentimentSum: sentimentSum,
    }));
    setSentimentSumResults(sentimentSumResult);
  };

  const handleSearchKeyChange = (event) => {
    setSearchKey(event.target.value);
  };

  const baseUrl = "https://speech-recognition-386209.ew.r.appspot.com"
  const analyzeSentiment = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${baseUrl}/analyze-sentiment?${new URLSearchParams({
        searchKey: searchKey
      })}`, {
        method: "GET",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let responseJson = await response.json();

      let sentimentPipe = await SentimentPipeline.getInstance()
      responseJson.result.forEach(async (headline) => {
        let sentiment = await sentimentPipe(headline.text)
        headline.sentiment = sentiment[0].label
        headline.posted = new Date(headline.posted);
      })

      setArticleResults(responseJson.result);
      setSentimentSumResults([])
      setTodaysArticles([])

      toast({
        title: "Analysis complete.",
        description: "Sentiment analysis has been successfully completed.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Analysis failed.",
        description: `There was a problem with sentiment analysis: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (articleResults.length > 0) {
      sentimentSumByDate();
    }
  }, [articleResults])



  return (
    <Box p={5}>
      <VStack spacing={4} align="stretch">
        <Heading as="h1">Sentiment Analysis Dashboard</Heading>
        <FormControl id="searchKey">
          <FormLabel>Search Key</FormLabel>
          <HStack>
            <Input type="text" placeholder="Enter a search key e.g. TSLA" value={searchKey} onChange={handleSearchKeyChange} />
            {isLoading ? <Spinner /> : null}
            <Button leftIcon={<FaSearch />} colorScheme="teal" onClick={analyzeSentiment} isDisabled={!searchKey || isLoading}>
              Analyze
            </Button>
          </HStack>
        </FormControl>

        {/* Add a pie chart representation */}
        {todaysArticles && articleResults.length > 0 && (
          <Box borderWidth="1px" borderRadius="lg" overflow="hidden" p={4}>
            <Heading as="h3" size="md" mb={4} textAlign="center">
              Today's Sentiment Breakdown (%)
            </Heading>
            {
              todaysArticles.length > 0 ? (
                <SentimentPieChart data={todaysArticles} />
              ) :
                <Box textAlign="center">
                  No articles found for today
                </Box>
            }
          </Box>
        )}

        {/* Add a summarized bar chart representation */}
        {sentimentSumResults && sentimentSumResults.length > 0 && (
          <Box borderWidth="1px" borderRadius="lg" overflow="hidden" p={4}>
            <Heading as="h3" size="md" mb={4}>
              Sentiment Summary Over Time
            </Heading>
            <HStack width="full">
              <VStack>
                {sentimentSumResults.map(({ date, sentimentSum }, index) => (
                  <Box key={index} width="100%" textAlign="center">
                    {date.toLocaleDateString()}
                  </Box>
                ))}
              </VStack>
              <VStack width="100%" alignItems="flex-start">
                {sentimentSumResults.map(({ date, sentimentSum }, index) => (
                  <HStack key={index} direction="row" width="100%">
                    <Box height="1.5em" width={`${Math.abs(sentimentSum) * 5}%`} bg={
                      sentimentSum > 0 ? 'green.300'
                        : sentimentSum < 0 ? 'red.300'
                          : 'gray.300'
                    } />
                    <Box textAlign="center">
                      {sentimentSum}
                    </Box>
                  </HStack>
                ))}
              </VStack>
            </HStack>
          </Box>
        )}

        <Grid templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(2, 1fr)" }} gap={6}>
          {articleResults && articleResults
            .sort((a, b) => b.posted - a.posted)
            .map((result, index) => (
              <Box key={index} borderWidth="0.5px" borderRadius="lg" p={4}>
                <Stat>
                  <StatLabel fontSize="1em" marginBottom="0.2em">{result.headline}</StatLabel >
                  <StatHelpText>
                    <HStack>
                      {
                        result.sentiment !== "neutral" ? (
                          <StatArrow type={result.sentiment === 'positive' ? 'increase' : 'decrease'} />
                        ) :
                          <Icon as={FaCircle} color="#BFB5B5" marginRight="0.4em" />
                      }
                      <Box>
                        {result.sentiment === 'positive' ? 'Positive' : result.sentiment === 'negative' ? 'Negative' : 'Neutral'} in sentiment
                      </Box>
                      <Box ml="4">
                        {result.posted.toLocaleDateString()}
                      </Box>
                    </HStack>
                  </StatHelpText>
                </Stat>
              </Box>
            ))}
        </Grid>
      </VStack>
    </Box>
  );
};



export default Index;
