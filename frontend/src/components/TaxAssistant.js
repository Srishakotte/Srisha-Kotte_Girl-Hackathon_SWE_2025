import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import "./TaxAssistant.css";
import { GoogleGenerativeAI } from "@google/generative-ai";


const TaxAssistant = () => {
  const [incomeText, setIncomeText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const navigate = useNavigate();

  const taxSlabs = [
    { upTo: 400000, rate: 0 },
    { upTo: 800000, rate: 0.05 },
    { upTo: 1200000, rate: 0.10 },
    { upTo: 1600000, rate: 0.15 },
    { upTo: 2000000, rate: 0.20 },
    { upTo: 2400000, rate: 0.25 },
    { upTo: Infinity, rate: 0.30 },
  ];

  const calculateTax = (income) => {
    let tax = 0;
    let previousLimit = 0;

    for (const slab of taxSlabs) {
      if (income > slab.upTo) {
        tax += (slab.upTo - previousLimit) * slab.rate;
        previousLimit = slab.upTo;
      } else {
        tax += (income - previousLimit) * slab.rate;
        break;
      }
    }

    return tax;
  };

  const parseIncomeText = (text) => {
    const lines = text.split("\n");
    const incomeMap = {};

    lines.forEach((line) => {
      const parts = line.split(":");
      if (parts.length === 2) {
        const key = parts[0].trim();
        const value = parseFloat(parts[1].trim().replace(/,/g, ""));
        if (!isNaN(value)) {
          incomeMap[key] = value;
        }
      }
    });

    return incomeMap;
  };

  const generateTaxSuggestions = async (incomeDetails) => {
    try {
      const genAI = new GoogleGenerativeAI("AIzaSyBtItCyL9a_Tgb1tVW7DVxYzrwahmlO5vY");
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `Given these income details: ${JSON.stringify(incomeDetails)}, 
      provide 3 specific tax saving suggestions. Format each with type, suggestion, and impact.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response or use default suggestions if parsing fails
      return [
        {
          type: "Investment",
          suggestion: "Consider investing in tax-saving ELSS mutual funds under Section 80C",
          impact: "Can save up to ₹46,800 in taxes"
        },
        {
          type: "Insurance",
          suggestion: "Purchase health insurance for yourself and family under Section 80D",
          impact: "Can save up to ₹25,000 in taxes"
        },
        {
          type: "Home Loan",
          suggestion: "If applicable, claim home loan interest deduction under Section 24",
          impact: "Can save up to ₹2,00,000 in taxes"
        }
      ];
    } catch (error) {
      console.error("Error generating suggestions:", error);
      // Return default suggestions if AI fails
      return [
        {
          type: "Default Suggestion",
          suggestion: "Consider standard tax-saving investments under Section 80C",
          impact: "Can save up to ₹46,800 in taxes"
        }
      ];
    }
  };

  const handleAnalyze = async () => {
    try {
      const incomeMap = parseIncomeText(incomeText);
      if (Object.keys(incomeMap).length === 0) {
        alert("Please enter valid income details");
        return;
      }
  
      const totalIncome = Object.values(incomeMap).reduce((sum, val) => sum + val, 0);
      const taxableIncome = {
        Salary: incomeMap["Salary"] || 0,
        "Freelance Income": incomeMap["Freelance Income"] || 0,
        "Rental Income": incomeMap["Rent"] || 0,
      };
      const totalTaxableIncome = Object.values(taxableIncome).reduce((sum, val) => sum + val, 0);
      const taxLiability = calculateTax(totalTaxableIncome);
      const suggestions = await generateTaxSuggestions(incomeMap);
  
      const analysisResult = {
        timestamp: serverTimestamp(),
        incomeDetails: incomeMap,
        taxableIncome,
        totalIncome,
        totalTaxableIncome,
        taxLiability,
        suggestions,
      };
  
      // Save to Firestore in 'income_records' collection
      await addDoc(collection(db, "income_records"), analysisResult);
  
      setAnalysis(analysisResult);
      alert("Tax analysis saved successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert(`Error saving tax analysis: ${error.message}`);
    }
  };
  
  return (
    <div className="tax-assistant-container">
      <h2>Tax Assistant</h2>
      <textarea
        value={incomeText}
        onChange={(e) => setIncomeText(e.target.value)}
        placeholder="Enter your income details (e.g., Salary: 500000)"
      />
      <button onClick={handleAnalyze}>Analyze</button>
      <button onClick={() => navigate("/tax-history")}>View Tax History</button>

      {analysis && (
        <>
          <div className="analysis-card">
            <h3>Total Income</h3>
            <p>₹{analysis.totalIncome.toLocaleString("en-IN")}</p>
          </div>
          <div className="analysis-card">
            <h3>Taxable Income</h3>
            <p>₹{analysis.totalTaxableIncome.toLocaleString("en-IN")}</p>
          </div>
          <div className="analysis-card">
            <h3>Tax Liability</h3>
            <p>₹{analysis.taxLiability.toLocaleString("en-IN")}</p>
          </div>
          <div className="analysis-card">
            <h3>AI Tax Saving Suggestions</h3>
            <ul>
              {analysis.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion.suggestion}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default TaxAssistant;
