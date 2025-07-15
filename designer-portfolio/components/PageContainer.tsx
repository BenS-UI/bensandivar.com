import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
}

const PageContainer: React.FC<PageContainerProps> = ({ children }) => {
  return (
    <div className="container mx-auto px-6 mb-12 sm:mb-16 md:mb-24">
      <div className="bg-surface/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 p-8 sm:p-12 md:p-16">
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
