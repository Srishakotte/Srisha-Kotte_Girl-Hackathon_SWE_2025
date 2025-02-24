// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { db } from "../firebase";
// import { collection, query, orderBy, getDocs } from "firebase/firestore";
// import "./TaxHistory.css";

// const TaxHistory = () => {
//   const navigate = useNavigate();
//   const [historyData, setHistoryData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [tableHeaders, setTableHeaders] = useState([]);

//   useEffect(() => {
//     fetchTaxHistory();
//   }, []);

//   const fetchTaxHistory = async () => {
//     try {
//       const taxHistoryRef = collection(db, "taxHistory");
//       const q = query(taxHistoryRef, orderBy("date", "desc"));
//       const querySnapshot = await getDocs(q);

//       const history = querySnapshot.docs.map((doc) => ({
//         id: doc.id,
//         ...doc.data(),
//       }));

//       if (history.length > 0) {
//         setTableHeaders(Object.keys(history[0]));
//       }

//       setHistoryData(history);
//       setLoading(false);
//     } catch (error) {
//       console.error("Error fetching tax history:", error);
//       setLoading(false);
//     }
//   };

//   const handleDownload = (record) => {
//     let csvContent = "Tax Analysis Report\n\n";

//     csvContent += "Taxable Income\n";
//     csvContent += "Source,Amount\n";
//     Object.entries(record.taxableIncome || {}).forEach(([source, amount]) => {
//       csvContent += `${source},₹${amount.toLocaleString("en-IN")}\n`;
//     });
//     csvContent += `Total Taxable Income,₹${(record.totalTaxableIncome || 0).toLocaleString("en-IN")}\n\n`;

//     csvContent += "Non-Taxable Income\n";
//     csvContent += "Source,Amount\n";
//     Object.entries(record.nonTaxableIncome || {}).forEach(([source, amount]) => {
//       csvContent += `${source},₹${amount.toLocaleString("en-IN")}\n`;
//     });
//     csvContent += `Total Non-Taxable Income,₹${(record.totalNonTaxableIncome || 0).toLocaleString("en-IN")}\n\n`;

//     csvContent += "Tax Saving Suggestions\n";
//     csvContent += "Type,Suggestion,Impact\n";
//     (record.suggestions || []).forEach(({ type, suggestion, impact }) => {
//       csvContent += `${type},"${suggestion}","${impact}"\n`;
//     });

//     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//     const link = document.createElement("a");
//     const url = URL.createObjectURL(blob);
//     link.setAttribute("href", url);
//     link.setAttribute("download", `tax_analysis_${new Date(record.date).toLocaleDateString()}.csv`);
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   return (
//     <div className="history-container">
//       <nav className="navbar">
//         <div className="navbar-inner">
//           <h1 className="navbar-title">Tax Analysis History</h1>
//           <button onClick={() => navigate("/tax-assistant")} className="navbar-button">
//             Back to Analyzer
//           </button>
//         </div>
//       </nav>

//       <div className="history-content">
//         {loading ? (
//           <div className="loading-state">
//             <div className="loading-spinner"></div>
//             <p>Loading tax history...</p>
//           </div>
//         ) : (
//           <div className="history-table-container">
//             {historyData.length > 0 ? (
//               <table className="history-table">
//                 <thead>
//                   <tr>
//                     {tableHeaders.map((header) => (
//                       <th key={header}>{header.toUpperCase().replace(/_/g, " ")}</th>
//                     ))}
//                     <th>Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {historyData.map((record) => (
//                     <tr key={record.id}>
//                       {tableHeaders.map((header, index) => (
//                         <td key={index}>
//                           {typeof record[header] === "object" ? JSON.stringify(record[header]) : String(record[header])}
//                         </td>
//                       ))}
//                       <td>
//                         <button className="download-button-small" onClick={() => handleDownload(record)}>
//                           Download
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             ) : (
//               <div className="empty-state">
//                 <p>No tax history found. Start by analyzing your income!</p>
//                 <button onClick={() => navigate("/tax-assistant")} className="analyze-button">
//                   Analyze Income
//                 </button>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default TaxHistory;
import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Chart } from "react-google-charts";

const TaxHistory = () => {
  const [records, setRecords] = useState([]);
  const [chartData, setChartData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const q = query(collection(db, "taxRecords"), where("userId", "==", auth.currentUser?.uid));
      const querySnapshot = await getDocs(q);
      const fetchedRecords = querySnapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data(),
        year: doc.data().createdAt?.toDate?.().getFullYear() || new Date().getFullYear()
      }));
      
      setRecords(fetchedRecords);

      // Prepare data for charts
      const barData = [["Year", "Taxable Income", "Tax Paid"]];
      let totalTaxable = 0;
      let totalTaxPaid = 0;

      fetchedRecords.forEach((record) => {
        barData.push([
          record.year.toString(),
          record.taxableIncome || 0,
          record.taxPaid || 0
        ]);
        totalTaxable += record.taxableIncome || 0;
        totalTaxPaid += record.taxPaid || 0;
      });

      setChartData({
        barChart: barData,
        pieChart: [
          ["Category", "Amount"],
          ["Total Taxable Income", totalTaxable],
          ["Total Tax Paid", totalTaxPaid]
        ]
      });
    } catch (error) {
      console.error("Error fetching records:", error);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Tax History</h2>
      
      {/* Charts Section */}
      {chartData.barChart?.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Bar Chart */}
          <div className="border p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Year-wise Tax Comparison</h3>
            <Chart
              chartType="BarChart"
              width="100%"
              height="300px"
              data={chartData.barChart}
              options={{
                title: "Tax History Overview",
                chartArea: { width: "80%", height: "70%" },
                hAxis: { title: "Year" },
                vAxis: { title: "Amount ($)" },
                legend: { position: "top" },
                animation: {
                  startup: true,
                  duration: 1000,
                  easing: "out",
                },
              }}
            />
          </div>

          {/* Pie Chart */}
          <div className="border p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Total Tax Distribution</h3>
            <Chart
              chartType="PieChart"
              width="100%"
              height="300px"
              data={chartData.pieChart}
              options={{
                title: "Total Tax Overview",
                pieHole: 0.4,
                chartArea: { width: "80%", height: "80%" },
                legend: { position: "bottom" },
                animation: {
                  startup: true,
                  duration: 1000,
                  easing: "out",
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Records List */}
      <div className="space-y-4">
        {records.map((record) => (
          <div key={record.id} className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-600">Year</p>
                <p className="font-semibold">{record.year}</p>
              </div>
              <div>
                <p className="text-gray-600">Taxable Income</p>
                <p className="font-semibold">${record.taxableIncome?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Tax Paid</p>
                <p className="font-semibold">${record.taxPaid?.toFixed(2)}</p>
              </div>
            </div>
            <button 
              onClick={() => navigate(`/overview/${record.id}`)}
              className="mt-3 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      {records.length === 0 && (
        <p className="text-center text-gray-500 mt-4">No tax records found.</p>
      )}
    </div>
  );
};

export default TaxHistory;