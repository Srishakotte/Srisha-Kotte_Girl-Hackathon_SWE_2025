import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    try {
      const auth = getAuth();
      await createUserWithEmailAndPassword(auth, email, password);
      // On successful signup, navigate to login page
      navigate("/login");
      // Optionally reset form fields (though not necessary since we redirect)
      setEmail("");
      setPassword("");
    } catch (error) {
      // Handle specific Firebase error codes
      switch (error.code) {
        case "auth/email-already-in-use":
          setError("This email is already in use. Please log in or use a different email.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/weak-password":
          setError("Password should be at least 6 characters long.");
          break;
        default:
          setError("An error occurred. Please try again.");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800 border border-gray-700 rounded-lg">
        <h2 className="mb-6 text-2xl font-semibold text-center text-white">
          Sign Up
        </h2>

        {error && (
          <div className="p-3 mb-4 text-white bg-red-600 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 text-gray-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 text-white placeholder-gray-400 transition-all duration-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-gray-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 text-white placeholder-gray-400 transition-all duration-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 font-medium text-black transition-all duration-200 bg-white rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Sign Up
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-white transition-all duration-200 hover:text-gray-300"
            >
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;