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
      quantity: z.number().min(0),
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
  const [artistInput, setArtistInput] = useState("");
  const [artists, setArtists] = useState<string[]>([]);
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
    resolver: zodResolver(eventSchema.omit({ sessions: true, ticketCategories: true, image: true })),
    mode: "onTouched",
  });

  const inputClass =
    "w-full rounded border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-200 placeholder-gray-400";

  const uploadImage = async (): Promise<string | undefined> => {
    if (!imageFile) return imagePreview ?? undefined;
    const fileName = `${Date.now()}-${imageFile.name}`;
    const { error } = await supabase.storage.from("entrad-maestro").upload(fileName, imageFile);
    if (error) throw error;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/entrad-maestro/${fileName}`;
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
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-8 text-3xl font-bold text-gray-800">Crear evento</h1>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-10">
        <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Información básica</h2>
          <input {...register("name")} placeholder="Nombre del evento" className={inputClass} />
          <input {...register("description")} placeholder="Descripción" className={inputClass} />
          <input {...register("slug")} placeholder="Slug (URL amigable)" className={inputClass} />
        </div>

        <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Información del evento</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={artistInput}
              onChange={(e) => setArtistInput(e.target.value)}
              placeholder="Nombre del artista"
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={() => {
                if (!artistInput.trim()) return;
                setArtists((prev) => [...prev, artistInput.trim()]);
                setArtistInput("");
              }}
              className="hover:bg-primary-200 rounded bg-primary-100 px-4 py-2 text-white"
            >
              Agregar
            </button>
          </div>

          {artists.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {artists.map((name, i) => (
                <span key={i} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-800">
                  {name}
                </span>
              ))}
            </div>
          )}

          <input {...register("venueName")} placeholder="Lugar del evento" className={inputClass} />
          <input
            {...register("capacity", { valueAsNumber: true })}
            type="number"
            placeholder="Capacidad (1 a 150)"
            className={inputClass}
          />
        </div>

        <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Ubicación</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input {...register("street")} placeholder="Calle" className={inputClass} />
            <input {...register("number")} placeholder="Número" className={inputClass} />
            <input {...register("neighborhood")} placeholder="Barrio" className={inputClass} />
            <input {...register("city")} placeholder="Ciudad" className={inputClass} />
            <input {...register("state")} placeholder="Estado" className={inputClass} />
            <input {...register("zipCode")} placeholder="Código Postal" className={inputClass} />
          </div>
        </div>

        <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Categoría</h2>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
          >
            <option value="">Seleccione una categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.title}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Imagen del evento</h2>
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
            className={inputClass}
          />
          {imagePreview && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-gray-500">Vista previa:</p>
              <div className="relative h-64 w-full overflow-hidden rounded">
                <Image src={imagePreview} alt="Preview" fill className="object-cover" />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Sesiones</h2>
          {sessions.map((s, i) => (
            <div key={i} className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <input
                type="date"
                value={s.date}
                onChange={(e) => {
                  setSessions((prev) => {
                    const updated = [...prev];
                    if (updated[i]) updated[i].date = e.target.value;
                    return updated;
                  });
                }}
                className={inputClass}
              />
              <input
                placeholder="Ciudad"
                value={s.city}
                onChange={(e) => {
                  setSessions((prev) => {
                    const updated = [...prev];
                    if (updated[i]) updated[i].city = e.target.value;
                    return updated;
                  });
                }}
                className={inputClass}
              />
              <input
                placeholder="Local"
                value={s.venueName}
                onChange={(e) => {
                  setSessions((prev) => {
                    const updated = [...prev];
                    if (updated[i]) updated[i].venueName = e.target.value;
                    return updated;
                  });
                }}
                className={inputClass}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setSessions((prev) => [...prev, { date: "", city: "", venueName: "" }])
            }
            className="text-sm text-blue-600 underline"
          >
            + Agregar sesión
          </button>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Ingressos</h2>
          {tickets.map((ticket, i) => (
            <div key={i} className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <select
                value={ticket.title}
                onChange={(e) => {
                  setTickets((prev) => {
                    const updated = [...prev];
                    if (updated[i]) updated[i].title = e.target.value as FixedType;
                    return updated;
                  });
                }}
                className={inputClass}
              >
                {FIXED_TICKET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Cantidad"
                value={ticket.quantity || ""}
                onChange={(e) => {
                  setTickets((prev) => {
                    const updated = [...prev];
                    if (updated[i]) updated[i].quantity = Math.max(0, Number(e.target.value));
                    return updated;
                  });
                }}
                className={inputClass}
              />

              <input
                type="number"
                value={ticket.price === 0 ? "" : ticket.price}
                onChange={(e) => {
                  setTickets((prev) => {
                    const updated = [...prev];
                    if (updated[i]) updated[i].price = e.target.value === "" ? 0 : Number(e.target.value);
                    return updated;
                  });
                }}
                placeholder="Precio"
                className={inputClass}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setTickets((prev) => [
                ...prev,
                { title: "Platea A", price: "" as unknown as number, quantity: 1 },
              ])
            }
            className="text-sm text-blue-600 underline"
          >
            + Agregar Entrada
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            className="hover:bg-primary-200 rounded bg-primary-100 px-6 py-3 font-semibold text-white transition"
          >
            Crear Evento
          </button>
        </div>
      </form>
    </div>
  );
}
