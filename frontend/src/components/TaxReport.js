import React, { forwardRef, useRef } from "react";
import { useReactToPrint } from "react-to-print";

const TaxReport = forwardRef(({ currentTaxRecord }, ref) => {
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Tax_Report_${new Date().toLocaleDateString()}`,
    onBeforePrint: () => console.log("Preparing PDF..."),
    onAfterPrint: () => console.log("PDF downloaded successfully!"),
  });

  // Expose the print function to the parent component
  React.useImperativeHandle(ref, () => ({
    generatePDF: handlePrint
  }));

  if (!currentTaxRecord) {
    return null;
  }

  return (
    <div ref={componentRef} className="p-8 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Tax Report</h1>
          <p className="text-gray-600">Generated on: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="border-t border-b py-6 my-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Income Details</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Gross Salary:</span> ${currentTaxRecord.salary.toFixed(2)}</p>
                <p><span className="font-medium">Deductions:</span> ${currentTaxRecord.deductions.toFixed(2)}</p>
                <p><span className="font-medium">Taxable Income:</span> ${currentTaxRecord.taxableIncome.toFixed(2)}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Tax Calculation</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Tax Rate:</span> 15%</p>
                <p><span className="font-medium">Tax Amount:</span> ${currentTaxRecord.taxPaid.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          <p>This is an official tax report document.</p>
          <p>Please retain this document for your records.</p>
        </div>
      </div>
    </div>
  );
});

TaxReport.displayName = 'TaxReport';

export default TaxReport;
