// import React, { useState } from "react";
// import { GoogleGenerativeAI } from "@google/generative-ai";

// const TaxAssistant = () => {
//   const [incomeDetails, setIncomeDetails] = useState("");
//   const [taxData, setTaxData] = useState(null);
//   const [loading, setLoading] = useState(false);

//   // Initialize Gemini AI with API Key
//   const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GOOGLE_GENERATIVE_AI_API_KEY);
//   const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//   const handleCalculateTax = async () => {
//     if (!incomeDetails.trim()) {
//       alert("Please enter income details.");
//       return;
//     }

//     setLoading(true);
//     setTaxData(null);

//     const prompt = `
//     Based on Indian tax policies, analyze the following income details:
//     ${incomeDetails}
    
//     1. Calculate the total taxable income.
//     2. Provide a table differentiating taxable and non-taxable incomes.
//     3. Suggest alternatives to legally reduce taxable income (such as deductions under 80C, 80D).
//     4. Ensure calculations align with the latest Indian tax laws.

//     Output the response in a structured JSON format.
//     `;

//     try {
//       const result = await model.generateContent(prompt);
//       let textResponse = result.response.candidates[0].content.parts[0].text;

//       // Remove markdown formatting (```json ... ```)
//       textResponse = textResponse.replace(/```json|```/g, "").trim();

//       // Parse the cleaned JSON response
//       const parsedData = JSON.parse(textResponse);
//       setTaxData(parsedData);
//     } catch (error) {
//       console.error("Error fetching tax details:", error);
//       setTaxData(null);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="container mx-auto p-6 max-w-3xl">
//       <h1 className="text-2xl font-bold mb-4">💰 AI Tax Assistant</h1>
      
//       <textarea
//         rows={5}
//         className="w-full border rounded-lg p-2 mb-4"
//         placeholder="Enter your income details (e.g., salary, investments, deductions)..."
//         value={incomeDetails}
//         onChange={(e) => setIncomeDetails(e.target.value)}
//       ></textarea>

//       <button 
//         onClick={handleCalculateTax} 
//         disabled={loading} 
//         className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
//       >
//         {loading ? "Calculating..." : "Calculate Tax"}
//       </button>

//       {loading && <p className="mt-4 text-blue-600">🔄 Calculating tax, please wait...</p>}

//       {taxData && (
//         <div className="mt-6">
//           <h2 className="text-xl font-bold">📊 Tax Analysis</h2>
//           <p><strong>Taxable Income:</strong> ₹{taxData.taxableIncome}</p>
//           <p><strong>Non-Taxable Income:</strong> ₹{taxData.nonTaxableIncome}</p>

//           {/* Table for Breakdown */}
//           <h3 className="text-lg font-semibold mt-4">💡 Income Breakdown</h3>
//           <table className="w-full border mt-2">
//             <thead>
//               <tr className="bg-gray-200">
//                 <th className="p-2">Category</th>
//                 <th className="p-2">Amount (₹)</th>
//                 <th className="p-2">Type</th>
//               </tr>
//             </thead>
//             <tbody>
//               {taxData.breakdown.map((item, index) => (
//                 <tr key={index} className="border">
//                   <td className="p-2">{item.category}</td>
//                   <td className="p-2">{item.amount}</td>
//                   <td className="p-2">{item.type}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>

//           {/* Tax Saving Suggestions */}
//           <h3 className="text-lg font-semibold mt-4">✨ Tax Saving Suggestions</h3>
//           <ul className="list-disc ml-6 mt-2">
//             {taxData.suggestions.map((suggestion, index) => (
//               <li key={index} className="mt-1">{suggestion}</li>
//             ))}
//           </ul>

//           <p className="text-sm text-gray-500 mt-4">
//             ⚠️ Disclaimer: {taxData.disclaimer}
//           </p>
//         </div>
//       )}
//     </div>
//   );
// };

// export default TaxAssistant;
import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const TaxAssistant = () => {
  const [incomeDetails, setIncomeDetails] = useState("");
  const [taxableIncome, setTaxableIncome] = useState(0);
  const [nonTaxableIncome, setNonTaxableIncome] = useState(0);
  const [taxBreakdown, setTaxBreakdown] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Initialize Gemini AI with API Key
  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GOOGLE_GENERATIVE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const handleCalculateTax = async () => {
    if (!incomeDetails.trim()) {
      alert("Please enter income details.");
      return;
    }

    setLoading(true);
    
    // Simulated Calculation (Replace with AI output)
    let taxable = 0;
    let nonTaxable = 0;
    let breakdown = [];

    // Parse income details (user input)
    const incomeLines = incomeDetails.split("\n");
    incomeLines.forEach((line) => {
      const [category, amount] = line.split(":").map((item) => item.trim());

      if (!category || isNaN(amount)) return;

      const value = parseFloat(amount);

      // Check if it's taxable or non-taxable
      if (category.toLowerCase().includes("salary") || category.toLowerCase().includes("business") || category.toLowerCase().includes("freelance")) {
        taxable += value;
        breakdown.push({ category, amount: value, type: "Taxable" });
      } else if (category.toLowerCase().includes("investment") || category.toLowerCase().includes("deduction") || category.toLowerCase().includes("rent")) {
        nonTaxable += value;
        breakdown.push({ category, amount: value, type: "Non-Taxable" });
      } else {
        taxable += value; // Default to taxable
        breakdown.push({ category, amount: value, type: "Taxable" });
      }
    });

    // Generate tax-saving suggestions (AI response)
    const prompt = `
      Given the following taxable income: ₹${taxable} and non-taxable income: ₹${nonTaxable}, 
      suggest ways to legally reduce taxable income under Indian tax laws.
      Focus on 80C, 80D, HRA, and other deductions.
    `;

    try {
      const result = await model.generateContent({ contents: [{ parts: [{ text: prompt }] }] });
      const aiResponse = result.response.text(); // Extract AI response
      setSuggestions(aiResponse.split("\n").filter((item) => item)); // Convert to list
    } catch (error) {
      console.error("Error fetching tax suggestions:", error);
      setSuggestions(["Consider investing in PPF, ELSS, or claiming HRA for deductions."]);
    }

    // Update State
    setTaxableIncome(taxable);
    setNonTaxableIncome(nonTaxable);
    setTaxBreakdown(breakdown);
    setLoading(false);
  };

  return (
    <div className="container">
      <h1>💰 AI Tax Assistant</h1>
      
      <textarea
        rows={5}
        placeholder="Enter income details (e.g., Salary: 600000, Investment: 50000, Deduction: 150000)..."
        value={incomeDetails}
        onChange={(e) => setIncomeDetails(e.target.value)}
      ></textarea>

      <button onClick={handleCalculateTax} disabled={loading}>
        {loading ? "Calculating..." : "Calculate Tax"}
      </button>

      {/* Display Results */}
      {taxableIncome > 0 || nonTaxableIncome > 0 ? (
        <div>
          <h2>📊 Tax Breakdown</h2>
          <table border="1">
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount (₹)</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {taxBreakdown.map((item, index) => (
                <tr key={index}>
                  <td>{item.category}</td>
                  <td>{item.amount}</td>
                  <td style={{ color: item.type === "Taxable" ? "red" : "green" }}>
                    {item.type}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Total Taxable Income: ₹{taxableIncome}</h3>
          <h3>Total Non-Taxable Income: ₹{nonTaxableIncome}</h3>

          {/* Tax-saving Suggestions */}
          <h2>💡 Tax-Saving Suggestions</h2>
          <ul>
            {suggestions.length > 0 ? suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            )) : <li>No suggestions available.</li>}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default TaxAssistant;
