import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('nerva-token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrateUser = async () => {
      if (token) {
        // We try to get user from local storage first to be fast
        const storedUser = localStorage.getItem('nerva-user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            if (parsedUser.preferred_language) {
              i18n.changeLanguage(parsedUser.preferred_language);
            }
          } catch (e) {
            console.error('Failed to parse stored user', e);
          }
        }
        
        try {
          const response = await fetch(`http://${window.location.hostname}:8000/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            localStorage.setItem('nerva-user', JSON.stringify(userData));
            if (userData.preferred_language) {
              i18n.changeLanguage(userData.preferred_language);
            }
          } else {
            // Token might be expired
            logout();
          }
        } catch (err) {
          console.error("Failed to fetch user profile", err);
          // If offline, we keep the user we loaded from local storage
        }
      }
      setLoading(false);
    };

    hydrateUser();
  }, [token, i18n]);

  const login = (newToken, userData) => {
    localStorage.setItem('nerva-token', newToken);
    localStorage.setItem('nerva-user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    if (userData.preferred_language) {
      i18n.changeLanguage(userData.preferred_language);
    }
  };

  const logout = () => {
    localStorage.removeItem('nerva-token');
    localStorage.removeItem('nerva-user');
    setToken(null);
    setUser(null);
  };

  const register = async (payload) => {
    // TODO backend: POST /api/auth/register { phone, otp, name, username, password, preferred_language, user_type }
    const response = await fetch(`http://${window.location.hostname}:8000/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Registration failed');
    }
    
    return await response.json();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      register, 
      loading, 
      isAuthenticated: !!token 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
