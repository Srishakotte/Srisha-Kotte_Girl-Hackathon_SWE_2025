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
      navigate("/home"); // Changed from "/login" to "/home"
      setEmail("");
      setPassword("");
    } catch (error) {
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
    <div className="flex items-center justify-center min-h-screen p-6 bg-gradient-to-br from-[#2A5C54] via-[#E6F0EA] to-[#FFFFFF]">
      <div className="w-full max-w-md p-8 bg-white border border-[#FFBB77] rounded-lg shadow-lg">
        <h2 className="mb-6 text-2xl font-semibold text-center text-[#FFBB77]">
          Sign Up
        </h2>

        {error && (
          <div className="p-3 mb-4 text-white bg-[#FF6666] rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 text-[#34C759]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 text-[#2A5C54] placeholder-gray-400 transition-all duration-200 bg-white border border-[#34C759] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FFBB77] focus:border-[#FFBB77]"
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-[#34C759]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 text-[#2A5C54] placeholder-gray-400 transition-all duration-200 bg-white border border-[#34C759] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FFBB77] focus:border-[#FFBB77]"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 font-medium text-white transition-all duration-200 bg-[#FFBB77] rounded-md hover:bg-[#FFA955] focus:outline-none focus:ring-2 focus:ring-[#34C759] focus:ring-offset-2 focus:ring-offset-white"
          >
            Sign Up
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[#2A5C54]">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-[#34C759] transition-all duration-200 hover:text-[#28A745]"
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