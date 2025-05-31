"use client";

import React from 'react';

interface CompatibilityMatrixProps {
  compatibility: Record<string, boolean>;
}

export const CompatibilityMatrix: React.FC<CompatibilityMatrixProps> = ({ compatibility }) => {
  if (!compatibility || Object.keys(compatibility).length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No compatibility information available.
      </div>
    );
  }

  const platforms = Object.keys(compatibility);

  return (
    <div className="grid grid-cols-2 gap-3">
      {platforms.map((platform) => (
        <div key={platform} className="flex items-center">
          <div className={`w-4 h-4 rounded-full mr-2 ${compatibility[platform] ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="capitalize">{platform}</span>
        </div>
      ))}
    </div>
  );
};

export default CompatibilityMatrix;
