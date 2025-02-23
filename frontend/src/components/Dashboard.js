// import { useEffect, useState, useRef } from "react";
// import { db, auth } from "../firebase";
// import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
// // import { useReactToPrint } from "react-to-print";
// import { useForm } from "react-hook-form";
// import TaxChart from "./TaxChart";
// import TaxReport from './TaxReport';
// import { Link } from "react-router-dom";

// const TaxDashboard = () => {
//   const [records, setRecords] = useState([]);
//   const [showHistory, setShowHistory] = useState(false);
//   const [showOverview, setShowOverview] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [currentTaxRecord, setCurrentTaxRecord] = useState(null);
//   // const [showReport, setShowReport] = useState(false);
//   const reportRef = useRef();
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);

//   useEffect(() => {
//     fetchRecords();
//   }, []);

//   const fetchRecords = async () => {
//     try {
//       const q = query(collection(db, "taxRecords"), where("userId", "==", auth.currentUser?.uid));
//       const querySnapshot = await getDocs(q);
//       const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

//       setRecords(data);
//     } catch (error) {
//       console.error("Error fetching records: ", error);
//     }
//   };

//   const { register, handleSubmit, reset, formState: { errors } } = useForm();

//   const onSubmit = async (data) => {
//     const taxableIncome = parseFloat(data.salary) - parseFloat(data.deductions || 0);
//     const taxPaid = taxableIncome * 0.15;

//     const newRecord = {
//       userId: auth.currentUser?.uid,
//       salary: parseFloat(data.salary),
//       deductions: parseFloat(data.deductions || 0),
//       taxableIncome,
//       taxPaid,
//       createdAt: new Date(),
//     };

//     try {
//       await addDoc(collection(db, "taxRecords"), newRecord);
//       setCurrentTaxRecord(newRecord);
//       alert("Tax Record Added!");
//       reset();
//       fetchRecords();
//     } catch (error) {
//       console.error("Error adding tax record: ", error);
//     }
//   };

//   const handleGenerateReport = () => {
//     if (currentTaxRecord) {
//       if (reportRef.current && reportRef.current.generatePDF) {
//         reportRef.current.generatePDF();
//       } else {
//         alert("Error generating report. Please try again.");
//       }
//     } else {
//       alert("Please submit a tax form first to generate a report.");
//     }
//   };

//   const filteredRecords = records.filter(
//     (record) =>
//       record.salary?.toString().includes(searchTerm) ||
//       record.taxableIncome?.toString().includes(searchTerm) ||
//       record.taxPaid?.toString().includes(searchTerm)
//   );

//   return (
//     <div className="min-h-screen bg-gray-100">
//       {/* Navbar */}
//       <nav className="bg-white shadow-md">
//         <div className="max-w-7xl mx-auto px-4">
//           <div className="flex justify-between h-16">
//             <div className="flex items-center">
//               <h1 className="text-xl font-bold text-gray-800">Tax Assistant</h1>
//             </div>
//             <div className="flex items-center space-x-4">
//               <Link to="/history" className="text-gray-600 hover:text-gray-900">History</Link>
//               <button
//                 onClick={handleGenerateReport}
//                 disabled={!currentTaxRecord}
//                 className={`px-4 py-2 rounded ${
//                   currentTaxRecord 
//                     ? 'bg-green-500 hover:bg-green-600 text-white' 
//                     : 'bg-gray-300 text-gray-500 cursor-not-allowed'
//                 }`}
//               >
//                 Download Report
//               </button>
//             </div>
//           </div>
//         </div>
//       </nav>

//       {/* Main Content */}
//       <div className="flex flex-col md:flex-row max-w-7xl mx-auto px-4 py-6 gap-6">
//         {/* Tax Form Section */}
//         <div className="md:w-1/2">
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <h2 className="text-xl font-bold mb-4">File Your Tax Returns</h2>
//             <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//               <div>
//                 <input
//                   type="number"
//                   placeholder="Salary"
//                   {...register("salary", { required: "Salary is required" })}
//                   className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
//                 />
//                 {errors.salary && <p className="text-red-500 text-sm">{errors.salary.message}</p>}
//               </div>

//               <div>
//                 <input
//                   type="number"
//                   placeholder="Deductions"
//                   {...register("deductions")}
//                   className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>

//               <button 
//                 type="submit" 
//                 className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
//               >
//                 Calculate Tax
//               </button>
//             </form>
//           </div>
//         </div>

//         {/* Sidebar with Charts */}
//         <div className="md:w-1/2">
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <div className="flex justify-between items-center mb-4">
//               <h2 className="text-xl font-bold">Tax Overview</h2>
//               <button
//                 onClick={() => setIsSidebarOpen(!isSidebarOpen)}
//                 className="md:hidden text-gray-500 hover:text-gray-700"
//               >
//                 {isSidebarOpen ? 'Hide Charts' : 'Show Charts'}
//               </button>
//             </div>
            
//             {isSidebarOpen && <TaxChart />}
//           </div>
//         </div>
//       </div>

//       {/* Show Tax History Button */}
//       <button onClick={() => setShowHistory(!showHistory)} className="bg-gray-500 text-white p-2 rounded mt-4 w-full">
//         {showHistory ? "Hide Tax History" : "Show Tax History"}
//       </button>

//       {/* Tax History */}
//       {showHistory && (
//         <div ref={reportRef} className="p-4 border rounded-lg mt-4">
//           <h2 className="text-xl font-bold mb-4">Tax History</h2>
//           <input
//             type="text"
//             placeholder="Search records..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="border p-2 rounded w-full mb-2"
//           />
//           {filteredRecords.length > 0 ? (
//             <ul className="space-y-2">
//               {filteredRecords.map((record) => (
//                 <li key={record.id} className="p-2 border rounded">
//                   <p><strong>Salary:</strong> ${record.salary}</p>
//                   <p><strong>Deductions:</strong> ${record.deductions}</p>
//                   <p><strong>Taxable Income:</strong> ${record.taxableIncome}</p>
//                   <p><strong>Tax Paid:</strong> ${record.taxPaid}</p>
//                 </li>
//               ))}
//             </ul>
//           ) : (
//             <p>No tax records found.</p>
//           )}
//         </div>
//       )}

//       {/* Show Tax Overview Button */}
//       <button 
//         onClick={() => setShowOverview(!showOverview)} 
//         className="bg-blue-500 text-white p-2 rounded mt-4 w-full"
//       >
//         {showOverview ? "Hide Tax Data Overview" : "Show Tax Data Overview"}
//       </button>

//       {showOverview && <TaxChart />}

//       {/* Generate Tax Report */}
//       <div className="p-4 border rounded-lg mt-4">
//         <h2 className="text-xl font-bold mb-4">Generate Tax Report</h2>
//         <button 
//           onClick={handleGenerateReport}
//           disabled={!currentTaxRecord}
//           className={`w-full p-2 rounded ${
//             currentTaxRecord 
//               ? 'bg-green-500 hover:bg-green-600 text-white' 
//               : 'bg-gray-300 cursor-not-allowed text-gray-500'
//           }`}
//         >
//           {currentTaxRecord ? 'Generate and Download Report' : 'Submit tax form to generate report'}
//         </button>
//       </div>

//       {/* Tax Report Component */}
//       <div style={{ display: "none" }}>
//         <TaxReport 
//           ref={reportRef}
//           currentTaxRecord={currentTaxRecord}
//         />
//       </div>
//     </div>
//   );
// };

// export default TaxDashboard;
