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
import "jspdf-autotable";

const API_KEY = process.env.REACT_APP_GOOGLE_GENERATIVE_AI_API_KEY;

const TaxAssistant = () => {
  const [incomeText, setIncomeText] = useState("");
  const [selectedITR, setSelectedITR] = useState("ITR1");
  const [analysis, setAnalysis] = useState(null);
  const [taxHistory, setTaxHistory] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [validationPopup, setValidationPopup] = useState("");
  const [error, setError] = useState(null);
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

  const itrCriteria = {
    ITR1: {
      maxIncome: 5000000,
      sources: ["Salary", "Pension", "Rental Income", "Other Sources"],
    },
    ITR2: {
      minIncome: 5000000,
      sources: [
        "Salary",
        "Pension",
        "Rental Income",
        "Capital Gains",
        "Other Sources",
        "Foreign Income",
      ],
    },
    ITR3: {
      sources: [
        "Salary",
        "Pension",
        "Rental Income",
        "Freelance Income",
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
        let key = parts[0].trim();
        const value = parseFloat(parts[1].trim().replace(/,/g, ""));
        if (!isNaN(value)) {
          // Normalize income source names
          key = key.toLowerCase();
          if (key.includes("salary") || key.includes("pension")) key = "Salary";
          else if (key.includes("rent") || key.includes("rental")) key = "Rental Income";
          else if (key.includes("freelance") || key.includes("business")) key = "Freelance Income";
          else if (key.includes("capital")) key = "Capital Gains";
          else if (key.includes("foreign")) key = "Foreign Income";
          else if (key.includes("other")) key = "Other Sources";
          else if (key.includes("investment")) key = "Other Sources"; // Assuming investment income falls here
          else if (key.includes("health") || key.includes("insurance") || key.includes("section")) key = `Deduction ${key}`; // Deductions
          incomeMap[key] = value;
        }
      }
    });
    return incomeMap;
  };

  const classifyIncome = (incomeMap) => {
    const taxable = {};
    const nonTaxable = {};
    const deductions = {};

    for (const [key, value] of Object.entries(incomeMap)) {
      if (key.startsWith("Deduction")) {
        deductions[key.replace("Deduction ", "")] = value;
      } else if (["Salary", "Freelance Income", "Rental Income", "Capital Gains", "Foreign Income"].includes(key)) {
        taxable[key] = value;
      } else {
        nonTaxable[key] = value;
      }
    }

    return { taxable, nonTaxable, deductions };
  };

  const validateITRSelection = (incomeMap, totalIncome) => {
    const selectedCriteria = itrCriteria[selectedITR];
    const incomeSources = Object.keys(incomeMap).filter(key => !key.startsWith("Deduction"));

    if (selectedITR === "ITR1") {
      if (totalIncome > selectedCriteria.maxIncome) {
        return "Income exceeds ₹50 lakh. Please select ITR2 or ITR3.";
      }
      if (Object.keys(incomeMap).filter(k => k === "Rental Income").length > 1) {
        return "ITR1 supports only one house property. Please select ITR2 or ITR3 for multiple properties.";
      }
    }

    if (selectedITR === "ITR2" && totalIncome <= itrCriteria.ITR1.maxIncome) {
      const itr1Sources = itrCriteria.ITR1.sources;
      if (!incomeSources.some(source => !itr1Sources.includes(source))) {
        return "Income and sources qualify for ITR1. Please select ITR1.";
      }
    }

    const invalidSources = incomeSources.filter(source => !selectedCriteria.sources.includes(source));
    if (invalidSources.length > 0) {
      return `Selected ITR (${selectedITR}) does not support these sources: ${invalidSources.join(", ")}. Please select an appropriate ITR type.`;
    }

    return "";
  };

  const generateTaxSuggestions = async (incomeDetails) => {
    try {
      const prompt = `Given these income details: ${JSON.stringify(
        incomeDetails
      )}, provide 3 specific tax saving suggestions for Indian tax laws. Format each with type, suggestion, and impact.`;
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
      const { taxable, nonTaxable, deductions } = classifyIncome(incomeMap);
      const totalIncome = Object.values({ ...taxable, ...nonTaxable }).reduce((sum, val) => sum + val, 0);
      const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
      const totalTaxableIncome = Math.max(0, Object.values(taxable).reduce((sum, val) => sum + val, 0) - totalDeductions);

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
        deductions,
        totalIncome,
        totalTaxableIncome,
        taxLiability,
        suggestions,
      };

      await addDoc(collection(db, "income_records"), analysisResult);
      setAnalysis(analysisResult);
      setError(null);
      alert("Tax analysis saved successfully!");
      handleDownloadReport();
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "An error occurred while saving tax analysis");
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
    generateTaxReportAsTable(doc, analysis, analysis.itrType);
    doc.save(`${analysis.itrType}_Tax_Report.pdf`);
  };

  const generateTaxReportAsTable = (doc, analysis, formType) => {
    if (!analysis) return;

    const formatAmount = (amount) => `₹${(amount || 0).toLocaleString("en-IN")}`;
    const incomeDetails = analysis.incomeDetails || {};
    const totalDeductions = Object.values(analysis.deductions || {}).reduce((sum, val) => sum + val, 0);
    const netTaxableIncome = Math.max(0, analysis.totalTaxableIncome);

    let tableData = [];
    let tableHeaders = ["Field", "Details"];

    if (formType === "ITR1") {
      tableData = [
        ["Form", "INDIAN INCOME TAX RETURN - ITR-1 (SAHAJ)"],
        ["Assessment Year", "2025-26"],
        ["", ""],
        ["PART B: GROSS TOTAL INCOME"],
        ["B1. Income from Salary/Pension", formatAmount(analysis.taxable["Salary"] || 0)],
        ["B2. Income from One House Property", formatAmount(analysis.taxable["Rental Income"] || 0)],
        ["B3. Income from Other Sources", formatAmount(analysis.taxable["Other Sources"] || 0)],
        ["B4. Gross Total Income", formatAmount(analysis.totalTaxableIncome + totalDeductions)],
        ["", ""],
        ["PART D: DEDUCTIONS AND TAXABLE TOTAL INCOME"],
        ...Object.entries(analysis.deductions || {}).map(([key, value]) => [`D${key.split(" ")[1] || "1"}. ${key}`, formatAmount(value)]),
        ["Total Deductions", formatAmount(totalDeductions)],
        ["Total Taxable Income", formatAmount(netTaxableIncome)],
        ["", ""],
        ["PART E: COMPUTATION OF TAX PAYABLE"],
        ["E1. Tax Payable on Total Income", formatAmount(analysis.taxLiability)],
        ["E2. Rebate u/s 87A", formatAmount(analysis.taxLiability <= 500000 ? Math.min(analysis.taxLiability, 12500) : 0)],
        ["E3. Tax Payable after Rebate", formatAmount(analysis.taxLiability > 500000 ? analysis.taxLiability : Math.max(0, analysis.taxLiability - 12500))],
        ["", ""],
        ["TAX-SAVING SUGGESTIONS"],
        ...analysis.suggestions.map((s, idx) => [`Suggestion ${idx + 1}`, `${s.type}: ${s.suggestion} (Impact: ${s.impact})`]),
      ];
    } else if (formType === "ITR2") {
      tableData = [
        ["Form", "INDIAN INCOME TAX RETURN - ITR-2"],
        ["Assessment Year", "2025-26"],
        ["", ""],
        ["PART B-TI: COMPUTATION OF TOTAL INCOME"],
        ["1. Income from Salary/Pension", formatAmount(analysis.taxable["Salary"] || 0)],
        ["2. Income from House Property", formatAmount(analysis.taxable["Rental Income"] || 0)],
        ["3. Income from Capital Gains", formatAmount(analysis.taxable["Capital Gains"] || 0)],
        ["4. Income from Other Sources", formatAmount(analysis.taxable["Other Sources"] || 0)],
        ["5. Total Income", formatAmount(analysis.totalTaxableIncome + totalDeductions)],
        ["6. Deductions under Chapter VI-A", ""],
        ...Object.entries(analysis.deductions || {}).map(([key, value], idx) => [`   ${String.fromCharCode(97 + idx)}. ${key}`, formatAmount(value)]),
        ["   Total Deductions", formatAmount(totalDeductions)],
        ["7. Total Taxable Income", formatAmount(netTaxableIncome)],
        ["", ""],
        ["PART B-TTI: COMPUTATION OF TAX LIABILITY"],
        ["1. Tax Payable on Total Income", formatAmount(analysis.taxLiability)],
        ["2. Rebate u/s 87A", formatAmount(analysis.taxLiability <= 500000 ? Math.min(analysis.taxLiability, 12500) : 0)],
        ["3. Tax Payable after Rebate", formatAmount(analysis.taxLiability > 500000 ? analysis.taxLiability : Math.max(0, analysis.taxLiability - 12500))],
        ["", ""],
        ["TAX-SAVING SUGGESTIONS"],
        ...analysis.suggestions.map((s, idx) => [`Suggestion ${idx + 1}`, `${s.type}: ${s.suggestion} (Impact: ${s.impact})`]),
      ];
    } else if (formType === "ITR3") {
      tableData = [
        ["Form", "INDIAN INCOME TAX RETURN - ITR-3"],
        ["Assessment Year", "2025-26"],
        ["", ""],
        ["PART B-TI: COMPUTATION OF TOTAL INCOME"],
        ["1. Income from Salary/Pension", formatAmount(analysis.taxable["Salary"] || 0)],
        ["2. Income from House Property", formatAmount(analysis.taxable["Rental Income"] || 0)],
        ["3. Profits and Gains from Business/Profession", formatAmount(analysis.taxable["Freelance Income"] || 0)],
        ["4. Income from Capital Gains", formatAmount(analysis.taxable["Capital Gains"] || 0)],
        ["5. Income from Other Sources", formatAmount(analysis.taxable["Other Sources"] || 0)],
        ["6. Total Income", formatAmount(analysis.totalTaxableIncome + totalDeductions)],
        ["7. Deductions under Chapter VI-A", ""],
        ...Object.entries(analysis.deductions || {}).map(([key, value], idx) => [`   ${String.fromCharCode(97 + idx)}. ${key}`, formatAmount(value)]),
        ["   Total Deductions", formatAmount(totalDeductions)],
        ["8. Total Taxable Income", formatAmount(netTaxableIncome)],
        ["", ""],
        ["PART B-TTI: COMPUTATION OF TAX LIABILITY"],
        ["1. Tax Payable on Total Income", formatAmount(analysis.taxLiability)],
        ["2. Rebate u/s 87A", formatAmount(analysis.taxLiability <= 500000 ? Math.min(analysis.taxLiability, 12500) : 0)],
        ["3. Tax Payable after Rebate", formatAmount(analysis.taxLiability > 500000 ? analysis.taxLiability : Math.max(0, analysis.taxLiability - 12500))],
        ["", ""],
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
      headStyles: { fillColor: [255, 187, 119], textColor: [255, 255, 255] },
      bodyStyles: { fillColor: [255, 255, 255], textColor: [42, 92, 84] },
      alternateRowStyles: { fillColor: [230, 240, 234] },
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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#439e8f] via-[#80c89c] to-[#FFFFFF]">
      {/* Navbar */}
      <nav className="flex items-center justify-between p-4 bg-white border-b border-[#FFBB77] shadow-md">
        <h1 className="text-2xl font-bold text-[#122261]">FIN TAX</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/tax-history")}
            className="px-4 py-2 font-medium text-white bg-[#122261] border border-[#FFBB77] rounded-md hover:bg-[#345896] focus:outline-none focus:ring-2 focus:ring-[#FFBB77] focus:ring-offset-2 focus:ring-offset-white transition-all duration-200"
          >
            History
          </button>
          <button
            onClick={handleDownloadReport}
            className="px-4 py-2 font-medium text-white bg-[#122261] rounded-md hover:bg-[#345896] focus:outline-none focus:ring-2 focus:ring-[#34C759] focus:ring-offset-2 focus:ring-offset-white transition-all duration-200 disabled:bg-gray-300 disabled:text-gray-500"
            disabled={!analysis}
          >
            Download {selectedITR} Report
          </button>
        </div>
      </nav>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-1/3 p-6 overflow-y-auto bg-white border-r border-[#FFBB77]">
          <div className="mb-6">
            <label htmlFor="itrType" className="block mb-1 text-sm font-medium text-[#34C759]">
              Select ITR Type
            </label>
            <select
              id="itrType"
              value={selectedITR}
              onChange={(e) => setSelectedITR(e.target.value)}
              className="w-full p-2 text-[#2A5C54] bg-white border border-[#34C759] rounded-md focus:outline-none focus:ring-1 focus:ring-[#FFBB77] focus:border-[#FFBB77]"
            >
              <option value="ITR1">ITR-1 (SAHAJ)</option>
              <option value="ITR2">ITR-2</option>
              <option value="ITR3">ITR-3</option>
            </select>
            <div className="mt-2 text-sm text-[#2A5C54]">
              <p><strong>ITR-1:</strong> For income up to ₹50 lakhs from salary, one house property, or other sources.</p>
              <p><strong>ITR-2:</strong> For income > ₹50 lakhs, capital gains, or multiple properties.</p>
              <p><strong>ITR-3:</strong> For business/profession income (e.g., freelancing).</p>
            </div>
          </div>
          {error && (
            <p className="mb-4 text-sm text-[#FF6666]">{error}</p>
          )}
          {analysis && (
            <>
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-medium text-[#34C759]">Income Classification</h3>
                <table className="w-full text-sm text-[#2A5C54]">
                  <thead>
                    <tr className="border-b border-[#FFBB77]">
                      <th className="py-2 text-left">Type</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#FFBB77]">
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
                    <tr className="border-b border-[#FFBB77]">
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
                    <tr className="border-b border-[#FFBB77]">
                      <td className="py-2 font-medium">Deductions</td>
                      <td className="py-2 text-right">
                        ₹{Object.values(analysis.deductions).reduce((sum, val) => sum + val, 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                    {Object.entries(analysis.deductions).map(([key, value]) => (
                      value > 0 && (
                        <tr key={key}>
                          <td className="py-1 pl-4">{key}</td>
                          <td className="py-1 text-right">₹{value.toLocaleString("en-IN")}</td>
                        </tr>
                      )
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[#FFBB77]">
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
                <h3 className="mb-2 text-sm font-medium text-[#34C759]">AI Tax Suggestions</h3>
                <ul className="space-y-3 text-[#2A5C54]">
                  {analysis.suggestions.map((suggestion, index) => (
                    <li key={index} className="p-3 bg-[#E6F0EA] rounded-md">
                      <span className="font-medium text-[#34C759]">{suggestion.type}:</span> {suggestion.suggestion} <br />
                      <span className="text-[#2A5C54]">Impact: {suggestion.impact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </aside>

        <main className="flex-1 p-6">
          <div className="mb-4">
            <label htmlFor="itrType" className="block mb-1 text-sm font-medium text-[#06091c]">
              Select ITR Type
            </label>
            <select
              id="itrType"
              value={selectedITR}
              onChange={(e) => setSelectedITR(e.target.value)}
              className="w-full p-2 text-[#2A5C54] bg-white border border-[#34C759] rounded-md focus:outline-none focus:ring-1 focus:ring-[#FFBB77] focus:border-[#FFBB77]"
            >
              <option value="ITR1">ITR-1 (SAHAJ)</option>
              <option value="ITR2">ITR-2</option>
              <option value="ITR3">ITR-3</option>
            </select>
          </div>
          <textarea
            value={incomeText}
            onChange={(e) => setIncomeText(e.target.value)}
            placeholder="Enter your income details (e.g., Salary: 500000, Rent: 200000, Freelance: 150000, Health Insurance: 25000)"
            className="w-full h-40 p-3 mb-4 text-[#2A5C54] placeholder-gray-400 transition-all duration-200 bg-white border border-[#34C759] rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-[#FFBB77] focus:border-[#FFBB77]"
          />
          <button
            onClick={handleAnalyze}
            className="w-full px-4 py-2 mb-6 font-medium text-white bg-[#FFBB77] rounded-md hover:bg-[#FFA955] focus:outline-none focus:ring-2 focus:ring-[#34C759] focus:ring-offset-2 focus:ring-offset-white transition-all duration-200"
          >
            Analyze
          </button>
        </main>
      </div>

      {/* Validation Popup */}
      {validationPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 bg-white rounded-lg shadow-lg border border-[#FFBB77]">
            <p className="mb-4 text-[#2A5C54]">{validationPopup}</p>
            <button
              onClick={() => setValidationPopup("")}
              className="px-4 py-2 font-medium text-white bg-[#FFBB77] rounded-md hover:bg-[#FFA955]"
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
          className="p-3 text-white bg-[#122261] rounded-full shadow-lg hover:bg-[#345896] focus:outline-none focus:ring-2 focus:ring-[#FFBB77] focus:ring-offset-2 focus:ring-offset-white"
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
          <div className="absolute right-0 flex flex-col bg-white border border-[#FFBB77] rounded-lg shadow-xl bottom-16 w-80 h-96">
            <div className="p-3 bg-[#FFBB77] rounded-t-lg">
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
                      msg.sender === "user" ? "bg-[#34C759] text-white" : "bg-[#E6F0EA] text-[#2A5C54]"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleChatSubmit} className="p-3 border-t border-[#FFBB77]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask about taxes..."
                  className="flex-1 p-2 text-[#2A5C54] bg-white border border-[#34C759] rounded-md focus:outline-none focus:ring-1 focus:ring-[#FFBB77]"
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-white bg-[#34C759] rounded-md hover:bg-[#28A745] focus:outline-none focus:ring-2 focus:ring-[#FFBB77]"
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