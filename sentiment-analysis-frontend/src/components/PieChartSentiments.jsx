import React, { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import ReactApexChart from "react-apexcharts";

const SentimentPieChart = ({ data }) => {
    const [percentagesArray, setPercentagesArray] = useState([]);

    // Calculate sentiment ratios
    const options = {
        labels: ['Positive', 'Negative', 'Neutral'],
        colors: ['#00E396', '#F44336', '#BFB5B5'],
        chart: {
            width: "10em",
        },
        states: {
            hover: {
                filter: {
                    type: "none",
                },
            },
        },
        legend: {
            position: "bottom",
            show: true,
        },
        dataLabels: {
            enabled: false
        },
        hover: { mode: null },
        plotOptions: {
            donut: {
                expandOnClick: false,
                donut: {
                    labels: {
                        show: false
                    }
                }
            }
        },
        fill: {
            colors: ['#00E396', '#F44336', '#BFB5B5']
        },
        tooltip: {
            enabled: true,
            theme: "dark"
        }
    };


    useEffect(() => {
        const sentimentsCounts = data.reduce((acc, item) => {
            acc[item.sentiment] = (acc[item.sentiment] || 0) + 1;
            return acc;
        }, {});

        // check that all sentiments are represented
        const sentiments = Object.keys(sentimentsCounts);
        if (sentiments.length < 3) {
            const missingSentiments = ['Positive', 'Negative', 'Neutral'].filter((item) => !sentiments.includes(item));
            missingSentiments.forEach((item) => sentimentsCounts[item] = 0);
        }

        const percentages = Object.keys(sentimentsCounts).reduce((acc, item) => {
            acc[item] = Math.round((sentimentsCounts[item] / data.length * 100) * 10) / 10
            return acc;
        }, {});

        setPercentagesArray(Object.keys(percentages).map((key) => percentages[key]))
    }, [data])


    return (
        <Box>
            <ReactApexChart
                options={options}
                series={percentagesArray}
                type="pie"
                width="100%"
                height="100%"
            />
        </Box>
    );
};

export default SentimentPieChart;