import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import './TaxAssistant.css';

const TaxAssistant = () => {
  const navigate = useNavigate();
  const [incomeText, setIncomeText] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const parseIncomeText = (text) => {
    // Parse the input text to extract income values
    const incomeMap = {};
    const lines = text.split('\n');
    
    lines.forEach(line => {
      const [source, amount] = line.split(':').map(str => str.trim());
      if (source && amount) {
        incomeMap[source] = Number(amount.replace(/[^0-9.-]+/g, ''));
      }
    });
    
    return incomeMap;
  };

  const handleAnalyze = async () => {
    try {
      const incomeMap = parseIncomeText(incomeText);
      console.log("Parsed Income Data:", incomeMap);

      if (Object.keys(incomeMap).length === 0) {
        alert("Please enter valid income details");
        return;
      }

      // Calculate totals and classifications
      const totalIncome = Object.values(incomeMap).reduce((sum, val) => sum + val, 0);
      
      const taxableIncome = {
        Salary: incomeMap['Salary'] || 0,
        'Freelance Income': incomeMap['Freelance Income'] || 0,
        'Rental Income': incomeMap['Rent'] || 0
      };

      const nonTaxableIncome = {
        'Investment': incomeMap['Investment'] || 0,
        'Health Insurance': incomeMap['Health Insurance'] || 0
      };

      const totalTaxableIncome = Object.values(taxableIncome).reduce((sum, val) => sum + val, 0);
      const totalNonTaxableIncome = Object.values(nonTaxableIncome).reduce((sum, val) => sum + val, 0);

      const analysisResult = {
        timestamp: serverTimestamp(),
        incomeDetails: incomeMap,
        taxableIncome,
        nonTaxableIncome,
        totalIncome,
        totalTaxableIncome,
        totalNonTaxableIncome,
        suggestions: [
          {
            type: "Investment",
            suggestion: "Consider tax-saving ELSS mutual funds",
            impact: "Can save up to ₹46,800 in taxes"
          },
          {
            type: "Tax Planning",
            suggestion: "Invest in PPF for tax-free returns",
            impact: "Tax-free interest earnings"
          }
        ]
      };

      console.log("Saving analysis result:", analysisResult); // Debug log

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'tax_records'), analysisResult);
      console.log("Document written with ID: ", docRef.id);
      
      // Update local state
      setAnalysis(analysisResult);
      
      alert("Tax analysis saved successfully!");
    } catch (error) {
      console.error("Detailed error:", error); // More detailed error logging
      alert(`Error saving tax analysis: ${error.message}`);
    }
  };

  return (
    <div className="layout-container">
      <main className="main-content">
        <nav className="navbar">
          <div className="navbar-inner">
            <h1 className="navbar-title">AI Income Analyzer</h1>
            <button onClick={() => navigate("/tax-history")} className="navbar-button">
              View History
            </button>
          </div>
        </nav>

        <div className="content-wrapper">
          <div className="input-section">
            <h2 className="section-title">Income Details</h2>
            <div className="input-group">
              <label className="input-label">Enter Your Income Details</label>
              <textarea
                value={incomeText}
                onChange={(e) => setIncomeText(e.target.value)}
                className="input-field text-area"
                placeholder="Enter your income details like:
Salary: 800000
Investment: 50000
Rent: 120000
Health Insurance: 20000
Freelance Income: 200000"
                rows={6}
              />
            </div>
            
            <button 
              className="analyze-button"
              onClick={handleAnalyze}
            >
              Analyze Income Sources
            </button>
          </div>
        </div>
      </main>

      <aside className="sidebar">
        <div className="sidebar-inner">
          <div className="sidebar-header">
            <h2 className="sidebar-title">Income Analysis</h2>
            <p className="sidebar-subtitle">AI-Powered Classification</p>
          </div>

          <div className="sidebar-content">
            {analysis && (
              <>
                <div className="analysis-card animate-card">
                  <h3 className="card-title">Taxable Income</h3>
                  <div className="table-container">
                    <table className="analysis-table">
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(analysis.taxableIncome || {}).map(([source, amount]) => (
                          amount > 0 && (
                            <tr key={source}>
                              <td>{source}</td>
                              <td>₹{amount.toLocaleString('en-IN')}</td>
                            </tr>
                          )
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="total-row">
                          <td>Total Taxable Income</td>
                          <td>₹{analysis.totalTaxableIncome.toLocaleString('en-IN')}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="analysis-card animate-card">
                  <h3 className="card-title">Non-Taxable Income</h3>
                  <div className="table-container">
                    <table className="analysis-table">
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(analysis.nonTaxableIncome || {}).map(([source, amount]) => (
                          amount > 0 && (
                            <tr key={source}>
                              <td>{source}</td>
                              <td>₹{amount.toLocaleString('en-IN')}</td>
                            </tr>
                          )
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="total-row">
                          <td>Total Non-Taxable Income</td>
                          <td>₹{analysis.totalNonTaxableIncome.toLocaleString('en-IN')}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="analysis-card animate-card">
                  <h3 className="card-title">Personalized Tax Suggestions</h3>
                  <div className="suggestions-container">
                    {analysis.suggestions && analysis.suggestions.map((suggestion, index) => (
                      <div key={index} className="suggestion-item">
                        <div className="suggestion-header">
                          <span className="suggestion-type">{suggestion.type}</span>
                          <span className="suggestion-impact">{suggestion.impact}</span>
                        </div>
                        <p className="suggestion-text">{suggestion.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!analysis && (
              <div className="empty-state">
                <p>Enter your income sources for AI-powered analysis</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default TaxAssistant;