// src/components/dashboard/components/NewFunctions.tsx
import React from "react";

const NewFunctions = () => {
  return (
    <div className="rounded-lg bg-white p-4 shadow sm:p-6 xl:p-8 ">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <span className="text-2xl font-bold leading-none text-gray-900 sm:text-3xl">
            12
          </span>
          <h3 className="text-base font-normal text-gray-500">
            Nuevas funciones esta semana
          </h3>
        </div>
        <div className="ml-5 flex w-0 flex-1 items-center justify-end text-base font-bold text-green-500">
          100%
          <svg
            className="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            ></path>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default NewFunctions;
