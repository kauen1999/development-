import React from "react";
import Spinner from "./Spinner";

type LoadingButtonProps = {
  loading: boolean;
  btnColor?: string;
  textColor?: string;
  children: React.ReactNode;
  type?: "submit" | "button" | "reset"; // define tipos válidos
};

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  textColor = "text-white",
  type = "submit",
  btnColor = "bg-ct-yellow-600",
  children,
  loading = false,
}) => {
  return (
    <button
      type={type} // ✅ aqui está a correção!
      className={`rounded-lg bg-primary-100 py-3 font-bold text-white ${btnColor} ${
        loading ? "bg-[#ccc]" : ""
      }`}
      disabled={loading}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-3">
          <Spinner />
          <span className="inline-block text-white">Cargando...</span>
        </div>
      ) : (
        <span className={`${textColor}`}>{children}</span>
      )}
    </button>
  );
};