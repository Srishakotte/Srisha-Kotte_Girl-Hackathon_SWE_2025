import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsPDF } from "jspdf";
import "jspdf-autotable"; // For table support in jsPDF

const API_KEY = process.env.REACT_APP_GOOGLE_GENERATIVE_AI_API_KEY;

const TaxAssistant = () => {
  const [incomeText, setIncomeText] = useState("");
  const [selectedITR, setSelectedITR] = useState("ITR1"); // Default ITR type
  const [analysis, setAnalysis] = useState(null);
  const [taxHistory, setTaxHistory] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [validationPopup, setValidationPopup] = useState(""); // For validation messages
  const [error, setError] = useState(null); // Add error state here
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

  // ITR eligibility criteria (simplified for demonstration)
  const itrCriteria = {
    ITR1: {
      maxIncome: 5000000, // Up to ₹50 lakh
      sources: ["Salary", "Pension", "One House Property", "Other Sources"],
    },
    ITR2: {
      minIncome: 5000000, // Above ₹50 lakh or specific cases
      sources: [
        "Salary",
        "Pension",
        "Multiple House Properties",
        "Capital Gains",
        "Other Sources",
        "Foreign Income",
      ],
    },
    ITR3: {
      sources: [
        "Salary",
        "Pension",
        "House Property",
        "Business/Profession",
        "Capital Gains",
        "Other Sources",
        "Foreign Income",
      ],
    },
  };

  useEffect(() => {
    const q = query(collection(db, "income_records"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const records = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp,
        taxLiability: doc.data().taxLiability || 0,
      }));
      setTaxHistory(records);
    }, (error) => {
      console.error("Firestore snapshot error:", error);
    });
    return () => unsubscribe();
  }, []);

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
        if (!isNaN(value)) incomeMap[key] = value;
      }
    });
    return incomeMap;
  };

  const classifyIncome = (incomeMap) => {
    const taxable = {
      Salary: incomeMap["Salary"] || 0,
      "Freelance Income": incomeMap["Freelance Income"] || 0,
      "Rental Income": incomeMap["Rent"] || 0,
    };
    const nonTaxable = {};
    for (const [key, value] of Object.entries(incomeMap)) {
      if (!["Salary", "Freelance Income", "Rent"].includes(key)) {
        nonTaxable[key] = value;
      }
    }
    return { taxable, nonTaxable };
  };

  const validateITRSelection = (incomeMap, totalIncome) => {
    const selectedCriteria = itrCriteria[selectedITR];
    const incomeSources = Object.keys(incomeMap);

    // Check income limits
    if (selectedITR === "ITR1" && totalIncome > selectedCriteria.maxIncome) {
      return "Income exceeds ₹50 lakh. Please select ITR2 or ITR3.";
    }
    if (selectedITR === "ITR2" && totalIncome <= itrCriteria.ITR1.maxIncome && !incomeSources.some((source) => !itrCriteria.ITR1.sources.includes(source))) {
      return "Income and sources qualify for ITR1. Please select ITR1.";
    }

    // Check income sources
    const invalidSources = incomeSources.filter((source) => !selectedCriteria.sources.includes(source));
    if (invalidSources.length > 0) {
      return `Selected ITR (${selectedITR}) does not support these sources: ${invalidSources.join(", ")}. Please select an appropriate ITR type.`;
    }

    return "";
  };

  const generateTaxSuggestions = async (incomeDetails) => {
    try {
      const prompt = `Given these income details: ${JSON.stringify(
        incomeDetails
      )}, provide 3 specific tax saving suggestions. Format each with type, suggestion, and impact.`;
      const botResponse = await fetchGeminiResponse(prompt);
      return JSON.parse(botResponse);
    } catch (error) {
      console.error("Error generating suggestions:", error);
      return [
        { type: "Investment", suggestion: "Invest in ELSS funds under Section 80C", impact: "Save up to ₹46,800" },
        { type: "Insurance", suggestion: "Get health insurance under Section 80D", impact: "Save up to ₹25,000" },
        { type: "Home Loan", suggestion: "Claim home loan interest under Section 24", impact: "Save up to ₹2,00,000" },
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
      const { taxable, nonTaxable } = classifyIncome(incomeMap);
      const totalIncome = Object.values(incomeMap).reduce((sum, val) => sum + val, 0);
      const totalTaxableIncome = Object.values(taxable).reduce((sum, val) => sum + val, 0);

      // Validate ITR selection
      const validationMessage = validateITRSelection(incomeMap, totalIncome);
      if (validationMessage) {
        setValidationPopup(validationMessage);
        return;
      }

      const taxLiability = calculateTax(totalTaxableIncome);
      const suggestions = await generateTaxSuggestions(incomeMap);

      const analysisResult = {
        timestamp: serverTimestamp(),
        itrType: selectedITR,
        incomeDetails: incomeMap,
        taxable,
        nonTaxable,
        totalIncome,
        totalTaxableIncome,
        taxLiability,
        suggestions,
      };

      await addDoc(collection(db, "income_records"), analysisResult);
      setAnalysis(analysisResult);
      setError(null); // Clear any previous error
      alert("Tax analysis saved successfully!");
      // Automatically generate and download the PDF report after analysis
      handleDownloadReport();
    } catch (error) { // Explicitly declare 'error' as a parameter
      console.error("Error:", error);
      setError(error.message || "An error occurred while saving tax analysis"); // Set error state
      alert(`Error saving tax analysis: ${error.message}`);
    }
  };

  const handleDownloadReport = () => {
    if (!analysis) {
      alert("Please analyze income first!");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(10);
    generateTaxReportAsTable(doc, analysis, analysis.itrType); // Use ITR type for the report
    doc.save(`${analysis.itrType}_Tax_Report.pdf`);
  };

  const generateTaxReportAsTable = (doc, analysis, formType) => {
    if (!analysis) return;

    const formatAmount = (amount) => `₹${(amount || 0).toLocaleString("en-IN")}`;
    const incomeDetails = analysis.incomeDetails || {}; // Default to empty object if undefined
    const totalDeductions = Object.entries(incomeDetails)
      .filter(([key]) => typeof key === "string" && key.includes("Section")) // Ensure key is a string
      .reduce((sum, [, val]) => sum + (Number(val) || 0), 0); // Ensure val is a number
    const netTaxableIncome = Math.max(0, analysis.totalTaxableIncome - totalDeductions);

    let tableData = [];
    let tableHeaders = ["Field", "Details"];

    if (formType === "ITR1") {
      tableData = [
        ["Form", "INDIAN INCOME TAX RETURN - ITR-1 (SAHAJ)"],
        ["Assessment Year", "2025-26"],
        ["", ""], // Spacer
        ["PART B: GROSS TOTAL INCOME"],
        ["B1. Income from Salary/Pension", formatAmount(analysis.taxable["Salary"] || analysis.taxable["Income from Salary/Pension"] || 0)],
        ["B2. Income from One House Property", formatAmount(analysis.taxable["Rental Income"] || analysis.taxable["Income from House Property"] || 0)],
        ["B3. Income from Other Sources", formatAmount(analysis.taxable["Other Sources"] || analysis.taxable["Income from Other Sources"] || 0)],
        ["B4. Gross Total Income", formatAmount(analysis.totalTaxableIncome)],
        ["", ""], // Spacer
        ["PART D: DEDUCTIONS AND TAXABLE TOTAL INCOME"],
        ...Object.entries(incomeDetails)
          .filter(([key]) => typeof key === "string" && key.includes("Section")) // Ensure key is a string
          .map(([key, value]) => [`D${key.split(" ")[1] || "1"}. ${key}`, formatAmount(Number(value) || 0)]), // Ensure value is a number
        ["Total Deductions", formatAmount(totalDeductions)],
        ["Total Taxable Income", formatAmount(netTaxableIncome)],
        ["", ""], // Spacer
        ["PART E: COMPUTATION OF TAX PAYABLE"],
        ["E1. Tax Payable on Total Income", formatAmount(analysis.taxLiability)],
        ["E2. Rebate u/s 87A", formatAmount(analysis.taxLiability <= 500000 ? Math.min(analysis.taxLiability, 12500) : 0)],
        ["E3. Tax Payable after Rebate", formatAmount(analysis.taxLiability > 500000 ? analysis.taxLiability : Math.max(0, analysis.taxLiability - 12500))],
        ["", ""], // Spacer
        ["TAX-SAVING SUGGESTIONS"],
        ...analysis.suggestions.map((s, idx) => [`Suggestion ${idx + 1}`, `${s.type}: ${s.suggestion} (Impact: ${s.impact})`]),
      ];
    } else if (formType === "ITR2") {
      tableData = [
        ["Form", "INDIAN INCOME TAX RETURN - ITR-2"],
        ["Assessment Year", "2025-26"],
        ["", ""], // Spacer
        ["PART B-TI: COMPUTATION OF TOTAL INCOME"],
        ["1. Income from Salary/Pension", formatAmount(analysis.taxable["Salary"] || analysis.taxable["Income from Salary/Pension"] || 0)],
        ["2. Income from House Property", formatAmount(analysis.taxable["Rental Income"] || analysis.taxable["Income from House Property"] || 0)],
        ["3. Income from Capital Gains", formatAmount(analysis.taxable["Capital Gains"] || analysis.taxable["Income from Capital Gains"] || 0)],
        ["4. Income from Other Sources", formatAmount(analysis.taxable["Other Sources"] || analysis.taxable["Income from Other Sources"] || 0)],
        ["5. Total Income", formatAmount(analysis.totalTaxableIncome)],
        ["6. Deductions under Chapter VI-A", ""],
        ...Object.entries(incomeDetails)
          .filter(([key]) => typeof key === "string" && key.includes("Section")) // Ensure key is a string
          .map(([key, value]) => [`   ${String.fromCharCode(97 + Object.keys(incomeDetails).filter(k => typeof k === "string" && k.includes("Section")).indexOf(key))}. ${key}`, formatAmount(Number(value) || 0)]), // Ensure value is a number
        ["   Total Deductions", formatAmount(totalDeductions)],
        ["7. Total Taxable Income", formatAmount(netTaxableIncome)],
        ["", ""], // Spacer
        ["PART B-TTI: COMPUTATION OF TAX LIABILITY"],
        ["1. Tax Payable on Total Income", formatAmount(analysis.taxLiability)],
        ["2. Rebate u/s 87A", formatAmount(analysis.taxLiability <= 500000 ? Math.min(analysis.taxLiability, 12500) : 0)],
        ["3. Tax Payable after Rebate", formatAmount(analysis.taxLiability > 500000 ? analysis.taxLiability : Math.max(0, analysis.taxLiability - 12500))],
        ["", ""], // Spacer
        ["TAX-SAVING SUGGESTIONS"],
        ...analysis.suggestions.map((s, idx) => [`Suggestion ${idx + 1}`, `${s.type}: ${s.suggestion} (Impact: ${s.impact})`]),
      ];
    } else if (formType === "ITR3") {
      tableData = [
        ["Form", "INDIAN INCOME TAX RETURN - ITR-3"],
        ["Assessment Year", "2025-26"],
        ["", ""], // Spacer
        ["PART B-TI: COMPUTATION OF TOTAL INCOME"],
        ["1. Income from Salary/Pension", formatAmount(analysis.taxable["Salary"] || analysis.taxable["Income from Salary/Pension"] || 0)],
        ["2. Income from House Property", formatAmount(analysis.taxable["Rental Income"] || analysis.taxable["Income from House Property"] || 0)],
        ["3. Profits and Gains from Business/Profession", formatAmount(analysis.taxable["Freelance Income"] || analysis.taxable["Business/Profession"] || 0)],
        ["4. Income from Capital Gains", formatAmount(analysis.taxable["Capital Gains"] || analysis.taxable["Income from Capital Gains"] || 0)],
        ["5. Income from Other Sources", formatAmount(analysis.taxable["Other Sources"] || analysis.taxable["Income from Other Sources"] || 0)],
        ["6. Total Income", formatAmount(analysis.totalTaxableIncome)],
        ["7. Deductions under Chapter VI-A", ""],
        ...Object.entries(incomeDetails)
          .filter(([key]) => typeof key === "string" && key.includes("Section")) // Ensure key is a string
          .map(([key, value]) => [`   ${String.fromCharCode(97 + Object.keys(incomeDetails).filter(k => typeof k === "string" && k.includes("Section")).indexOf(key))}. ${key}`, formatAmount(Number(value) || 0)]), // Ensure value is a number
        ["   Total Deductions", formatAmount(totalDeductions)],
        ["8. Total Taxable Income", formatAmount(netTaxableIncome)],
        ["", ""], // Spacer
        ["PART B-TTI: COMPUTATION OF TAX LIABILITY"],
        ["1. Tax Payable on Total Income", formatAmount(analysis.taxLiability)],
        ["2. Rebate u/s 87A", formatAmount(analysis.taxLiability <= 500000 ? Math.min(analysis.taxLiability, 12500) : 0)],
        ["3. Tax Payable after Rebate", formatAmount(analysis.taxLiability > 500000 ? analysis.taxLiability : Math.max(0, analysis.taxLiability - 12500))],
        ["", ""], // Spacer
        ["TAX-SAVING SUGGESTIONS"],
        ...analysis.suggestions.map((s, idx) => [`Suggestion ${idx + 1}`, `${s.type}: ${s.suggestion} (Impact: ${s.impact})`]),
      ];
    }

    doc.autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: 10,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak", font: "helvetica" },
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
      bodyStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
  };

  const fetchGeminiResponse = async (prompt) => {
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + API_KEY,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await response.json();
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("No valid response from Gemini API");
      }
    } catch (error) {
      console.error("Error fetching Gemini response:", error);
      return "Sorry, I couldn’t process your request right now.";
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const newMessages = [...chatMessages, { sender: "user", text: userInput }];
    setChatMessages(newMessages);
    setUserInput("");

    const prompt = `You are a tax assistant. Answer this tax-related question: ${userInput}`;
    const botResponse = await fetchGeminiResponse(prompt);

    setChatMessages([...newMessages, { sender: "bot", text: botResponse }]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      {/* Navbar */}
      <nav className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <h1 className="text-xl font-semibold text-white">Tax Assistant</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/tax-history")}
            className="px-4 py-2 font-medium text-white transition-all duration-200 bg-gray-800 border border-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            History
          </button>
          <button
            onClick={handleDownloadReport}
            className="px-4 py-2 font-medium text-black transition-all duration-200 bg-white rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
            disabled={!analysis}
          >
            Download {selectedITR} Report
          </button>
        </div>
      </nav>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-1/3 p-6 overflow-y-auto bg-gray-800 border-r border-gray-700">
          <div className="mb-6">
            <label htmlFor="itrType" className="block mb-1 text-sm font-medium text-white">
              Select ITR Type
            </label>
            <select
              id="itrType"
              value={selectedITR}
              onChange={(e) => setSelectedITR(e.target.value)}
              className="w-full p-2 text-white bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-white focus:border-white"
            >
              <option value="ITR1">ITR-1 (SAHAJ)</option>
              <option value="ITR2">ITR-2</option>
              <option value="ITR3">ITR-3</option>
            </select>
            <div className="mt-2 text-sm text-gray-400">
              <p><strong>ITR-1:</strong> For salaried people earning less than ₹50 lakhs with one house property, no capital gains.</p>
              <p><strong>ITR-2:</strong> For salaried people with capital gains, multiple house properties, or total income > ₹50 lakhs.</p>
              <p><strong>ITR-3:</strong> For individuals with business or professional income, and may include capital gains or multiple house properties.</p>
            </div>
          </div>
          {error && ( // Render error message if it exists
            <p className="mb-4 text-sm text-red-400">{error}</p>
          )}
          {analysis && (
            <>
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-medium text-gray-400">Income Classification</h3>
                <table className="w-full text-sm text-white">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">Type</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-700">
                      <td className="py-2 font-medium">Taxable Income</td>
                      <td className="py-2 text-right">₹{analysis.totalTaxableIncome.toLocaleString("en-IN")}</td>
                    </tr>
                    {Object.entries(analysis.taxable).map(([key, value]) => (
                      value > 0 && (
                        <tr key={key}>
                          <td className="py-1 pl-4">{key}</td>
                          <td className="py-1 text-right">₹{value.toLocaleString("en-IN")}</td>
                        </tr>
                      )
                    ))}
                    <tr className="border-b border-gray-700">
                      <td className="py-2 font-medium">Non-Taxable Income</td>
                      <td className="py-2 text-right">
                        ₹{Object.values(analysis.nonTaxable).reduce((sum, val) => sum + val, 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                    {Object.entries(analysis.nonTaxable).map(([key, value]) => (
                      value > 0 && (
                        <tr key={key}>
                          <td className="py-1 pl-4">{key}</td>
                          <td className="py-1 text-right">₹{value.toLocaleString("en-IN")}</td>
                        </tr>
                      )
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-700">
                      <td className="py-2 font-medium">Total Income</td>
                      <td className="py-2 text-right">₹{analysis.totalIncome.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">Tax Liability</td>
                      <td className="py-2 text-right">₹{analysis.taxLiability.toLocaleString("en-IN")}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-400">AI Tax Suggestions</h3>
                <ul className="space-y-3 text-white">
                  {analysis.suggestions.map((suggestion, index) => (
                    <li key={index} className="p-3 bg-gray-700 rounded-md">
                      <span className="font-medium">{suggestion.type}:</span> {suggestion.suggestion} <br />
                      <span className="text-gray-400">Impact: {suggestion.impact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </aside>

        /* Body */
        <main className="flex-1 p-6">
          <div className="mb-4">
            <label htmlFor="itrType" className="block mb-1 text-sm font-medium text-white">
              Select ITR Type
            </label>
            <select
              id="itrType"
              value={selectedITR}
              onChange={(e) => setSelectedITR(e.target.value)}
              className="w-full p-2 text-white bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-white focus:border-white"
            >
              <option value="ITR1">ITR-1 (SAHAJ)</option>
              <option value="ITR2">ITR-2</option>
              <option value="ITR3">ITR-3</option>
            </select>
          </div>
          <textarea
            value={incomeText}
            onChange={(e) => setIncomeText(e.target.value)}
            placeholder="Enter your income details (e.g., Salary: 500000)"
            className="w-full h-40 p-3 mb-4 text-white placeholder-gray-400 transition-all duration-200 bg-gray-800 border border-gray-600 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-white focus:border-white"
          />
          <button
            onClick={handleAnalyze}
            className="w-full px-4 py-2 mb-6 font-medium text-black transition-all duration-200 bg-white rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Analyze 
          </button>
        </main>
      </div>

      {/* Validation Popup */}
      {validationPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
            <p className="mb-4 text-white">{validationPopup}</p>
            <button
              onClick={() => setValidationPopup("")}
              className="px-4 py-2 font-medium text-black bg-white rounded-md hover:bg-gray-200"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Chatbot Button and Window */}
      <div className="fixed z-50 bottom-6 right-6">
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="p-3 text-white bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>

        {isChatOpen && (
          <div className="absolute right-0 flex flex-col bg-gray-800 border border-gray-700 rounded-lg shadow-xl bottom-16 w-80 h-96">
            <div className="p-3 bg-gray-700 rounded-t-lg">
              <h3 className="font-medium text-white">Tax Chat Assistant</h3>
            </div>
            <div className="flex-1 p-3 overflow-y-auto">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-2 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] p-2 rounded-lg ${
                      msg.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-600 text-white"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleChatSubmit} className="p-3 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask about taxes..."
                  className="flex-1 p-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxAssistant;