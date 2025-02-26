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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#2A5C54] via-[#E6F0EA] to-[#FFFFFF] p-6">
      {/* Image Section */}
      <div className="mb-8">
        <img
          src="https://i.pinimg.com/474x/4e/f9/df/4ef9dfc70509752a4ad5612ef7107664.jpg"
          alt="Decorative Financial Illustration"
          className="w-48 h-48 rounded-full border-4 border-[#FFBB77] shadow-lg"
        />
      </div>

      {/* Content */}
      <div className="text-center text-[#2A5C54] p-8 rounded-lg max-w-2xl w-full bg-white border border-[#FFBB77] shadow-lg">
        <h1 className="text-6xl font-bold mb-6 text-[#FFBB77]">
          FINTAX
        </h1>
        <p className="text-xl mb-12 text-[#34C759]">
          Your Financial Coach for Tax Calculations and Planning
        </p>

        {/* Action Buttons */}
        <div className="space-y-6">
          <button
            onClick={() => navigate("/tax-assistant")}
            className="w-64 bg-[#FFBB77] text-white font-semibold text-lg px-8 py-3 rounded-md border border-[#34C759] hover:bg-[#FFA955] focus:outline-none focus:ring-2 focus:ring-[#34C759] focus:ring-offset-2 focus:ring-offset-white transition-all duration-200"
          >
            Open Tax Assistant
          </button>

          <div>
            <button
              onClick={handleLogout}
              className="w-64 bg-[#FFBB77] text-white font-semibold text-lg px-8 py-3 rounded-md border border-[#34C759] hover:bg-[#FFA955] focus:outline-none focus:ring-2 focus:ring-[#34C759] focus:ring-offset-2 focus:ring-offset-white transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-[#2A5C54] text-sm">
          <p>© 2024 AI Tax Assistant. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Homepage;