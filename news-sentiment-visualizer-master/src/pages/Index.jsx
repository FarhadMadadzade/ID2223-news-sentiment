import React, { useState } from "react";
import { Box, Button, FormControl, FormLabel, Input, Heading, Text, VStack, HStack, Stat, StatLabel, StatNumber, StatHelpText, StatArrow, useToast } from "@chakra-ui/react";
import { FaSearch } from "react-icons/fa";
import { Spinner } from '@chakra-ui/react'

const Index = () => {
  const [searchKey, setSearchKey] = useState("");
  const [sentimentResults, setSentimentResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSearchKeyChange = (event) => {
    setSearchKey(event.target.value);
  };

  const analyzeSentiment = async () => {
    // Make an API request to your backend here
    setIsLoading(true);
    try {
      const response = await fetch("analyze-sentiment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ searchKey }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let results;
      try {
        results = await response.json();
      } catch (error) {
        toast({
          title: "Analysis failed.",
          description: "The response from the server was not in JSON format.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        console.error("Failed to parse JSON:", error);
        return; // Return early if the response is not in JSON format
      }

      if (results) {
        setSentimentResults(results);
        toast({
          title: "Analysis complete.",
          description: "Sentiment analysis has been successfully completed.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
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

  return (
    <Box p={5}>
      <VStack spacing={4} align="stretch">
        <Heading as="h1">Sentiment Analysis Dashboard</Heading>

        <FormControl id="searchKey">
          <FormLabel>Search Key</FormLabel>
          <HStack>
            <Input type="text" placeholder="Enter a search key e.g. TSLA" value={searchKey} onChange={handleSearchKeyChange} />
            {isLoading ? <Spinner /> : null}
            <Button leftIcon={<FaSearch />} colorScheme="teal" onClick={analyzeSentiment} isDisabled={!searchKey}>
              Analyze
            </Button>
          </HStack>
        </FormControl>

        {sentimentResults && (
          <Box>
            <Heading as="h2" size="lg">
              Sentiment Results
            </Heading>
            <VStack>
              <Stat>
                <StatLabel>Positive</StatLabel>
                <StatNumber>{`${(sentimentResults.positive * 100).toFixed(1)}%`}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  Increase in positivity
                </StatHelpText>
              </Stat>

              <Stat>
                <StatLabel>Neutral</StatLabel>
                <StatNumber>{`${(sentimentResults.neutral * 100).toFixed(1)}%`}</StatNumber>
              </Stat>

              <Stat>
                <StatLabel>Negative</StatLabel>
                <StatNumber>{`${(sentimentResults.negative * 100).toFixed(1)}%`}</StatNumber>
                <StatHelpText>
                  <StatArrow type="decrease" />
                  Decrease in negativity
                </StatHelpText>
              </Stat>
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default Index;
