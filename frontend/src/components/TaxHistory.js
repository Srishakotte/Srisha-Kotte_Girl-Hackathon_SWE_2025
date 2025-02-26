import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";

const TaxHistory = () => {
  const navigate = useNavigate();
  const [taxRecords, setTaxRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState('date-desc');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const drawBarChart = (records) => {
    const data = new window.google.visualization.DataTable();
    data.addColumn('string', 'Date');
    data.addColumn('number', 'Tax Liability');

    const chartData = records.map(record => [
      formatDateForChart(record.timestamp),
      record.taxPayable
    ]);

    data.addRows(chartData);

    const options = {
      title: 'Tax Liabilities (Bar)',
      titleTextStyle: { color: '#2A5C54', fontSize: 14 },
      backgroundColor: '#FFFFFF',
      hAxis: {
        title: 'Date',
        titleTextStyle: { color: '#2A5C54', fontSize: 12 },
        textStyle: { color: '#2A5C54', fontSize: 10 },
      },
      vAxis: {
        title: 'Tax (₹)',
        titleTextStyle: { color: '#2A5C54', fontSize: 12 },
        textStyle: { color: '#2A5C54', fontSize: 10 },
        format: '₹#,##0',
      },
      legend: { position: 'none' },
      colors: ['#FFBB77'], // Saffron for bars
      chartArea: { width: '70%', height: '60%' },
    };

    const chart = new window.google.visualization.ColumnChart(document.getElementById('tax-bar-chart'));
    chart.draw(data, options);
  };

  const drawLineChart = (records) => {
    const data = new window.google.visualization.DataTable();
    data.addColumn('string', 'Date');
    data.addColumn('number', 'Tax Liability');
    data.addColumn({ type: 'string', role: 'annotation' });
    data.addColumn({ type: 'string', role: 'style' });

    const chartData = records.map((record, index) => {
      let arrow = '';
      let color = '#FFBB77'; // Default saffron
      if (index > 0) {
        const prevLiability = records[index - 1].taxPayable;
        const currLiability = record.taxPayable;
        if (currLiability < prevLiability) {
          arrow = '▲';
          color = '#34C759'; // Green for decrease
        } else if (currLiability > prevLiability) {
          arrow = '▼';
          color = '#FF6666'; // Red for increase
        }
      }
      return [formatDateForChart(record.timestamp), record.taxPayable, arrow, color];
    });

    data.addRows(chartData);

    const options = {
      title: 'Tax Trend (Line)',
      titleTextStyle: { color: '#2A5C54', fontSize: 14 },
      backgroundColor: '#FFFFFF',
      hAxis: {
        title: 'Date',
        titleTextStyle: { color: '#2A5C54', fontSize: 12 },
        textStyle: { color: '#2A5C54', fontSize: 10 },
      },
      vAxis: {
        title: 'Tax (₹)',
        titleTextStyle: { color: '#2A5C54', fontSize: 12 },
        textStyle: { color: '#2A5C54', fontSize: 10 },
        format: '₹#,##0',
      },
      legend: { position: 'none' },
      annotations: {
        textStyle: { fontSize: 12, bold: true, color: '#2A5C54' },
        stem: { length: 0 },
      },
      series: { 0: { pointSize: 5, lineWidth: 2, color: '#FFBB77' } }, // Saffron line
      chartArea: { width: '70%', height: '60%' },
    };

    const chart = new window.google.visualization.LineChart(document.getElementById('tax-line-chart'));
    chart.draw(data, options);
  };

  useEffect(() => {
    const q = query(collection(db, 'income_records'), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const records = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const taxableSum = Object.values(data.taxable || {}).reduce((sum, val) => sum + Number(val), 0);
          const nonTaxableSum = Object.values(data.nonTaxable || {}).reduce((sum, val) => sum + Number(val), 0);
          const totalIncome = taxableSum + nonTaxableSum;

          return {
            id: doc.id,
            timestamp: data.timestamp,
            totalIncome: totalIncome,
            totalTaxableIncome: data.totalTaxableIncome || taxableSum,
            totalNonTaxableIncome: data.totalNonTaxableIncome || nonTaxableSum,
            taxable: data.taxable || {},
            nonTaxable: data.nonTaxable || {},
            taxPayable: data.taxPayable || data.taxLiability || 0,
            suggestions: data.suggestions || [],
            incomeDetails: data.incomeDetails || {},
            ...data
          };
        });

        const sortedRecords = sortRecords(records, sortOption);
        setTaxRecords(sortedRecords);
        setLoading(false);

        if (sortedRecords.length > 0 && window.google) {
          window.google.charts.load('current', { packages: ['corechart'] });
          window.google.charts.setOnLoadCallback(() => {
            drawBarChart(sortedRecords);
            drawLineChart(sortedRecords);
          });
        }
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [sortOption]);

  const sortRecords = (records, option) => {
    let sortedRecords = [...records];
    switch (option) {
      case 'date-desc':
        sortedRecords.sort((a, b) => (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0));
        break;
      case 'date-asc':
        sortedRecords.sort((a, b) => (a.timestamp?.toDate?.() || 0) - (b.timestamp?.toDate?.() || 0));
        break;
      case 'tax-desc':
        sortedRecords.sort((a, b) => b.taxPayable - a.taxPayable);
        break;
      case 'tax-asc':
        sortedRecords.sort((a, b) => a.taxPayable - b.taxPayable);
        break;
      default:
        sortedRecords.sort((a, b) => (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0));
        break;
    }
    return sortedRecords;
  };

  const handleSortChange = (e) => {
    const newSortOption = e.target.value;
    setSortOption(newSortOption);
    const sortedRecords = sortRecords(taxRecords, newSortOption);
    setTaxRecords(sortedRecords);
    if (sortedRecords.length > 0 && window.google) {
      window.google.charts.load('current', { packages: ['corechart'] });
      window.google.charts.setOnLoadCallback(() => {
        drawBarChart(sortedRecords);
        drawLineChart(sortedRecords);
      });
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessages = [...chatMessages, { sender: "user", text: chatInput }];
    setChatMessages(newMessages);
    setChatInput("");

    try {
      const genAI = new GoogleGenerativeAI("YOUR_API_KEY_HERE"); // Replace with your Gemini API key
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are a tax assistant for Indian tax queries. Provide a concise, accurate answer to this question: "${chatInput}"`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const botResponse = response.text();
      setChatMessages([...newMessages, { sender: "bot", text: botResponse }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages([...newMessages, { sender: "bot", text: "Sorry, I couldn't process your request. Try again later." }]);
    }
  };

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('en-IN');
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date not available';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
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

  const formatDateForChart = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
        }).replace(' ', '-');
      }
      return new Date(timestamp).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
      }).replace(' ', '-');
    } catch (error) {
      console.error("Error formatting date for chart:", error);
      return 'N/A';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2A5C54] via-[#E6F0EA] to-[#FFFFFF] flex flex-col">
      {/* Fixed Header */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-[#FFBB77] p-4 flex justify-between items-center z-10 shadow-md">
        <h1 className="text-2xl font-bold text-[#0b1036]">Tax Analysis History</h1>
        <div className="flex items-center gap-3">
          <select
            value={sortOption}  
            onChange={handleSortChange}
            className="bg-white text-[#2A5C54] border border-[#34C759] rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#FFBB77] focus:ring-offset-2 focus:ring-offset-white transition-all duration-200"
          >
            <option value="date-desc">Date (Newest First)</option>
            <option value="date-asc">Date (Oldest First)</option>
            <option value="tax-desc">Tax (High to Low)</option>
            <option value="tax-asc">Tax (Low to High)</option>
          </select>
          <button
            onClick={() => navigate(-1)}
            className="py-2 px-4 bg-[#34C759] text-white rounded-md font-medium border border-[#FFBB77] hover:bg-[#28A745] focus:outline-none focus:ring-2 focus:ring-[#FFBB77] focus:ring-offset-2 focus:ring-offset-white transition-all duration-200"
          >
            Back
          </button>
        </div>
      </nav>

      {/* Main Content with Padding for Fixed Header */}
      <main className="flex-1 mt-16 p-6">
        {loading ? (
          <div className="text-center text-[#2A5C54] text-lg">Loading tax history...</div>
        ) : taxRecords.length === 0 ? (
          <div className="text-center text-[#2A5C54] text-lg">No tax history available.</div>
        ) : (
          <div className="space-y-6">
            {/* Charts Container - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-[#FFBB77] p-4 shadow-md">
                <div id="tax-bar-chart" className="w-full h-48"></div>
              </div>
              <div className="bg-white rounded-lg border border-[#FFBB77] p-4 shadow-md">
                <div id="tax-line-chart" className="w-full h-48"></div>
              </div>
            </div>

            {/* Tax Records */}
            {taxRecords.map(record => (
              <div
                key={record.id}
                className="bg-white rounded-lg border border-[#FFBB77] p-6 text-[#2A5C54] shadow-md"
              >
                <h3 className="text-lg font-medium text-[#34C759] mb-4">
                  Recorded on: {formatDate(record.timestamp)}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-[#E6F0EA] rounded-md">
                    <p className="text-sm text-[#34C759]">Total Income</p>
                    <p className="text-xl font-semibold text-[#2A5C54] mt-1">₹{formatCurrency(record.totalIncome)}</p>
                  </div>
                  <div className="p-4 bg-[#E6F0EA] rounded-md">
                    <p className="text-sm text-[#34C759]">Taxable Income</p>
                    <p className="text-xl font-semibold text-[#2A5C54] mt-1">₹{formatCurrency(record.totalTaxableIncome)}</p>
                  </div>
                  <div className="p-4 bg-[#E6F0EA] rounded-md">
                    <p className="text-sm text-[#34C759]">Tax Liability</p>
                    <p className="text-xl font-semibold text-[#2A5C54] mt-1">₹{formatCurrency(record.taxPayable)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-sm font-medium text-[#34C759] mb-2">Taxable Sources</h4>
                    <ul className="space-y-2">
                      {Object.entries(record.taxable).length === 0 ? (
                        <li className="text-[#2A5C54]">No taxable sources recorded.</li>
                      ) : (
                        Object.entries(record.taxable).map(([source, amount]) => (
                          amount > 0 && (
                            <li key={source} className="flex justify-between bg-[#E6F0EA] p-2 rounded-md">
                              <span>{source}</span>
                              <span className="font-medium">₹{formatCurrency(amount)}</span>
                            </li>
                          )
                        ))
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[#34C759] mb-2">Non-Taxable Sources</h4>
                    <ul className="space-y-2">
                      {Object.entries(record.nonTaxable).length === 0 ? (
                        <li className="text-[#2A5C54]">No non-taxable sources recorded.</li>
                      ) : (
                        Object.entries(record.nonTaxable).map(([source, amount]) => (
                          amount > 0 && (
                            <li key={source} className="flex justify-between bg-[#E6F0EA] p-2 rounded-md">
                              <span>{source}</span>
                              <span className="font-medium">₹{formatCurrency(amount)}</span>
                            </li>
                          )
                        ))
                      )}
                    </ul>
                  </div>
                </div>
                {record.suggestions && record.suggestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-[#34C759] mb-2">Tax Saving Suggestions</h4>
                    <ul className="space-y-3">
                      {record.suggestions.map((suggestion, index) => (
                        <li key={index} className="p-3 bg-[#E6F0EA] rounded-md">
                          <span className="font-medium text-[#34C759]">{suggestion.type}:</span> {suggestion.suggestion} <br />
                          <span className="text-[#2A5C54]">Impact: {suggestion.impact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Chatbot Button and Popup */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="p-3 text-white bg-[#293ef7] rounded-full shadow-lg hover:bg-[#456ff9] focus:outline-none focus:ring-2 focus:ring-[#FFBB77] focus:ring-offset-2 focus:ring-offset-white"
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
          <div className="absolute bottom-16 right-0 w-80 h-96 bg-white border border-[#FFBB77] rounded-lg shadow-xl flex flex-col">
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
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
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

export default TaxHistory;