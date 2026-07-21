import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ExpenseApp from "./Expenseapp";
import PrivateRoute from "./guard/AuthGuard";
const AppContent = () => {
  const { user, logout } = useAuth();

  return (
    <div>
      {user && (
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <div>
            <span className="font-semibold">👋 Welcome, {user.name}!</span>
            <span className="ml-4 text-sm text-gray-400">({user.email})</span>
          </div>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      )}
      <ExpenseApp />
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <AppContent />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
