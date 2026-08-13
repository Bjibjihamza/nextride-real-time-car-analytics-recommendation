import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Spinner from './components/ui/Spinner';
import HomePage from './pages/home/HomePage';
import SearchPage from './pages/search/SearchPage';
import PredictionPage from './pages/predict/PredictionPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import UserProfilePage from './pages/auth/UserProfilePage';
import CarDetailsPage from './pages/car/CarDetailsPage';
import AddCarPage from './pages/addcar/AddCarPage';
import VisualizationPage from './pages/visualization/VisualizationPage';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <Spinner label="Checking your session..." />;
  }
  if (!user) {
    return <Navigate to="/login" />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/predict" element={<PredictionPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/car/:carId" element={<CarDetailsPage />} />
        <Route path="/addcar" element={<AddCarPage />} />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/visualization" element={<VisualizationPage />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
