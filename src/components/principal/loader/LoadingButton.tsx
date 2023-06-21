import React from "react";
import Spinner from "./Spinner";

type LoadingButtonProps = {
  loading: boolean;
  btnColor?: string;
  textColor?: string;
  children: React.ReactNode;
};

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  textColor = "text-white",
  btnColor = "bg-ct-yellow-600",
  children,
  loading = false,
}) => {
  return (
    <button
      type="submit"
      className={`rounded-lg bg-primary-100 py-3 font-bold text-white ${btnColor} ${
        loading ? "bg-[#ccc]" : ""
      }`}
    >
      {loading ? (
        <div className="flex items-center gap-3 justify-center">
          <Spinner />
          <span className="inline-block text-white">Cargando...</span>
        </div>
      ) : (
        <span className={`${textColor}`}>{children}</span>
      )}
    </button>
  );
};
