// src/components/dashboard/components/Visitors.tsx
import React from "react";
import { MdPeople, MdTrendingUp } from "react-icons/md";

const Visitors = () => {
  return (
    <div className="rounded-xl bg-white p-6 shadow-lg transition-all hover:shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
            <MdPeople className="text-2xl text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Visitantes</p>
            <p className="text-2xl font-bold text-gray-900">152</p>
            <p className="text-xs text-gray-500">Esta semana</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-green-600">
          <MdTrendingUp className="text-lg" />
          <span className="text-sm font-semibold">100%</span>
        </div>
      </div>
      
      <div className="mt-4">
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div className="h-2 w-full rounded-full bg-purple-500"></div>
        </div>
        <p className="mt-2 text-xs text-gray-500">Crecimiento excelente</p>
      </div>
    </div>
  );
};

export default Visitors;
