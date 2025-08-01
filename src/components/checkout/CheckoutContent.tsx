// src/components/checkout/CheckoutContent.tsx
"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { trpc } from "@/utils/trpc";
import imgTU from "../../../public/images/PayPal.svg";

const CheckoutContent = () => {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "";

  const startPago = trpc.pagotic.startPagoTICPayment.useMutation();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!orderId) {
      alert("Pedido inválido. Verifique a URL.");
      return;
    }

    try {
      setLoading(true);
      const result = await startPago.mutateAsync({ orderId });

      if (result?.form_url) {
        window.location.href = result.form_url;
      } else {
        alert("No se pudo iniciar el pago.");
      }
    } catch (error) {
      console.error("Error al pagar:", error);
      alert("Ocurrió un error al procesar el pago.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5">
      <div className="min-w-screen bg-gray-50">
        <div className="p-5 py-5">
          <div className="mb-8"></div>
          <div className="mb-2">
            <h1 className="text-3xl font-bold md:text-5xl">Pagar</h1>
          </div>
          <div className="mb-5 text-gray-400">
            <span className="text-gray-500 ">Boletos</span> /{" "}
            <span className="text-gray-800">Pagar</span>
          </div>
        </div>
        <div className="w-full border-t border-b border-gray-200 bg-white p-5 text-gray-800">
          <div className="mt-9 w-full">
            <div className="-mx-3 items-start md:flex">
              <div className="px-3 md:w-7/12 lg:pr-10">
                {/* Aqui permanece todo o conteúdo original do lado esquerdo */}
              </div>
              <div className="px-3 md:w-5/12">
                <div className="mx-auto mb-6 w-full rounded-lg border border-gray-200 bg-white p-3 font-light text-gray-800">
                  {/* Campos de contato originais */}
                </div>
                <div className="mx-auto mb-6 w-full rounded-lg border border-gray-200 bg-white font-light text-gray-800">
                  <div className="w-full p-3">
                    <label
                      htmlFor="type2"
                      className="flex cursor-pointer items-center"
                    >
                      <input
                        type="radio"
                        className="form-radio h-5 w-5 text-indigo-500"
                        name="type"
                        id="type2"
                        checked
                      />
                      <Image
                        src={imgTU}
                        alt="tarjeta urbana"
                        width="150"
                        className="ml-3"
                      />
                    </label>
                  </div>
                  <div className="w-full border-t border-gray-200 p-3">
                    {/* Campos do cartão originais */}
                  </div>
                </div>
                <div>
                  <button
                    onClick={handlePayment}
                    disabled={loading}
                    className="mx-auto mb-9 block w-full max-w-xs rounded-lg bg-indigo-500 px-3 py-2 font-semibold text-white hover:bg-indigo-700 focus:bg-indigo-700"
                  >
                    <i className="mdi mdi-lock-outline mr-1"></i>{" "}
                    {loading ? "Procesando..." : "PAGAR AHORA"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutContent;
