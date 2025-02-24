import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import './TaxHistory.css';

const TaxHistory = () => {
  const navigate = useNavigate();
  const [taxRecords, setTaxRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Setting up Firestore listener...");
    
    const q = query(
      collection(db, 'income_records'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        console.log("Received Firestore update, document count:", querySnapshot.size);
        
        const records = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log("Document data:", { id: doc.id, ...data });
          
          return {
            id: doc.id,
            timestamp: data.timestamp,
            totalIncome: data.totalIncome || 0,
            totalTaxableIncome: data.totalTaxableIncome || 0,
            totalNonTaxableIncome: data.totalNonTaxableIncome || 0,
            taxableIncome: data.taxableIncome || {},
            nonTaxableIncome: data.nonTaxableIncome || {},
            taxLiability: data.taxLiability || 0,
            suggestions: data.suggestions || [],
            incomeDetails: data.incomeDetails || {},
            ...data
          };
        });

        console.log("Processed records:", records);
        setTaxRecords(records);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      }
    );

    return () => {
      console.log("Cleaning up Firestore listener...");
      unsubscribe();
    };
  }, []);

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('en-IN');
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date not available';
    try {
      // Handle Firestore Timestamp
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      // Handle regular date string
      return new Date(timestamp).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Date not available';
    }
  };

  return (
    <div className="history-container">
      <nav className="navbar">
        <div className="navbar-inner">
          <h1 className="navbar-title">Tax Analysis History</h1>
          <button onClick={() => navigate(-1)} className="navbar-button">Back</button>
        </div>
      </nav>
      
      <div className="history-content">
        {loading ? (
          <div className="loading">Loading tax history...</div>
        ) : taxRecords.length === 0 ? (
          <div className="no-records">No tax history available.</div>
        ) : (
          <div className="history-list">
            {taxRecords.map(record => (
              <div key={record.id} className="history-card animate-card">
                <h3 className="card-title">
                  Recorded on: {formatDate(record.timestamp)}
                </h3>
                
                <div className="income-summary">
                  <div className="summary-item">
                    <p><strong>Total Income:</strong></p>
                    <p className="amount">₹{formatCurrency(record.totalIncome)}</p>
                  </div>
                  <div className="summary-item">
                    <p><strong>Taxable Income:</strong></p>
                    <p className="amount">₹{formatCurrency(record.totalTaxableIncome)}</p>
                  </div>
                  <div className="summary-item">
                    <p><strong>Tax Liability:</strong></p>
                    <p className="amount">₹{formatCurrency(record.taxLiability)}</p>
                  </div>
                </div>

                <div className="income-details">
                  <div className="income-section">
                    <h4>Taxable Sources:</h4>
                    <ul>
                      {Object.entries(record.taxableIncome || {}).map(([source, amount]) => (
                        amount > 0 && (
                          <li key={source}>
                            <span>{source}:</span>
                            <span className="amount">₹{formatCurrency(amount)}</span>
                          </li>
                        )
                      ))}
                    </ul>
                  </div>

                  <div className="income-section">
                    <h4>Non-Taxable Sources:</h4>
                    <ul>
                      {Object.entries(record.nonTaxableIncome || {}).map(([source, amount]) => (
                        amount > 0 && (
                          <li key={source}>
                            <span>{source}:</span>
                            <span className="amount">₹{formatCurrency(amount)}</span>
                          </li>
                        )
                      ))}
                    </ul>
                  </div>
                </div>

                {record.suggestions && record.suggestions.length > 0 && (
                  <div className="suggestions-section">
                    <h4>Tax Saving Suggestions:</h4>
                    <ul>
                      {record.suggestions.map((suggestion, index) => (
                        <li key={index} className="suggestion-item">
                          <strong>{suggestion.type}:</strong> {suggestion.suggestion}
                          <span className="impact">{suggestion.impact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxHistory;
