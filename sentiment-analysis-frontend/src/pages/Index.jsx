import React, { useEffect, useState } from "react";
import {
  Box,
  Flex,
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
  Icon,
  Grid,
  Tooltip,
  Tag,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from "@chakra-ui/react";
import { FaSearch, FaCircle, FaArrowRight } from "react-icons/fa";
import SentimentPieChart from "../components/PieChartSentiments";
import credentials from "../../credentials.json";

const CustomCard = React.forwardRef(({ children, ...rest }, ref) => (
  <Box p='1'>
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  </Box>
))

const Index = () => {
  const [searchKey, setSearchKey] = useState("");
  const [articleResults, setArticleResults] = useState([]);
  const [sentimentSumResults, setSentimentSumResults] = useState([]);
  const [todaysArticles, setTodaysArticles] = useState([]);
  const [maxArticlesPerSearch, setMaxArticlesPerSearch] = useState(undefined);

  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const sentimentSumByDate = () => {
    const sentimentMap = {
      'Positive': 1,
      'Negative': -1,
      'Neutral': 0,
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

  const handleMaxNumArticleChange = (val) => {
    if (val > 100) {
      val = 100;
    }
    setMaxArticlesPerSearch(Number(val));
  }

  const fetchSentiments = async (data) => {
    if (data.length === 0) {
      throw new Error("No data was found for the past week")
    }
    let body = {
      inputs: data,
      options: {
        wait_for_model: true
      }
    }
    const response = await fetch(
      "https://api-inference.huggingface.co/models/Artanis1551/bert_sentiment_trainer",
      {
        headers: { Authorization: `Bearer ${credentials.huggingface}` },
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    if (response.status === 503) {
      throw new Error(`The model is currently loading. Please try again in ${result.estimated_time || 20} seconds.`)
    }
    else if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    else if (response.status === 200) {
      const result = await response.json();
      return result
    }
  }

  function getLabelOfMaxScore(jsonList) {
    let maxScoreJson = jsonList.reduce((max, obj) => (max.score > obj.score ? max : obj), jsonList[0]);
    return maxScoreJson.label;
  }

  const analyzeSentiment = async () => {
    setIsLoading(true);
    try {
      const baseUrl = "https://speech-recognition-386209.ew.r.appspot.com"

      const response = await fetch(`${baseUrl}/analyze-sentiment?${new URLSearchParams({
        searchKey: searchKey,
        maxArticlesPerSearch: maxArticlesPerSearch
      })}`, {
        method: "GET",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let responseJson = await response.json();

      let results = responseJson.result
      let sentiments = await fetchSentiments(results.map((result) => result.headline))

      results.forEach((result, index) => {
        result.sentiment = getLabelOfMaxScore(sentiments[index])
        result.posted = new Date(result.posted)
      })

      setSentimentSumResults([])
      setTodaysArticles([])
      setArticleResults(results);

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
        <Heading as='h4' size='md'>This algorithm scrapes Yahoo news finance based on your search query. Enter a company name and press the <b>Analyze</b> button. Keep in mind that scraping can take a couple of minutes!</Heading>
        <FormControl id="searchKey">
          <HStack>
            <VStack width="100%">
              <FormLabel>Search Key</FormLabel>
              <VStack mb={3} width="30%">
                <Input type="text" placeholder="Enter a search key e.g. TSLA" value={searchKey} onChange={handleSearchKeyChange} />
              </VStack>
              <FormLabel>Enter a maximum number of articles to analyze</FormLabel>
              <VStack mb={3} width="30%">
                <NumberInput value={maxArticlesPerSearch} step={5} min={0} max={100} onChange={handleMaxNumArticleChange} width="100%">
                  <NumberInputField placeholder="Defaults to 50" title="Maximum input is 100" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Button isLoading={isLoading} leftIcon={<FaSearch />} colorScheme="teal" onClick={analyzeSentiment} isDisabled={!searchKey || isLoading} >
                  Analyze
                </Button>
              </VStack>
            </VStack>
          </HStack>
        </FormControl>

        {/* Add a pie chart representation */}
        {
          todaysArticles && articleResults.length > 0 && (
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
          )
        }

        {/* Add a summarized bar chart representation */}
        {
          sentimentSumResults && sentimentSumResults.length > 0 && (
            <Box borderWidth="1px" borderRadius="lg" overflow="hidden" p={4}>
              <HStack spacing={5}>
                <Heading as="h3" size="md" mb={4}>
                  Sentiment Score Summary of Found Articles
                </Heading>
                <Tooltip label='Here we sum the sentiment scores. A positive score is counted as +1, a negative as -1, and a neutral as 0'>
                  <Box width="10%" p={2}>
                    <CustomCard>Info</CustomCard>
                  </Box>
                </Tooltip>
              </HStack>

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
          )
        }

        <Grid templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(2, 1fr)" }} gap={6}>
          {articleResults && articleResults
            .sort((a, b) => b.posted - a.posted)
            .map((result, index) => (
              <Box key={index} borderWidth="0.5px" borderRadius="lg" p={4}>
                <Stat>
                  <StatLabel fontSize="1.2em" marginBottom="0.2em">{result.headline}</StatLabel >
                  <StatLabel fontSize="1em" fontWeight="0.1em" marginBottom="0.5em">{result.text}</StatLabel >
                  <StatHelpText >
                    <HStack>
                      {
                        result.sentiment !== "Neutral" ? (
                          <StatArrow type={result.sentiment === 'Positive' ? 'increase' : 'decrease'} />
                        ) :
                          <Icon as={FaCircle} color="#BFB5B5" marginRight="0.4em" />
                      }
                      <Box>
                        {result.sentiment === 'Positive' ? 'Positive' : result.sentiment === 'Negative' ? 'Negative' : 'Neutral'} in sentiment
                      </Box>
                      <Box ml="4">
                        {result.posted.toLocaleDateString()}
                      </Box>
                    </HStack>
                  </StatHelpText>
                </Stat>
                <Flex justifyContent="flex-end">
                  <a href={result.href} target="_blank" rel="noopener noreferrer">
                    <Button rightIcon={<FaArrowRight />}>
                      Read
                    </Button>
                  </a>

                </Flex>
              </Box>

            ))}
        </Grid>
      </VStack >
    </Box >
  );
};



export default Index;
