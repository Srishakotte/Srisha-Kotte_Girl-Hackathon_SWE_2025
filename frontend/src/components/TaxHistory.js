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
