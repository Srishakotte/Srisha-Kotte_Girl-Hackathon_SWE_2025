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
    <div 
      className="min-h-screen flex flex-col items-center justify-center relative"
      style={{
        backgroundImage: `url(https://i.pinimg.com/736x/b7/6f/19/b76f19610efb95d9d63f54e9bd42e958.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Gradient Overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom right, rgba(88, 28, 135, 0.8), rgba(79, 70, 229, 0.6))',
          backdropFilter: 'blur(2px)'
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center text-white p-8 rounded-lg max-w-2xl w-full bg-white/10 backdrop-blur-sm">
        <h1 className="text-5xl font-bold mb-6 animate-fade-in">
          AI Tax Assistant
        </h1>
        <p className="text-xl mb-12 text-gray-100">
          Your intelligent companion for tax calculations and planning
        </p>

        {/* Action Buttons */}
        <div className="space-y-6">
          <button
            onClick={() => navigate("/tax-assistant")}
            className="w-64 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-lg px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition duration-300"
          >
            Open Tax Assistant
          </button>
          
          <div>
            <button
              onClick={handleLogout}
              className="w-64 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-lg px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition duration-300"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-gray-200 text-sm">
          <p>© 2024 AI Tax Assistant. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
