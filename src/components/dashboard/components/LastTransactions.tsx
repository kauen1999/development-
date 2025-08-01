// src/components/dashboard/components/LastTransactions.tsx
import React from "react";

const LastTransactions = () => {
  return (
    <div className="mb-8 rounded-lg bg-white p-4 shadow sm:p-6 xl:p-8 ">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">
            Últimas transacciones
          </h3>
          <span className="text-base font-normal text-gray-500">
            Lista de las últimas transacciones
          </span>
        </div>
        <div className="flex-shrink-0">
          <a
            href="#"
            className="rounded-lg p-2 text-sm font-medium text-cyan-600 hover:bg-gray-100"
          >
            Ver todo
          </a>
        </div>
      </div>
      <div className="mt-8 flex flex-col">
        <div className="overflow-x-auto rounded-lg">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden shadow sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="p-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Transacción
                    </th>
                    <th
                      scope="col"
                      className="p-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Fecha y hora
                    </th>
                    <th
                      scope="col"
                      className="p-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Cantidad
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr>
                    <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-900">
                      Pago de{" "}
                      <span className="font-semibold">Bonnie Green</span>
                    </td>
                    <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-500">
                      Jun 23, 2023
                    </td>
                    <td className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900">
                      $23000
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="rounded-left whitespace-nowrap rounded-lg p-4 text-sm font-normal text-gray-900">
                      Reembolso del pago a{" "}
                      <span className="font-semibold">#00910</span>
                    </td>
                    <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-500">
                      Jun 23, 2023
                    </td>
                    <td className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900">
                      -$67000
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-900">
                      Pago fallido{" "}
                      <span className="font-semibold">#087651</span>
                    </td>
                    <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-500">
                      Jun 18, 2023
                    </td>
                    <td className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900">
                      $23400
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="rounded-left whitespace-nowrap rounded-lg p-4 text-sm font-normal text-gray-900">
                      Pago de <span className="font-semibold">Lana Byrd</span>
                    </td>
                    <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-500">
                      Jun 15, 2023
                    </td>
                    <td className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900">
                      $50000
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-900">
                      Pago de <span className="font-semibold">Jese Leos</span>
                    </td>
                    <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-500">
                      Jun 15, 2023
                    </td>
                    <td className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900">
                      $23000
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="rounded-left whitespace-nowrap rounded-lg p-4 text-sm font-normal text-gray-900">
                      Pago de{" "}
                      <span className="font-semibold">THEMESBERG LLC</span>
                    </td>
                    <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-500">
                      Jun 11, 2023
                    </td>
                    <td className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900">
                      $56000
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-900">
                      Pago de <span className="font-semibold">Lana Lysle</span>
                    </td>
                    <td className="whitespace-nowrap p-4 text-sm font-normal text-gray-500">
                      Jun 6, 2023{" "}
                    </td>
                    <td className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900">
                      $14370
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LastTransactions;
