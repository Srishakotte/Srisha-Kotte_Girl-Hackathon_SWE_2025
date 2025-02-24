import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const TaxHistory = () => {
  const navigate = useNavigate();
  const [taxRecords, setTaxRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState('date-desc');

  // Bar Chart drawing function
  const drawBarChart = (records) => {
    const data = new window.google.visualization.DataTable();
    data.addColumn('string', 'Date');
    data.addColumn('number', 'Tax Liability');

    const chartData = records.map(record => [
      formatDateForChart(record.timestamp),
      record.taxLiability
    ]);

    data.addRows(chartData);

    const options = {
      title: 'Tax Liabilities Over Time (Bar Chart)',
      titleTextStyle: { color: '#fff', fontSize: 16 },
      backgroundColor: '#374151',
      hAxis: {
        title: 'Date',
        titleTextStyle: { color: '#fff' },
        textStyle: { color: '#d1d5db' },
      },
      vAxis: {
        title: 'Tax Liability (₹)',
        titleTextStyle: { color: '#fff' },
        textStyle: { color: '#d1d5db' },
        format: '₹#,##0',
      },
      legend: { position: 'none' },
      colors: ['#fff'],
      chartArea: { width: '80%', height: '70%' },
    };

    const chart = new window.google.visualization.ColumnChart(document.getElementById('tax-bar-chart'));
    chart.draw(data, options);
  };

  // LeetCode-style Line Chart drawing function
  const drawLineChart = (records) => {
    const data = new window.google.visualization.DataTable();
    data.addColumn('string', 'Date');
    data.addColumn('number', 'Tax Liability');
    data.addColumn({ type: 'string', role: 'annotation' });
    data.addColumn({ type: 'string', role: 'style' });

    const chartData = records.map((record, index) => {
      let arrow = '';
      let color = '#fff';
      if (index > 0) {
        const prevLiability = records[index - 1].taxLiability;
        const currLiability = record.taxLiability;
        if (currLiability < prevLiability) {
          arrow = '▲';
          color = '#00ff00'; // Green for decrease
        } else if (currLiability > prevLiability) {
          arrow = '▼';
          color = '#ff0000'; // Red for increase
        }
      }
      return [formatDateForChart(record.timestamp), record.taxLiability, arrow, color];
    });

    data.addRows(chartData);

    const options = {
      title: 'Tax Liabilities Trend ',
      titleTextStyle: { color: '#fff', fontSize: 16 },
      backgroundColor: '#374151',
      hAxis: {
        title: 'Date',
        titleTextStyle: { color: '#fff' },
        textStyle: { color: '#d1d5db' },
      },
      vAxis: {
        title: 'Tax Liability (₹)',
        titleTextStyle: { color: '#fff' },
        textStyle: { color: '#d1d5db' },
        format: '₹#,##0',
      },
      legend: { position: 'none' },
      annotations: {
        textStyle: { fontSize: 18, bold: true },
        stem: { length: 0 },
      },
      series: { 0: { pointSize: 5, lineWidth: 2, color: '#fff' } },
      chartArea: { width: '80%', height: '70%' },
    };

    const chart = new window.google.visualization.LineChart(document.getElementById('tax-line-chart'));
    chart.draw(data, options);
  };

  useEffect(() => {
    console.log("Setting up Firestore listener...");
    
    const q = query(collection(db, 'income_records'), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        console.log("Received Firestore update, document count:", querySnapshot.size);
        
        const records = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            timestamp: data.timestamp,
            totalIncome: data.totalIncome || 0,
            totalTaxableIncome: data.totalTaxableIncome || 0,
            totalNonTaxableIncome: data.totalNonTaxableIncome || 0,
            taxableIncome: data.taxable || {},
            nonTaxableIncome: data.nonTaxable || {},
            taxLiability: data.taxLiability || 0,
            suggestions: data.suggestions || [],
            incomeDetails: data.incomeDetails || {},
            ...data
          };
        });

        const sortedRecords = sortRecords(records, sortOption);
        setTaxRecords(sortedRecords);
        setLoading(false);

        if (records.length > 0 && window.google) {
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

    return () => {
      console.log("Cleaning up Firestore listener...");
      unsubscribe();
    };
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
        sortedRecords.sort((a, b) => b.taxLiability - a.taxLiability);
        break;
      case 'tax-asc':
        sortedRecords.sort((a, b) => a.taxLiability - b.taxLiability);
        break;
      default:
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
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <nav className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-white">Tax Analysis History</h1>
        <div className="flex items-center gap-3">
          <select
            value={sortOption}
            onChange={handleSortChange}
            className="bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200"
          >
            <option value="date-desc">Sort by Date (Newest First)</option>
            <option value="date-asc">Sort by Date (Oldest First)</option>
            <option value="tax-desc">Sort by Tax Liability (High to Low)</option>
            <option value="tax-asc">Sort by Tax Liability (Low to High)</option>
          </select>
          <button
            onClick={() => navigate(-1)}
            className="py-2 px-4 bg-gray-800 text-white rounded-md font-medium border border-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200"
          >
            Back
          </button>
        </div>
      </nav>

      <main className="flex-1 p-6">
        {loading ? (
          <div className="text-center text-gray-400 text-lg">Loading tax history...</div>
        ) : taxRecords.length === 0 ? (
          <div className="text-center text-gray-400 text-lg">No tax history available.</div>
        ) : (
          <div className="space-y-6">
            {/* Bar Chart */}
            <div className="bg-gray-700 rounded-lg border border-gray-600 p-4">
              <div id="tax-bar-chart" className="w-full h-64"></div>
            </div>

            {/* LeetCode-style Line Chart */}
            <div className="bg-gray-700 rounded-lg border border-gray-600 p-4">
              <div id="tax-line-chart" className="w-full h-64"></div>
            </div>

            {/* Tax Records */}
            {taxRecords.map(record => (
              <div
                key={record.id}
                className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-white"
              >
                <h3 className="text-lg font-medium text-white mb-4">
                  Recorded on: {formatDate(record.timestamp)}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-gray-700 rounded-md">
                    <p className="text-sm text-gray-400">Total Income</p>
                    <p className="text-xl font-semibold text-white mt-1">₹{formatCurrency(record.totalIncome)}</p>
                  </div>
                  <div className="p-4 bg-gray-700 rounded-md">
                    <p className="text-sm text-gray-400">Taxable Income</p>
                    <p className="text-xl font-semibold text-white mt-1">₹{formatCurrency(record.totalTaxableIncome)}</p>
                  </div>
                  <div className="p-4 bg-gray-700 rounded-md">
                    <p className="text-sm text-gray-400">Tax Liability</p>
                    <p className="text-xl font-semibold text-white mt-1">₹{formatCurrency(record.taxLiability)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Taxable Sources</h4>
                    <ul className="space-y-2">
                      {Object.entries(record.taxableIncome).length === 0 ? (
                        <li className="text-gray-500">No taxable sources recorded.</li>
                      ) : (
                        Object.entries(record.taxableIncome).map(([source, amount]) => (
                          amount > 0 && (
                            <li key={source} className="flex justify-between bg-gray-700 p-2 rounded-md">
                              <span>{source}</span>
                              <span className="font-medium">₹{formatCurrency(amount)}</span>
                            </li>
                          )
                        ))
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Non-Taxable Sources</h4>
                    <ul className="space-y-2">
                      {Object.entries(record.nonTaxableIncome).length === 0 ? (
                        <li className="text-gray-500">No non-taxable sources recorded.</li>
                      ) : (
                        Object.entries(record.nonTaxableIncome).map(([source, amount]) => (
                          amount > 0 && (
                            <li key={source} className="flex justify-between bg-gray-700 p-2 rounded-md">
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
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Tax Saving Suggestions</h4>
                    <ul className="space-y-3">
                      {record.suggestions.map((suggestion, index) => (
                        <li key={index} className="p-3 bg-gray-700 rounded-md">
                          <span className="font-medium text-white">{suggestion.type}:</span> {suggestion.suggestion}
                          <p className="text-gray-400 mt-1">Impact: {suggestion.impact}</p>
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
    </div>
  );
};

export default TaxHistory;