import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Chart } from "react-google-charts";

const TaxChart = () => {
  const [barChartData, setBarChartData] = useState([["Year", "Taxable Income", "Non-Taxable Income"]]);
  const [pieChartData, setPieChartData] = useState([["Category", "Amount"]]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!auth.currentUser?.uid) return;

        const q = query(
          collection(db, "taxRecords"), 
          where("userId", "==", auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(q);

        const barData = [["Year", "Taxable Income", "Non-Taxable Income"]];
        let taxableTotal = 0;
        let nonTaxableTotal = 0;

        querySnapshot.forEach((doc) => {
          const record = doc.data();
          const year = record.createdAt?.seconds 
            ? new Date(record.createdAt.seconds * 1000).getFullYear() 
            : new Date().getFullYear();
          const taxableIncome = record.taxableIncome || 0;
          // Calculate non-taxable income as deductions
          const nonTaxableIncome = record.deductions || 0;

          barData.push([year.toString(), taxableIncome, nonTaxableIncome]);
          taxableTotal += taxableIncome;
          nonTaxableTotal += nonTaxableIncome;
        });

        setBarChartData(barData);
        setPieChartData([
          ["Category", "Amount"],
          ["Taxable Income", taxableTotal],
          ["Non-Taxable Income", nonTaxableTotal],
        ]);
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center p-4">Loading charts...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Tax Data Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <div className="border p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Yearly Income Breakdown</h3>
          <Chart
            chartType="BarChart"
            width="100%"
            height="400px"
            data={barChartData}
            options={{
              title: "Annual Income Breakdown",
              chartArea: { width: "80%", height: "70%" },
              hAxis: { 
                title: "Year",
                slantedText: true,
                slantedTextAngle: 45
              },
              vAxis: { 
                title: "Income ($)",
                format: "currency"
              },
              legend: { position: "top" },
              animation: {
                startup: true,
                duration: 1000,
                easing: "out"
              },
              responsive: true
            }}
          />
        </div>

        {/* Pie Chart */}
        <div className="border p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Income Distribution</h3>
          <Chart
            chartType="PieChart"
            width="100%"
            height="400px"
            data={pieChartData}
            options={{
              title: "Taxable vs Non-Taxable Income",
              pieHole: 0.4,
              chartArea: { width: "80%", height: "80%" },
              legend: { position: "bottom" },
              animation: {
                startup: true,
                duration: 1000,
                easing: "out"
              },
              responsive: true
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TaxChart;
