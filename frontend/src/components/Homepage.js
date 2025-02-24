import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

const Homepage = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900">
      {/* Content */}
      <div className="text-center text-white p-8 rounded-lg max-w-2xl w-full bg-gray-800 border border-gray-700">
        <h1 className="text-6xl font-bold mb-6">
          FINTAX 
        </h1>
        <p className="text-xl mb-12 text-gray-300">
          Your Financial coach for tax calculations and planning
        </p>

        {/* Action Buttons */}
        <div className="space-y-6">
          <button
            onClick={() => navigate("/tax-assistant")}
            className="w-64 bg-gray-100 text-black font-semibold text-lg px-8 py-3 rounded-md border border-gray-600 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200"
          >
            Open Tax Assistant
          </button>
          
          <div>
            <button
              onClick={handleLogout}
              className="w-64 bg-gray-100 text-black font-semibold text-lg px-8 py-3 rounded-md border border-gray-600 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-gray-400 text-sm">
          <p>© 2024 AI Tax Assistant. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Homepage;