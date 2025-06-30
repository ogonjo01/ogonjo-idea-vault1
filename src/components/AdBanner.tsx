// src/components/AdBanner.tsx
import React from 'react';

interface AdBannerProps {
  page: number;
}

const AdBanner: React.FC<AdBannerProps> = ({ page }) => {
  return (
    <div className="w-full bg-gray-100 border border-dashed border-gray-300 rounded py-4 text-center">
      {/* Replace with actual ad network code */}
      <p className="text-sm text-gray-500">Advertisement - Page {page}</p>
    </div>
  );
};

export default AdBanner;