// src/pages/event/create.tsx
import React, { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { EventStatus } from "@prisma/client";
import { trpc } from "@/utils/trpc";
import { supabase } from "@/lib/supabaseClient";

const FIXED_TICKET_TYPES = ["Platea A", "Platea B", "Platea C", "Pullman"] as const;
type FixedType = (typeof FIXED_TICKET_TYPES)[number];

const eventSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  slug: z.string().min(1),
  street: z.string(),
  number: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  venueName: z.string(),
  image: z.string().optional(),
  categoryId: z.string().min(1),
  capacity: z.number().min(1).max(150),
  sessions: z.array(
    z.object({
      date: z.string().min(1),
      city: z.string().min(1),
      venueName: z.string().min(1),
    })
  ),
  ticketCategories: z.array(
    z.object({
      title: z.enum(FIXED_TICKET_TYPES),
      price: z.number().min(1),
    })
  ),
});

type EventFormInput = z.infer<typeof eventSchema>;

export default function CreateEventPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [sessions, setSessions] = useState<EventFormInput["sessions"]>([
    { date: "", city: "", venueName: "" },
  ]);
  const [tickets, setTickets] = useState<EventFormInput["ticketCategories"]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState("");

  const { data: categories = [] } = trpc.category.list.useQuery();

  const mutation = trpc.event.create.useMutation({
    onSuccess: () => {
      router.push("/dashboard");
    },
  });

  const { register, getValues } = useForm<
    Omit<EventFormInput, "sessions" | "ticketCategories" | "image">
  >({
    resolver: zodResolver(
      eventSchema.omit({ sessions: true, ticketCategories: true, image: true })
    ),
    mode: "onTouched",
  });

  const uploadImage = async (): Promise<string | undefined> => {
    if (!imageFile) return imagePreview ?? undefined;
    const fileName = `${Date.now()}-${imageFile.name}`;
    const { error } = await supabase.storage
      .from("event-images")
      .upload(fileName, imageFile);
    if (error) throw error;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-images/${fileName}`;
  };

  const handleSubmit = async () => {
    if (!session?.user?.id) return alert("Usuário não autenticado");
    if (!categoryId) return alert("Categoria obrigatória");
    if (!tickets.length) return alert("Adicione pelo menos um tipo de ingresso");

    const raw = getValues();
    let image: string | undefined = undefined;

    try {
      image = await uploadImage();
    } catch {
      alert("Erro ao subir imagem");
      return;
    }

    const payload: EventFormInput = {
      ...raw,
      categoryId,
      image,
      sessions,
      ticketCategories: tickets,
    };

    try {
      eventSchema.parse(payload);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error("Erro de validação:", err.flatten());
        alert("Preencha todos os campos obrigatórios corretamente.");
      } else {
        console.error("Erro desconhecido:", err);
      }
      return;
    }

    mutation.mutate({
      ...payload,
      userId: session.user.id,
      status: EventStatus.OPEN,
      publishedAt: new Date(),
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Criar Evento</h1>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <input {...register("name")} placeholder="Nome do evento" className="input" />
        <input {...register("description")} placeholder="Descrição" className="input" />
        <input {...register("slug")} placeholder="Slug" className="input" />
        <input {...register("street")} placeholder="Rua" className="input" />
        <input {...register("number")} placeholder="Número" className="input" />
        <input {...register("neighborhood")} placeholder="Bairro" className="input" />
        <input {...register("city")} placeholder="Cidade" className="input" />
        <input {...register("state")} placeholder="Estado" className="input" />
        <input {...register("zipCode")} placeholder="CEP" className="input" />
        <input {...register("venueName")} placeholder="Local" className="input" />
        <input {...register("capacity", { valueAsNumber: true })} type="number" placeholder="Capacidade (1 a 150)" className="input" />

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="input"
        >
          <option value="">Selecione categoria</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.title}
            </option>
          ))}
        </select>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setImageFile(file);
              setImagePreview(URL.createObjectURL(file));
            }
          }}
          className="input"
        />
        {imagePreview && (
          <div className="h-48 relative">
            <Image src={imagePreview} alt="Preview" fill className="object-cover rounded" />
          </div>
        )}

        <div>
          <p className="font-semibold mb-2">Sessões</p>
          {sessions.map((s, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 mb-2">
              <input
                type="date"
                className="input"
                value={sessions[i]?.date ?? ""}
                onChange={(e) => {
                  setSessions((prev) => {
                    const updated = [...prev];
                    if (updated[i]) updated[i].date = e.target.value;
                    return updated;
                  });
                }}
              />
              <input
                placeholder="Cidade"
                className="input"
                value={sessions[i]?.city ?? ""}
                onChange={(e) => {
                  setSessions((prev) => {
                    const updated = [...prev];
                    if (updated[i]) updated[i].city = e.target.value;
                    return updated;
                  });
                }}
              />
              <input
                placeholder="Local"
                className="input"
                value={sessions[i]?.venueName ?? ""}
                onChange={(e) => {
                  setSessions((prev) => {
                    const updated = [...prev];
                    if (updated[i]) updated[i].venueName = e.target.value;
                    return updated;
                  });
                }}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setSessions((prev) => [...prev, { date: "", city: "", venueName: "" }])
            }
            className="text-sm text-blue-600 underline mt-2"
          >
            + Adicionar sessão
          </button>
        </div>

        <div>
          <p className="font-semibold mb-2">Ingressos</p>
          {tickets.map((ticket, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <select
                className="input"
                value={tickets[i]?.title ?? "Platea A"}
                onChange={(e) => {
                  setTickets((prev) => {
                    const updated = [...prev];
                    if (updated[i]) updated[i].title = e.target.value as FixedType;
                    return updated;
                  });
                }}
              >
                {FIXED_TICKET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="input"
                value={tickets[i]?.price ?? ""}
                onChange={(e) => {
                  setTickets((prev) => {
                    const updated = [...prev];
                    if (updated[i]) updated[i].price = Number(e.target.value);
                    return updated;
                  });
                }}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setTickets((prev) => [...prev, { title: "Platea A", price: 0 }])
            }
            className="text-sm text-blue-600 underline mt-2"
          >
            + Adicionar ingresso
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-primary-100 text-white font-semibold px-6 py-2 rounded hover:bg-primary-200"
          >
            Criar Evento
          </button>
        </div>
      </form>
    </div>
  );
}
