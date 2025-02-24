import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const handleAnalyze = () => {
    const incomeMap = parseIncomeText(incomeText);
    
    // AI Analysis simulation
    const mockAnalysis = {
      incomeClassification: {
        taxable: {
          'Salary': incomeMap['Salary'] || 0,
          'Freelance Income': incomeMap['Freelance Income'] || 0,
          'Rental Income': incomeMap['Rent'] || 0,
        },
        nonTaxable: {
          'Investment Returns': incomeMap['Investment'] || 0,
          'Health Insurance Premium': incomeMap['Health Insurance'] || 0,
        }
      },
      suggestions: [
        {
          type: "Salary Structure",
          suggestion: "Consider restructuring salary to include more tax-exempt components",
          impact: "Potential tax saving up to ₹50,000"
        },
        {
          type: "Investment",
          suggestion: "Increase investment in ELSS funds for tax benefits",
          impact: "Additional tax saving of ₹15,000"
        },
        {
          type: "Health Insurance",
          suggestion: "Increase health coverage for higher 80D benefits",
          impact: "Extra deduction of ₹25,000 possible"
        },
        {
          type: "Freelance Income",
          suggestion: "Maintain proper documentation of expenses for deductions",
          impact: "Can reduce taxable income by 30%"
        }
      ]
    };
    setAnalysis(mockAnalysis);
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
                        {Object.entries(analysis.incomeClassification.taxable).map(([source, amount]) => (
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
                          <td>₹{Object.values(analysis.incomeClassification.taxable)
                                .reduce((sum, val) => sum + val, 0)
                                .toLocaleString('en-IN')}
                          </td>
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
                        {Object.entries(analysis.incomeClassification.nonTaxable).map(([source, amount]) => (
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
                          <td>₹{Object.values(analysis.incomeClassification.nonTaxable)
                                .reduce((sum, val) => sum + val, 0)
                                .toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="analysis-card animate-card">
                  <h3 className="card-title">Personalized Tax Suggestions</h3>
                  <div className="suggestions-container">
                    {analysis.suggestions.map((suggestion, index) => (
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
