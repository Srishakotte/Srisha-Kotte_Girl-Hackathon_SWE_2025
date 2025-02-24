import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Homepage from "./components/Homepage";
import Login from "./components/Login";
import SignUp from "./components/Signup";
import TaxAssistant from "./components/TaxAssistant";
import TaxHistory from "./components/TaxHistory";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/" 
            element={<SignUp />} 
          />
          
          <Route 
            path="/login" 
            element={<Login />} 
          />

          <Route 
            path="/home" 
            element={<Homepage />} 
          />

          <Route 
            path="/tax-assistant" 
            element={user ? <TaxAssistant /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/tax-history" 
            element={user ? <TaxHistory /> : <Navigate to="/tax-assistant" />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
