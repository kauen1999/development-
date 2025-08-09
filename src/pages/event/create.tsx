// src/pages/event/create.tsx
import React, { useMemo, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { EventStatus, EventType } from "@prisma/client";
import { trpc } from "@/utils/trpc";
import { supabase } from "@/lib/supabaseClient";
import type { CreateEventInput } from "@/modules/event/event.schema";

const FIXED_TICKET_TYPES = ["Platea A", "Platea B", "Platea C", "Pullman"] as const;
type FixedType = (typeof FIXED_TICKET_TYPES)[number];

const baseFormSchema = z.object({
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

  capacity: z.number().int().min(1).max(100000),
});
type BaseFormInput = z.infer<typeof baseFormSchema>;

type SessionRow = { date: string; city: string; venueName: string };
type TicketRow = {
  title: string;
  price: number;     // valor numérico em ARS
  capacity: number;
};

// === Helpers de máscara ARS ===
const formatARS = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

/** Converte a string digitada (com símbolos/sep.) em número (em ARS) usando regra de “centavos”: 1234 => 12.34 */
const parseARSFromMasked = (input: string): number => {
  const digits = input.replace(/\D/g, ""); // só números
  if (!digits) return 0;
  const asNumber = Number(digits);
  return asNumber / 100; // últimos 2 dígitos = centavos
};

export default function CreateEventPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [eventType, setEventType] = useState<EventType>(EventType.GENERAL);

  const [sessions, setSessions] = useState<SessionRow[]>([
    { date: "", city: "", venueName: "" },
  ]);
  const [tickets, setTickets] = useState<TicketRow[]>([
    { title: "VIP", price: 0, capacity: 1 },
  ]);

  const [artistInput, setArtistInput] = useState("");
  const [artists, setArtists] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState("");

  const { data: categories = [] } = trpc.category.list.useQuery();

  const mutation = trpc.event.create.useMutation({
    onSuccess: () => router.push("/dashboard"),
  });

  const {
    register,
    getValues,
    formState: { errors },
  } = useForm<Omit<BaseFormInput, "image">>({
    resolver: zodResolver(baseFormSchema.omit({ image: true })),
    mode: "onTouched",
  });

  const inputClass =
    "w-full rounded border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-200 placeholder-gray-400";

  const resetTicketsFor = (type: EventType) => {
    if (type === EventType.GENERAL) {
      setTickets([{ title: "VIP", price: 0, capacity: 1 }]);
    } else {
      setTickets([{ title: "Platea A", price: 0, capacity: 1 }]);
    }
  };

  const uploadImage = async (): Promise<string | undefined> => {
    if (!imageFile) return imagePreview ?? undefined;
    const fileName = `${Date.now()}-${imageFile.name}`;
    const { error } = await supabase.storage.from("entrad-maestro").upload(fileName, imageFile);
    if (error) throw error;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/entrad-maestro/${fileName}`;
  };

  const totalTicketCapacity = useMemo(
    () => tickets.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0),
    [tickets]
  );
  const remainingCapacity = useMemo(() => {
    const raw = getValues();
    const cap = Number(raw.capacity || 0);
    return Math.max(cap - totalTicketCapacity, 0);
  }, [getValues, totalTicketCapacity]);

  // Sessões
  const addSession = () =>
    setSessions((prev) => [...prev, { date: "", city: "", venueName: "" }]);
  const removeSession = (idx: number) =>
    setSessions((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  // Entradas
  const addTicket = () =>
    setTickets((prev) => {
      if (eventType === EventType.GENERAL) {
        return [...prev, { title: "", price: 0, capacity: 1 }];
      }
      return [...prev, { title: "Platea A", price: 0, capacity: 1 }];
    });
  const removeTicket = (idx: number) =>
    setTickets((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  // Atualiza preço com máscara ARS
  const handlePriceChange = (idx: number, maskedValue: string) => {
    const value = parseARSFromMasked(maskedValue);
    setTickets((prev) => {
      const updated = [...prev];
      if (updated[idx]) updated[idx].price = value;
      return updated;
    });
  };

  // Submit
  const handleSubmit = async () => {
    if (!session?.user?.id) return alert("Usuario no autenticado");
    if (!categoryId) return alert("Categoría obligatoria");
    if (!tickets.length) return alert("Agregue al menos una entrada");
    if (!sessions.length) return alert("Agregue al menos una sesión");

    const base = getValues();
    const parsed = baseFormSchema.safeParse({ ...base, categoryId });
    if (!parsed.success) {
      console.error(parsed.error.flatten());
      return alert("Complete los campos obligatorios correctamente.");
    }

    if (totalTicketCapacity > base.capacity) {
      return alert(
        `La suma de las capacidades de las entradas (${totalTicketCapacity}) excede la capacidad del evento (${base.capacity}).`
      );
    }

    let image: string | undefined;
    try {
      image = await uploadImage();
    } catch {
      alert("Error al subir la imagen");
      return;
    }

    const ticketCategories: CreateEventInput["ticketCategories"] = tickets.map((t) => ({
      title: t.title,
      price: Number(t.price) || 0,        // valor numérico (sem máscara)
      capacity: Number(t.capacity) || 0,
    }));

    const payload: CreateEventInput = {
      ...parsed.data,
      image,
      categoryId,
      eventType,
      sessions: sessions.map((s) => ({
        date: new Date(s.date),
        city: s.city,
        venueName: s.venueName,
      })),
      ticketCategories,
      artists,
      userId: session.user.id,
      status: EventStatus.OPEN,
      publishedAt: new Date(),
    };

    mutation.mutate(payload);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-8 text-3xl font-bold text-gray-800">Crear evento</h1>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-10">
        {/* Información básica */}
        <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Información básica</h2>
          <input {...register("name")} placeholder="Nombre del evento" className={inputClass} />
          <input {...register("description")} placeholder="Descripción" className={inputClass} />
          <input {...register("slug")} placeholder="Slug (URL amigable)" className={inputClass} />
          {errors.slug && <p className="text-sm text-red-600">Slug inválido</p>}
        </div>

        {/* Tipo de evento */}
        <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Tipo de evento</h2>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={eventType === EventType.GENERAL}
                onChange={() => {
                  setEventType(EventType.GENERAL);
                  resetTicketsFor(EventType.GENERAL);
                }}
                aria-label="Evento general (sin asientos)"
              />
              <span>General (sin asientos)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={eventType === EventType.SEATED}
                onChange={() => {
                  setEventType(EventType.SEATED);
                  resetTicketsFor(EventType.SEATED);
                }}
                aria-label="Evento con asientos"
              />
              <span>Con asientos</span>
            </label>
          </div>
        </div>

        {/* Información del evento */}
        <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Información del evento</h2>

          {/* Artistas */}
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
            placeholder="Capacidad del evento"
            className={inputClass}
          />
          <p className="text-sm text-gray-500">
            Capacidad restante distribuible: <b>{remainingCapacity}</b>
          </p>
        </div>

        {/* Ubicación */}
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

        {/* Categoría */}
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

        {/* Imagen del evento */}
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

        {/* Sesiones */}
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
              <div className="flex items-start gap-2 min-w-0">
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
                  className={`${inputClass} min-w-0`}
                />
                <button
                  type="button"
                  onClick={() => removeSession(i)}
                  disabled={sessions.length === 1}
                  className="shrink-0 whitespace-nowrap rounded border px-3 py-2 text-sm text-red-600 disabled:cursor-not-allowed disabled:opacity-50 min-w-[96px]"
                  title={sessions.length === 1 ? "Debe haber al menos 1 sesión" : "Eliminar sesión"}
                  aria-label="Eliminar sesión"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addSession} className="text-sm text-blue-600 underline">
            + Agregar sesión
          </button>
        </div>

        {/* Entradas */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Entradas</h2>

          {tickets.map((t, i) => (
            <div key={i} className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {eventType === EventType.GENERAL ? (
                <input
                  placeholder="Nombre de la categoría (VIP, Pista, etc.)"
                  value={t.title}
                  onChange={(e) =>
                    setTickets((prev) => {
                      const updated = [...prev];
                      if (updated[i]) updated[i].title = e.target.value;
                      return updated;
                    })
                  }
                  className={inputClass}
                />
              ) : (
                <select
                  value={t.title}
                  onChange={(e) =>
                    setTickets((prev) => {
                      const updated = [...prev];
                      if (updated[i]) updated[i].title = e.target.value as FixedType;
                      return updated;
                    })
                  }
                  className={inputClass}
                >
                  {FIXED_TICKET_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              )}

              {/* Precio (ARS) com máscara */}
              <input
                type="text"
                inputMode="numeric"
                placeholder="Precio (ARS)"
                value={t.price > 0 ? formatARS(t.price) : ""}
                onChange={(e) => handlePriceChange(i, e.target.value)}
                className={inputClass}
              />

              <div className="flex items-start gap-2 min-w-0">
                <input
                  type="number"
                  placeholder="Cantidad"
                  value={t.capacity || ""}
                  onChange={(e) =>
                    setTickets((prev) => {
                      const updated = [...prev];
                      if (updated[i]) updated[i].capacity = Math.max(0, Number(e.target.value));
                      return updated;
                    })
                  }
                  className={`${inputClass} min-w-0`}
                />
                <button
                  type="button"
                  onClick={() => removeTicket(i)}
                  disabled={tickets.length === 1}
                  className="shrink-0 whitespace-nowrap rounded border px-3 py-2 text-sm text-red-600 disabled:cursor-not-allowed disabled:opacity-50 min-w-[96px]"
                  title={tickets.length === 1 ? "Debe haber al menos 1 entrada" : "Eliminar entrada"}
                  aria-label="Eliminar entrada"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-4">
            <button type="button" onClick={addTicket} className="text-sm text-blue-600 underline">
              + Agregar entrada
            </button>
            <span className="text-sm text-gray-500">
              Capacidad total de entradas: <b>{totalTicketCapacity}</b>
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            className="hover:bg-primary-200 rounded bg-primary-100 px-6 py-3 font-semibold text-white transition"
          >
            Crear evento
          </button>
        </div>
      </form>
    </div>
  );
}
