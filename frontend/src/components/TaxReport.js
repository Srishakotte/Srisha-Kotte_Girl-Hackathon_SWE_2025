import React, { forwardRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const TaxReport = forwardRef(({ currentTaxRecord }, ref) => {
  const generatePDF = async () => {
    try {
      const element = document.getElementById('tax-report');
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // First page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`tax_report_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  // Expose the generatePDF method via ref
  React.useImperativeHandle(ref, () => ({
    generatePDF
  }));

  // Add null checks for currentTaxRecord
  if (!currentTaxRecord) {
    return null;
  }

  return (
    <div id="tax-report" className="p-8 bg-white" style={{ width: '800px' }}>
      <h1 className="text-3xl font-bold mb-6">Tax Report</h1>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Income Breakdown</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-medium">Taxable Income:</p>
            <p>₹{(currentTaxRecord.taxableIncome || 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="font-medium">Non-Taxable Income:</p>
            <p>₹{(currentTaxRecord.nonTaxableIncome || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Detailed Breakdown</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Category</th>
              <th className="border p-2 text-left">Amount</th>
              <th className="border p-2 text-left">Type</th>
            </tr>
          </thead>
          <tbody>
            {currentTaxRecord.breakdown?.map((item, index) => (
              <tr key={index}>
                <td className="border p-2">{item.category}</td>
                <td className="border p-2">₹{(item.amount || 0).toFixed(2)}</td>
                <td className="border p-2">{item.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 text-sm text-gray-500">
        <p>Generated on: {currentTaxRecord.date || new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
});

TaxReport.displayName = 'TaxReport';

export default TaxReport;
