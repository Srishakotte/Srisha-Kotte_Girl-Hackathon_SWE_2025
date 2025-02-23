import { useForm } from "react-hook-form";
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const TaxForm = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      await addDoc(collection(db, "taxRecords"), {
        userId: auth.currentUser.uid, // Store user ID
        income: parseFloat(data.income),
        taxPaid: parseFloat(data.taxPaid),
        createdAt: serverTimestamp(),
      });
      alert("Tax Record Added!");
      reset(); // Reset form after successful submission
    } catch (error) {
      console.error("Error adding tax record: ", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">Enter Tax Details</h2>

      {/* Income Field */}
      <input
        type="number"
        placeholder="Annual Income"
        {...register("income", { required: "Income is required", min: 1 })}
        className="border p-2 rounded w-full mb-2"
      />
      {errors.income && <p className="text-red-500">{errors.income.message}</p>}

      {/* Tax Paid Field */}
      <input
        type="number"
        placeholder="Tax Paid"
        {...register("taxPaid", { required: "Tax Paid is required", min: 0 })}
        className="border p-2 rounded w-full mb-2"
      />
      {errors.taxPaid && <p className="text-red-500">{errors.taxPaid.message}</p>}

      {/* Submit Button */}
      <button type="submit" className="bg-blue-500 text-white p-2 rounded w-full">
        Submit
      </button>
    </form>
  );
};

export default TaxForm;
