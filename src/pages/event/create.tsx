// src/pages/event/create.tsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createEventFormSchema } from "@/modules/event/event.schema";
import type { z } from "zod";
import { trpc } from "@/utils/trpc";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

type CreateEventFormInput = z.infer<typeof createEventFormSchema>;
const CATEGORY_ID = "cmdt510590000iabptnrsobd4";

export default function CreateEventPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [ticketTypes, setTicketTypes] = useState([
    { title: "Pista", price: 50, stock: 100 },
  ]);

  const mutation = trpc.event.create.useMutation({
    onSuccess: () => router.push("/dashboard"),
    onError: (err) => {
      if (err.message.includes("Unique constraint failed on the fields: (`name`)")) {
        alert("Já existe um evento com esse nome. Escolha outro.");
      } else if (err.message.includes("Unique constraint failed on the fields: (`slug`)")) {
        alert("Já existe um evento com esse slug. Tente outro.");
      } else if (err.message.includes("Unique constraint failed on the fields: (`title`)")) {
        alert("Já existe uma categoria de ingresso com esse título. Use nomes diferentes.");
      } else {
        console.error("❌ Erro ao criar evento:", err);
        alert("Erro ao criar evento: " + err.message);
      }
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateEventFormInput>({
    resolver: zodResolver(createEventFormSchema),
    mode: "onTouched",
  });

  const watchAll = watch();
  useEffect(() => {
    console.log("👀 Form data:", watchAll);
  }, [watchAll]);

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("📋 Form errors:", errors);
    }
  }, [errors]);

  const hasDuplicateTitles = (tickets: typeof ticketTypes) => {
    const titles = tickets.map((t) => t.title.trim().toLowerCase());
    return new Set(titles).size !== titles.length;
  };

  const onSubmit = (formData: CreateEventFormInput) => {
    if (!session?.user?.id) {
      alert("Usuário não autenticado");
      return;
    }

    if (hasDuplicateTitles(ticketTypes)) {
      alert("Cada categoria de ingresso deve ter um nome único.");
      return;
    }

    if (ticketTypes.length === 0) {
      alert("Adicione ao menos uma categoria de ingresso.");
      return;
    }

    mutation.mutate({
      ...formData,
      userId: session.user.id,
      categoryIds: [CATEGORY_ID],
      ticketCategories: ticketTypes,
      status: "PUBLISHED",
      publishedAt: new Date(),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-lg bg-white p-6 shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">Criar Evento</h1>

        <form className="space-y-6">
          <Input label="Nome do Evento" name="name" register={register("name")} error={errors.name} placeholder="Ex: Festival de Inverno 2025" />
          <Input label="Descrição" name="description" register={register("description")} error={errors.description} placeholder="Ex: Um evento inesquecível" />
          <Input label="Slug" name="slug" register={register("slug")} error={errors.slug} placeholder="Ex: festival-inverno-2025" />
          <Input label="Local" name="location" register={register("location")} error={errors.location} placeholder="Ex: Auditório Municipal" />
          <Input label="Cidade" name="city" register={register("city")} error={errors.city} placeholder="Ex: São Paulo" />
          <Input label="Teatro" name="theater" register={register("theater")} error={errors.theater} placeholder="Ex: Teatro Central" />
          <Input label="Data do Evento" name="date" type="date" register={register("date")} error={errors.date} />
          <Input label="Início das Vendas" name="saleStart" type="date" register={register("saleStart")} error={errors.saleStart} />
          <Input label="Fim das Vendas" name="saleEnd" type="date" register={register("saleEnd")} error={errors.saleEnd} />
          <Input label="Preço Base" name="price" type="number" register={register("price", { valueAsNumber: true })} error={errors.price} placeholder="Ex: 50" />
          <Input label="Capacidade" name="capacity" type="number" register={register("capacity", { valueAsNumber: true })} error={errors.capacity} placeholder="Ex: 300" />

          <div>
            <p className="mb-1 font-medium text-gray-700">Categorias de Ingressos</p>

            {ticketTypes.map((ticket, i) => (
              <div key={i} className="mb-6 rounded border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome</label>
                    <input
                      type="text"
                      placeholder="Ex: VIP, Pista"
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
                      value={ticket.title}
                      onChange={(e) =>
                        setTicketTypes((prev) =>
                          prev.map((t, index) =>
                            index === i ? { ...t, title: e.target.value } : t
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Preço (R$)</label>
                    <input
                      type="number"
                      placeholder="Ex: 150"
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
                      value={ticket.price}
                      onChange={(e) =>
                        setTicketTypes((prev) =>
                          prev.map((t, index) =>
                            index === i ? { ...t, price: Number(e.target.value) } : t
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estoque</label>
                    <input
                      type="number"
                      placeholder="Ex: 200"
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
                      value={ticket.stock}
                      onChange={(e) =>
                        setTicketTypes((prev) =>
                          prev.map((t, index) =>
                            index === i ? { ...t, stock: Number(e.target.value) } : t
                          )
                        )
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTicketTypes((prev) => prev.filter((_, index) => index !== i))}
                  className="mt-2 text-sm text-red-600 hover:underline"
                >
                  Remover
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setTicketTypes((prev) => [...prev, { title: "", price: 0, stock: 0 }])}
              className="mt-2 rounded bg-primary-100 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-200"
            >
              + Adicionar Categoria
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              className="rounded-lg bg-primary-100 px-6 py-2 font-semibold text-white transition hover:bg-primary-200"
            >
              Criar e Publicar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface InputProps {
  label: string;
  name: keyof CreateEventFormInput;
  type?: "text" | "number" | "date";
  register: UseFormRegisterReturn;
  error?: FieldError;
  placeholder?: string;
}

const Input = ({ label, type = "text", register, error, placeholder }: InputProps) => (
  <div className="mb-4">
    <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
    <input
      {...register}
      type={type}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 px-3 py-2"
    />
    {error && <p className="text-sm text-red-600">{error.message}</p>}
  </div>
);
