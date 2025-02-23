import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import TaxAssistant from "./TaxAssistant"; // Import the Tax Assistant component

const Homepage = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  // Check if user is logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login"); // Redirect to login if not authenticated
      }
    });
    return () => unsubscribe();
  }, [auth, navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login"); // Redirect to login after logout
  };

  return (
    <div className="homepage">
      <h1>Welcome to AI Tax Assistant 🏦</h1>
      <button onClick={handleLogout}>Logout</button>
      <TaxAssistant /> {/* Include Tax Assistant inside Homepage */}
    </div>
  );
};

export default Homepage;
