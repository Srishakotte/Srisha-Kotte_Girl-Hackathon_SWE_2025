
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

const TaxAssistant = () => {
  const [incomeText, setIncomeText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [taxHistory, setTaxHistory] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
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

  useEffect(() => {
    const q = query(collection(db, "income_records"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const records = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp,
        taxLiability: doc.data().taxLiability || 0,
      }));
      console.log("Tax History Records:", records);
      setTaxHistory(records);

      if (records.length > 0 && window.google) {
        window.google.charts.load("current", { packages: ["corechart"] });
        window.google.charts.setOnLoadCallback(() => drawChart(records));
      }
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

  const generateTaxSuggestions = async (incomeDetails) => {
    try {
      const genAI = new GoogleGenerativeAI("YOUR_API_KEY_HERE"); // Replace with your actual API key
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `Given these income details: ${JSON.stringify(
        incomeDetails
      )}, provide 3 specific tax saving suggestions. Format each with type, suggestion, and impact.`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return JSON.parse(response.text());
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
      const taxLiability = calculateTax(totalTaxableIncome);
      const suggestions = await generateTaxSuggestions(incomeMap);

      const analysisResult = {
        timestamp: serverTimestamp(),
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
      alert("Tax analysis saved successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert(`Error saving tax analysis: ${error.message}`);
    }
  };

  const handleDownloadReport = () => {
    if (!analysis) return;
    const report = `
      Tax Report
      Date: ${new Date().toLocaleString()}
      Total Income: ₹${analysis.totalIncome.toLocaleString("en-IN")}
      Taxable Income: ₹${analysis.totalTaxableIncome.toLocaleString("en-IN")}
      Tax Liability: ₹${analysis.taxLiability.toLocaleString("en-IN")}
      
      Taxable Income:
      ${Object.entries(analysis.taxable)
        .map(([key, value]) => `${key}: ₹${value.toLocaleString("en-IN")}`)
        .join("\n")}
      
      Non-Taxable Income:
      ${Object.entries(analysis.nonTaxable)
        .map(([key, value]) => `${key}: ₹${value.toLocaleString("en-IN")}`)
        .join("\n")}
      
      Tax Saving Suggestions:
      ${analysis.suggestions.map((s) => `${s.type}: ${s.suggestion} (Impact: ${s.impact})`).join("\n")}
    `;
    const blob = new Blob([report], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "tax_report.txt";
    link.click();
  };

  const formatDateForChart = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString("en-IN", { day: "numeric", month: "short" }).replace(" ", "-");
    } catch (error) {
      console.error("Error formatting date for chart:", error);
      return "N/A";
    }
  };

  const drawChart = (records) => {
    const data = new window.google.visualization.DataTable();
    data.addColumn("string", "Date");
    data.addColumn("number", "Tax Liability");
    data.addColumn({ type: "string", role: "style" });

    const chartData = records.map((record, index) => {
      const prevTax = index > 0 ? records[index - 1].taxLiability : null;
      let style;
      if (prevTax === null) {
        style = "point { size: 5; fill-color: #fff }";
      } else if (record.taxLiability < prevTax) {
        style = "point { size: 5; fill-color: #22c55e }; line { stroke-color: #22c55e }";
      } else if (record.taxLiability > prevTax) {
        style = "point { size: 5; fill-color: #ef4444 }; line { stroke-color: #ef4444 }";
      } else {
        style = "point { size: 5; fill-color: #fff }";
      }
      return [formatDateForChart(record.timestamp), record.taxLiability, style];
    });

    data.addRows(chartData);

    const options = {
      title: "Tax Liability Trend",
      titleTextStyle: { color: "#fff", fontSize: 16 },
      backgroundColor: "#374151",
      hAxis: {
        title: "Date",
        titleTextStyle: { color: "#fff" },
        textStyle: { color: "#d1d5db" },
      },
      vAxis: {
        title: "Tax Liability (₹)",
        titleTextStyle: { color: "#fff" },
        textStyle: { color: "#d1d5db" },
        format: "₹#,##0",
      },
      legend: { position: "none" },
      lineWidth: 2,
      pointSize: 5,
      chartArea: { width: "80%", height: "70%" },
      series: { 0: { lineWidth: 2 } },
    };

    const chartElement = document.getElementById("tax-chart");
    if (!chartElement) {
      console.error("Chart element not found!");
      return;
    }
    const chart = new window.google.visualization.LineChart(chartElement);
    chart.draw(data, options);
    console.log("Chart drawn successfully");
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const newMessages = [...chatMessages, { sender: "user", text: userInput }];
    setChatMessages(newMessages);
    setUserInput("");

    try {
      const genAI = new GoogleGenerativeAI("YOUR_API_KEY_HERE"); // Replace with your actual API key
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `You are a tax assistant. Answer this tax-related question: ${userInput}`;
      console.log("Sending prompt to Gemini:", prompt);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const botResponse = response.text();
      console.log("Received response from Gemini:", botResponse);

      setChatMessages([...newMessages, { sender: "bot", text: botResponse }]);
    } catch (error) {
      console.error("Chatbot error:", error.message);
      setChatMessages([
        ...newMessages,
        { sender: "bot", text: "Sorry, I couldn't process your request. Check the console for more details." },
      ]);
    }
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
            Download Report
          </button>
        </div>
      </nav>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-1/3 p-6 overflow-y-auto bg-gray-800 border-r border-gray-700">
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

        {/* Body */}
        <main className="flex-1 p-6">
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
          {taxHistory.length > 0 ? (
            <div className="p-4 bg-gray-700 border border-gray-600 rounded-lg">
              <div id="tax-chart" className="w-full h-64"></div>
            </div>
          ) : (
            <p className="text-center text-gray-400">No tax history available yet.</p>
          )}
        </main>
      </div>

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
