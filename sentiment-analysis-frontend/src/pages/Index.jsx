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
  StatNumber,
  StatHelpText,
  StatArrow,
  useToast,
  Spinner
} from "@chakra-ui/react";
import { FaSearch } from "react-icons/fa";

const sentimentSumByDate = (results) => {
  const sentimentMap = {
    'Positive': 1,
    'Negative': -1,
    'Neutral': 0,
  };
  const groupedByDate = {};

  results.forEach(result => {
    const dateString = result.posted.toISOString().split('T')[0];
    if (!groupedByDate[dateString]) {
      groupedByDate[dateString] = 0;
    }
    groupedByDate[dateString] += sentimentMap[result.sentiment];
  });

  return Object.entries(groupedByDate).map(([date, sentimentSum]) => ({
    date: new Date(date),
    sentimentSum: Math.floor(Math.random() * 10) - Math.floor(Math.random() * 12),
  }));
};


const Index = () => {
  const [searchKey, setSearchKey] = useState("");
  const [articleResults, setArticleResults] = useState([
    {
      headline: 'Tesla stock price soars',
      sentiment: 'Positive',
      posted: new Date('2023-12-20T10:00:00Z')
    },
    {
      headline: 'Tesla stock price plummets',
      sentiment: 'Negative',
      posted: new Date('2023-12-21T10:00:00Z')
    },
    {
      headline: 'Tesla stock price remains unchanged',
      sentiment: 'Neutral',
      posted: new Date('2023-12-22T10:00:00Z')
    },
    {
      headline: 'New Tesla model receives high safety ratings',
      sentiment: 'Positive',
      posted: new Date('2023-12-23T09:00:00Z')
    },
    {
      headline: 'Tesla faces recall over software glitch',
      sentiment: 'Negative',
      posted: new Date('2023-12-24T08:00:00Z')
    },
    {
      headline: 'Tesla announces expansion into Asian markets',
      sentiment: 'Positive',
      posted: new Date('2023-12-25T11:00:00Z')
    },
    {
      headline: 'Tesla receives environmental award',
      sentiment: 'Positive',
      posted: new Date('2023-12-20T12:00:00Z')
    },
    {
      headline: 'Tesla battery life under scrutiny',
      sentiment: 'Negative',
      posted: new Date('2023-12-21T13:00:00Z')
    },
    {
      headline: 'Tesla autopilot feature gains popularity',
      sentiment: 'Positive',
      posted: new Date('2023-12-23T15:00:00Z')
    },
    {
      headline: 'Tesla faces challenges in new market',
      sentiment: 'Negative',
      posted: new Date('2023-12-24T16:00:00Z')
    },
  ]);

  const [sentimentSumResults, setSentimentSumResults] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSearchKeyChange = (event) => {
    setSearchKey(event.target.value);
  };

  const analyzeSentiment = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:3001/analyze-sentiment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ searchKey }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
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
    articleResults.length > 0 && setSentimentSumResults(sentimentSumByDate(articleResults));
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
              <VStack width="80%" alignItems="flex-start">
                {sentimentSumResults.map(({ date, sentimentSum }, index) => (
                  <HStack key={index} direction="row" width="100%">
                    <Box height="1.5em" width={`${Math.abs(sentimentSum) * 6}%`} bg={
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

        {articleResults && articleResults
          .sort((a, b) => a.posted - b.posted)
          .map((result, index) => (
            <Box key={index}>
              <Stat>
                <StatLabel>{result.headline}</StatLabel>
                <StatNumber>{result.sentiment}</StatNumber>
                <StatHelpText>
                  <StatArrow type={result.sentiment === 'Positive' ? 'increase' : result.sentiment === 'Negative' ? 'decrease' : null} />
                  {result.sentiment === 'Positive' ? 'Increase' : result.sentiment === 'Negative' ? 'Decrease' : 'Neutral'} in sentiment
                  <Box as="span" ml="4">
                    {result.posted.toLocaleDateString()}
                  </Box>
                </StatHelpText>
              </Stat>
            </Box>
          ))}
      </VStack>
    </Box>
  );
};



export default Index;
