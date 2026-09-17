import type { Assessment } from "../types/assessment";

export const mockAssessment: Assessment = {
  id: 1,
  title: "Supply Chain Specialist Assessment",
  description:
    "This assessment evaluates your knowledge of supply chain management, inventory control, procurement, logistics, and demand planning.",
  config: {
    timePerQuestion: 60,
    maxViolations: 3,
    requireFullscreen: true,
    preventCopy: true,
    detectTabSwitch: true,
  },
  questions: [
    {
      id: 1,
      order: 1,
      question:
        "What is the primary purpose of demand forecasting in supply chain management?",
      options: [
        {
          id: "A",
          text: "To predict future customer demand",
        },
        {
          id: "B",
          text: "To eliminate the need for inventory",
        },
        {
          id: "C",
          text: "To increase product prices",
        },
        {
          id: "D",
          text: "To reduce the number of employees",
        },
      ],
    },
    {
      id: 2,
      order: 2,
      question:
        "Which inventory method focuses on ordering stock when inventory reaches a predefined level?",
      options: [
        {
          id: "A",
          text: "Just-in-time scheduling",
        },
        {
          id: "B",
          text: "Reorder point system",
        },
        {
          id: "C",
          text: "ABC analysis",
        },
        {
          id: "D",
          text: "Cycle counting",
        },
      ],
    },
    {
      id: 3,
      order: 3,
      question:
        "What is the main objective of safety stock?",
      options: [
        {
          id: "A",
          text: "Increase warehouse costs",
        },
        {
          id: "B",
          text: "Reduce supplier relationships",
        },
        {
          id: "C",
          text: "Protect against demand and supply uncertainty",
        },
        {
          id: "D",
          text: "Eliminate inventory counting",
        },
      ],
    },
    {
      id: 4,
      order: 4,
      question:
        "Which KPI measures how quickly a company sells and replaces its inventory?",
      options: [
        {
          id: "A",
          text: "Inventory turnover",
        },
        {
          id: "B",
          text: "Employee utilization",
        },
        {
          id: "C",
          text: "Order accuracy",
        },
        {
          id: "D",
          text: "Supplier lead time",
        },
      ],
    },
    {
      id: 5,
      order: 5,
      question:
        "What does supplier lead time represent?",
      options: [
        {
          id: "A",
          text: "The time required to inspect inventory",
        },
        {
          id: "B",
          text: "The time between placing an order and receiving it",
        },
        {
          id: "C",
          text: "The time required to train a supplier",
        },
        {
          id: "D",
          text: "The time needed to sell all inventory",
        },
      ],
    },
    {
      id: 6,
      order: 6,
      question:
        "Which approach generally helps reduce excess inventory while maintaining service levels?",
      options: [
        {
          id: "A",
          text: "Improving demand forecasting",
        },
        {
          id: "B",
          text: "Ordering maximum quantities at all times",
        },
        {
          id: "C",
          text: "Ignoring historical demand",
        },
        {
          id: "D",
          text: "Removing inventory monitoring",
        },
      ],
    },
    {
      id: 7,
      order: 7,
      question:
        "What is the primary purpose of ABC inventory analysis?",
      options: [
        {
          id: "A",
          text: "Classifying inventory based on importance or value",
        },
        {
          id: "B",
          text: "Determining employee salaries",
        },
        {
          id: "C",
          text: "Selecting transportation routes",
        },
        {
          id: "D",
          text: "Measuring warehouse temperature",
        },
      ],
    },
    {
      id: 8,
      order: 8,
      question:
        "Which factor has a direct impact on the amount of safety stock required?",
      options: [
        {
          id: "A",
          text: "Demand and supply variability",
        },
        {
          id: "B",
          text: "Office furniture",
        },
        {
          id: "C",
          text: "Employee vacation schedules",
        },
        {
          id: "D",
          text: "Company logo design",
        },
      ],
    },
  ],
};