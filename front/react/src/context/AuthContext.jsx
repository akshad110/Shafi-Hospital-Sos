import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Apne backend ka actual API Base URL yahan dalein
const API_BASE_URL = 'http://localhost:5000/api'; // Example base URL

export function AuthProvider({ children }) {
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. App load hone par localStorage se token check karna
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('shafi_token');
      const savedHospital = localStorage.getItem('shafi_hospital');
      
      if (token && savedHospital) {
        try {
          // Agar aapke paas profile verify karne ki API hai toh yahan call kar sakte hain
          setHospital(JSON.parse(savedHospital));
        } catch (err) {
          console.error("Session parse error", err);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // 2. Real Login API Call (`/hospitallogin`)
  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/hospitallogin`, {
        email,
        password
      });

      const { token, user, role } = response.data;

      // Security check: Sirf hospital role allow karein agar zaroori ho
      if (role && role !== 'hospital') {
        throw new Error('Ye portal sirf hospitals ke liye hai!');
      }

      // Token aur user details store karna
      localStorage.setItem('shafi_token', token);
      localStorage.setItem('shafi_hospital', JSON.stringify(user));
      setHospital(user);

      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(errorMsg);
    }
  };

  // 3. Real Signup API Call (`/hospitalsignup`)
  const signup = async (hospitalData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/hospitalsignup`, hospitalData);

      const { token, user } = response.data;

      // Token aur user details store karna
      localStorage.setItem('shafi_token', token);
      localStorage.setItem('shafi_hospital', JSON.stringify(user));
      setHospital(user);

      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Registration failed';
      throw new Error(errorMsg);
    }
  };

  // 4. Logout Function
  const logout = () => {
    setHospital(null);
    localStorage.removeItem('shafi_token');
    localStorage.removeItem('shafi_hospital');
  };

  return (
    <AuthContext.Provider value={{ hospital, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);