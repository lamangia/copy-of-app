
import React, { useState, useEffect } from 'react';

const messages = [
  "Consulting with our virtual interior designers...",
  "Sourcing furniture from digital catalogs...",
  "Mixing the perfect color palettes...",
  "Arranging pixels into your dream room...",
  "Applying the final photorealistic touches...",
  "Almost there, preparing the big reveal!"
];

const Loader: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 h-full">
      <svg className="animate-spin h-10 w-10 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <h2 className="mt-6 text-xl font-serif font-semibold text-slate-800">Generating Your Designs</h2>
      <p className="mt-2 text-slate-600 transition-opacity duration-500">{messages[messageIndex]}</p>
    </div>
  );
};

export default Loader;