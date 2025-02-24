import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import "./TaxHistory.css";

const TaxHistory = () => {
  const navigate = useNavigate();
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableHeaders, setTableHeaders] = useState([]);

  useEffect(() => {
    fetchTaxHistory();
  }, []);

  const fetchTaxHistory = async () => {
    try {
      const taxHistoryRef = collection(db, "taxHistory");
      const q = query(taxHistoryRef, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);

      const history = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (history.length > 0) {
        setTableHeaders(Object.keys(history[0]));
      }

      setHistoryData(history);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching tax history:", error);
      setLoading(false);
    }
  };

  const handleDownload = (record) => {
    let csvContent = "Tax Analysis Report\n\n";

    csvContent += "Taxable Income\n";
    csvContent += "Source,Amount\n";
    Object.entries(record.taxableIncome || {}).forEach(([source, amount]) => {
      csvContent += `${source},₹${amount.toLocaleString("en-IN")}\n`;
    });
    csvContent += `Total Taxable Income,₹${(record.totalTaxableIncome || 0).toLocaleString("en-IN")}\n\n`;

    csvContent += "Non-Taxable Income\n";
    csvContent += "Source,Amount\n";
    Object.entries(record.nonTaxableIncome || {}).forEach(([source, amount]) => {
      csvContent += `${source},₹${amount.toLocaleString("en-IN")}\n`;
    });
    csvContent += `Total Non-Taxable Income,₹${(record.totalNonTaxableIncome || 0).toLocaleString("en-IN")}\n\n`;

    csvContent += "Tax Saving Suggestions\n";
    csvContent += "Type,Suggestion,Impact\n";
    (record.suggestions || []).forEach(({ type, suggestion, impact }) => {
      csvContent += `${type},"${suggestion}","${impact}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `tax_analysis_${new Date(record.date).toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="history-container">
      <nav className="navbar">
        <div className="navbar-inner">
          <h1 className="navbar-title">Tax Analysis History</h1>
          <button onClick={() => navigate("/tax-assistant")} className="navbar-button">
            Back to Analyzer
          </button>
        </div>
      </nav>

      <div className="history-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading tax history...</p>
          </div>
        ) : (
          <div className="history-table-container">
            {historyData.length > 0 ? (
              <table className="history-table">
                <thead>
                  <tr>
                    {tableHeaders.map((header) => (
                      <th key={header}>{header.toUpperCase().replace(/_/g, " ")}</th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((record) => (
                    <tr key={record.id}>
                      {tableHeaders.map((header, index) => (
                        <td key={index}>
                          {typeof record[header] === "object" ? JSON.stringify(record[header]) : String(record[header])}
                        </td>
                      ))}
                      <td>
                        <button className="download-button-small" onClick={() => handleDownload(record)}>
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>No tax history found. Start by analyzing your income!</p>
                <button onClick={() => navigate("/tax-assistant")} className="analyze-button">
                  Analyze Income
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxHistory;
