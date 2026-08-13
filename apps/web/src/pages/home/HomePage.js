import React from 'react';
import Hero from '../../components/home/Hero';
import Explore from '../../components/home/Explore';
import VehicleSection from '../../components/home/VehicleSection';
import CompareSection from '../../components/home/CompareSection';
import PromoSection from '../../components/home/PromoSection';
import ReviewsSection from '../../components/home/ReviewsSection';

const HomePage = () => (
  <>
    <Hero />
    <Explore />
    <VehicleSection />
    <CompareSection />
    <PromoSection />
    <ReviewsSection />
  </>
);

export default HomePage;
