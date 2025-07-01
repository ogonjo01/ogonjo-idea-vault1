// src/components/AdBanner.tsx
import React from 'react';

interface AdBannerProps {
  page: number;
}

const AdBanner: React.FC<AdBannerProps> = ({ page }) => {
  return (
    <div className="w-full bg-gray-100 border border-dashed border-gray-300 rounded py-4 text-center">
      <div className="my-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400">
  <p className="font-roboto text-sm">Advertisement</p> {/* You can keep this label or remove it */}
  <ins className="adsbygoogle"
       style={{ display: 'block', textAlign: 'center', minHeight: '100px' }} // Use React style object
       data-ad-client="ca-pub-7769353221684341"
       data-ad-slot="7980803429"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>
       (window.adsbygoogle = window.adsbygoogle || []).push({});
  </script>
</div>
      <p className="text-sm text-gray-500">Advertisement - Page {page}</p>
    </div>
  );
};

export default AdBanner;