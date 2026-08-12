import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Explore from './components/Explore';
import VehicleSection from './components/VehicleSection';
import CompareSection from './components/CompareSection';
import PromoSection from './components/PromoSection';
import ReviewsSection from './components/ReviewsSection';
import Footer from './components/Footer';
import PredictionPage from './pages/PredictionPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import UserProfilePage from './pages/auth/UserProfilePage';
import CarDetailsPage from './pages/CarDetailsPage';
import SearchPage from './pages/SearchPage';
import VisualizationPage from './pages/VisualizationPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import AddCarPage from './pages/AddCarPage';

function HomePage() {
  const { user, logout } = useAuth();
  return (
    <>
      <Hero isAuthenticated={!!user} user={user} handleLogout={logout} />
      <Explore />
      <VehicleSection />
      <CompareSection />
      <PromoSection />
      <ReviewsSection />
    </>
  );
}

function AppContent() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return <div>Loading...</div>;
    }
    if (!user) {
      return <Navigate to="/login" />;
    }
    return children;
  };

  const isHomePage = location.pathname === '/';

  return (
    <div className="w-screen min-h-screen m-0 p-0">
      {!isHomePage && (
        <Navbar isAuthenticated={!!user} user={user} handleLogout={logout} />
      )}
      <div style={{ paddingTop: isHomePage ? '0' : '80px' }}>
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
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;