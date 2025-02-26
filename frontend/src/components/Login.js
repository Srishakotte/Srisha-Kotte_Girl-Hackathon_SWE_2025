import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/home");
    } catch (error) {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2A5C54] via-[#E6F0EA] to-[#FFFFFF] flex items-center justify-center p-6">
      <div className="bg-white rounded-lg border border-[#FFBB77] p-8 w-full max-w-md shadow-lg">
        <h2 className="text-2xl font-semibold text-[#FFBB77] text-center mb-6">
          Login
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-[#FF6666] text-white rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[#34C759] mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-md bg-white text-[#2A5C54] placeholder-gray-400 border border-[#34C759] focus:outline-none focus:ring-2 focus:ring-[#FFBB77] focus:border-[#FFBB77] transition-all duration-200"
              required
            />
          </div>

          <div>
            <label className="block text-[#34C759] mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-md bg-white text-[#2A5C54] placeholder-gray-400 border border-[#34C759] focus:outline-none focus:ring-2 focus:ring-[#FFBB77] focus:border-[#FFBB77] transition-all duration-200"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-[#FFBB77] text-white rounded-md font-medium hover:bg-[#FFA955] focus:outline-none focus:ring-2 focus:ring-[#34C759] focus:ring-offset-2 focus:ring-offset-white transition-all duration-200"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;