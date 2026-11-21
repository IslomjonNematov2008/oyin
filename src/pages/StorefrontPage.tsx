import React from 'react';
import { HeroSection } from '../components/store/HeroSection.tsx';
import { CatalogSection } from '../components/store/CatalogSection.tsx';
import { OrderTrackingSection } from '../components/store/OrderTrackingSection.tsx';

export const StorefrontPage: React.FC = () => {
  return (
    <div>
      <HeroSection />
      <CatalogSection />
      <OrderTrackingSection />
    </div>
  );
};
