import React, { useState } from 'react';
import { Smartphone } from 'lucide-react';

interface PhoneImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const PhoneImage: React.FC<PhoneImageProps> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F4F4F6] via-[#FFFFFF] to-[#FFF2EB] text-[#0B0B0F] p-4 ${className}`}
      >
        <Smartphone className="w-10 h-10 text-[#FF5500] mb-2" strokeWidth={1.6} />
        <span className="text-xs font-medium text-neutral-600 text-center line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
