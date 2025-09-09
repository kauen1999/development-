// src/components/forms/EventForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { trpc } from "@/utils/trpc";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import type { SessionTicketingType } from "@prisma/client";

// ───────────────── Helpers ─────────────────
function parseDateOnlyToDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
function parseDateTimeLocal(value: string): Date | null {
  if (!value) return null;
  const iso = `${value}:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
async function uploadToSupabase(file: File, folder = "artists"): Promise<string> {
  const supabase = getBrowserSupabase();
  const bucket = "entrad-maestro";
  const sanitized = file.name.replace(/\s+/g, "-").toLowerCase();
  const fileName = `${Date.now()}-${sanitized}`;
  const path = `${folder}/${fileName}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicData.publicUrl;
}

// ───────────────── Esquemas ─────────────────
const eventFormSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    description: z.string().min(1, "La descripción es obligatoria"),
    categoryId: z.string().cuid("Categoría inválida"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.startDate && d.endDate) return new Date(d.startDate) <= new Date(d.endDate);
      return true;
    },
    { path: ["endDate"], message: "La fecha de fin no puede ser anterior a la fecha de inicio" }
  );

type EventFormInput = z.infer<typeof eventFormSchema>;

// ───────────────── Tipos para sessões ─────────────────
type GeneralCategoryRow = { title: string; price: number; capacity: number };
type SeatedRowSpec = { name: string; seatCount: number };
type SeatedSectorSpec = { name: string; price: number; rows: SeatedRowSpec[] };

type BaseSessionFields = {
  dateTimeLocal: string;
  durationMin: number;
  venueName: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  // artistas (nomes) + banners (url por nome)
  artists: string[];
  artistBanners: Record<string, string>;
};

type SessionRow =
  | ({
      ticketingType: "GENERAL";
      categories: GeneralCategoryRow[];
    } & BaseSessionFields)
  | ({
      ticketingType: "SEATED";
      sectors: SeatedSectorSpec[];
    } & BaseSessionFields);

// ───────────────── Tipos de edição ─────────────────

interface EditableSession {
  id: string;
  dateTimeStart: string | Date;
  durationMin: number;
  timezone?: string | null;
  venueName: string;
  street: string;
  number: string;
  neighborhood?: string | null;
  city: string;
  state: string;
  zip: string;
  ticketingType: "GENERAL" | "SEATED";
  ticketCategories: Array<{ title: string; price: number; capacity: number }>;
  // ✅ aqui sim fica o campo dos artistas
  artists?: { artist: { name: string; image?: string | null } }[];
}


interface EditableEvent {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  image?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  sessions?: EditableSession[];
}

// ───────────────── Props ─────────────────
interface EventFormProps {
  mode: "create" | "edit";
  event?: EditableEvent;
  onSuccess?: (id: string) => void;
}

// ───────────────── Subcomponente: ArtistPicker (+ Banner) ─────────────────
type ArtistPickerProps = {
  selected: string[];
  banners: Record<string, string>;
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  onBannerChange: (name: string, url: string) => void;
  userId?: string;
};

function ArtistPicker({
  selected,
  banners,
  onAdd,
  onRemove,
  onBannerChange,
  userId,
}: ArtistPickerProps) {
  const [q, setQ] = useState<string>("");

  const { data: results = [] } = trpc.artist.search.useQuery(
    { q },
    { enabled: q.trim().length >= 2, keepPreviousData: true, staleTime: 30_000 }
  );

  const createLocalArtistMutation = trpc.artist.createLocal.useMutation();
  // opcional: se existir no backend (se não existir, apenas não use)
  const updateArtistImageMutation = trpc.artist.updateImage.useMutation();


  const createLocal = async (maybeFile?: File, maybeUrl?: string) => {
    const name = q.trim();
    if (!name) return;
    if (!userId) {
      alert("Usuario no autenticado");
      return;
    }

    try {
      let imageUrl = maybeUrl?.trim() ?? "";
      if (!imageUrl && maybeFile) {
        imageUrl = await uploadToSupabase(maybeFile, "artist-banners");
      }

      // cria o artista local (somente com nome)
      await createLocalArtistMutation.mutateAsync({ name, createdByUserId: userId });

      // se houver URL de imagem e existir mutação de updateImage, atualiza
      if (imageUrl && updateArtistImageMutation) {
        await updateArtistImageMutation.mutateAsync({ name, image: imageUrl });
      }

      onAdd(name);
      if (imageUrl) onBannerChange(name, imageUrl);
      setQ("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al crear artista local.";
      alert(msg);
    }
  };

  // UI
  return (
    <div className="mb-6">
      <h4 className="mb-2 font-semibold text-gray-700">Artistas</h4>

      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((name) => (
            <span key={name} className="inline-flex items-center rounded-full border px-3 py-1 text-sm">
              {name}
              <button
                type="button"
                className="ml-2 text-red-600"
                onClick={() => onRemove(name)}
                aria-label={`Quitar ${name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Buscar/crear */}
      <div className="relative">
        <label className="block text-sm text-gray-700 mb-1">Buscar o crear artista</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Escribe el nombre del artista…"
          className="w-full rounded border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-200 placeholder-gray-400"
        />
        {q.trim().length >= 2 && results.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded border bg-white shadow">
            {results.map(
              (a: { id: string; name: string; image?: string | null; isGlobal?: boolean }) => (
                <button
                  key={a.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                  onClick={() => {
                    onAdd(a.name);
                    if (a.image) {
                      onBannerChange(a.name, a.image);
                    }
                    setQ("");
                  }}
                >
                  {a.image && (
                    <Image
                      src={a.image}
                      alt={a.name}
                      width={24}   // equivalente a h-6
                      height={24}  // equivalente a w-6
                      className="rounded-full object-cover"
                    />
                  )}

                  <span>
                    {a.name} {a.isGlobal ? "(global)" : "(local)"}
                  </span>
                </button>
              )
            )}

          </div>
        )}
      </div>

      {/* Crear rápido con banner */}
      {q.trim().length >= 2 && (
        <CreateArtistQuick
          queryName={q.trim()}
          onCreate={(file, url) => createLocal(file, url)}
          isLoading={!!createLocalArtistMutation.isLoading}
          isDisabled={!userId}
        />
      )}

      {/* Editor de banner por artista seleccionado */}
      {selected.length > 0 && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 font-medium">Banner por artista (opcional)</p>
          {selected.map((name) => (
            <ArtistBannerEditor
              key={name}
              artistName={name}
              value={banners[name] ?? ""}
              onChange={onBannerChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Componente: criar artista rapidamente com banner (arquivo ou URL)
function CreateArtistQuick({
  queryName,
  onCreate,
  isLoading,
  isDisabled,
}: {
  queryName: string;
  onCreate: (file?: File, url?: string) => void;
  isLoading: boolean;
  isDisabled: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string>("");

  return (
    <div className="mt-2 rounded border p-3">
      <p className="text-sm text-gray-700 mb-2">
        Crear artista local “<strong>{queryName}</strong>” con banner (opcional)
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Subir archivo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0] ?? null;
              setFile(f);
            }}
            className="w-full rounded border px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">O pegar URL pública</label>
          <input
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded border px-4 py-2"
          />
        </div>
      </div>

      <div className="mt-2">
        <button
          type="button"
          onClick={() => onCreate(file ?? undefined, url.trim() || undefined)}
          disabled={isLoading || isDisabled}
          className="rounded bg-primary-100 px-4 py-2 text-white hover:bg-primary-200 disabled:cursor-not-allowed disabled:opacity-60"
          title={!isDisabled ? "Crear artista" : "Requiere autenticación"}
        >
          {isLoading ? "Creando…" : "Crear artista"}
        </button>
      </div>
    </div>
  );
}

// Componente: editor do banner de um artista já selecionado
function ArtistBannerEditor({
  artistName,
  value,
  onChange,
}: {
  artistName: string;
  value: string;
  onChange: (name: string, url: string) => void;
}) {
  const [preview, setPreview] = useState<string>(value);

  // ✅ mantém preview sincronizado sempre que o value mudar
  useEffect(() => {
    if (value && value.trim().length > 0) {
      setPreview(value);
    }
  }, [value]);


  // upload imediato para supabase ao escolher arquivo
  const onPickFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const url = await uploadToSupabase(file, "artist-banners");
      onChange(artistName, url);
      setPreview(url);
    } catch {
      alert("Error al subir el banner del artista");
    }
  };

  return (
    <div className="rounded border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{artistName}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-700 mb-1">URL del banner</label>
          <input
            type="url"
            placeholder="https://…"
            value={value}
            onChange={(e) => onChange(artistName, e.target.value)}
            className="w-full rounded border px-4 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            Puede pegar un URL público o subir un archivo. Al subir, se genera un URL público del Supabase.
          </p>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Subir archivo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onPickFile(e.currentTarget.files?.[0] ?? null)}
            className="w-full rounded border px-4 py-2"
          />
        </div>
      </div>

      {preview && (
        <div className="mt-3">
          <p className="mb-1 text-xs text-gray-500">Vista previa:</p>
          <div className="relative h-40 w-full overflow-hidden rounded">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={`Banner de ${artistName}`} className="h-full w-full object-cover" />
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────── Formulário ─────────────────
export default function EventForm({ mode, event, onSuccess }: EventFormProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const { data: categories = [] } = trpc.eventCategory.list.useQuery();

  const createEventMutation = trpc.event.create.useMutation();
  const updateEventMutation = trpc.event.update.useMutation();
  const createSessionMutation = trpc.session.create.useMutation();
  const attachArtistsMutation = trpc.session.attachArtists.useMutation();
  const updateEventGraphMutation = trpc.event.updateWithGraph.useMutation();
  // opcional: atualizar a imagem do artista, se existir no seu backend
  const updateArtistImageMutation = trpc.artist.updateImage.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EventFormInput>({
    resolver: zodResolver(eventFormSchema),
    mode: "onTouched",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const uploadEventImage = async (): Promise<string | undefined> => {
    if (!imageFile) return event?.image ?? undefined;
    return uploadToSupabase(imageFile, "event-banners");
  };

  const makeEmptyGeneral = (): SessionRow => ({
    ticketingType: "GENERAL",
    dateTimeLocal: "",
    durationMin: 120,
    venueName: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    zip: "",
    categories: [{ title: "", price: 0, capacity: 0 }],
    artists: [],
    artistBanners: {},
  });

  const initialEditSessions: SessionRow[] = useMemo(() => {
    if (mode !== "edit" || !event?.sessions || event.sessions.length === 0) return [makeEmptyGeneral()];

    const toLocal = (dt: string | Date) => {
      const d = new Date(dt);
      if (Number.isNaN(d.getTime())) return "";
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
        d.getMinutes()
      )}`;
    };

    const artistNamesFrom = (
        arr?: { artist: { name: string; image?: string | null } }[]
      ): string[] => {
        if (!arr || arr.length === 0) return [];
        return arr
          .map((a) => a.artist?.name ?? "")
          .filter((n): n is string => n.trim().length > 0);
      };

      const artistBannersFrom = (
          arr?: { artist: { name: string; image?: string | null } }[]
        ): Record<string, string> => {
          if (!arr || arr.length === 0) return {};
          const out: Record<string, string> = {};
          arr.forEach((a) => {
            if (a.artist?.name) {
              // ✅ se o artista já tem imagem no banco, usa
              if (a.artist.image && a.artist.image.trim().length > 0) {
                out[a.artist.name] = a.artist.image;
              } else {
                out[a.artist.name] = ""; // se não tiver, mantém vazio para edição manual
              }
            }
          });
          console.log("DEBUG artistBannersFrom:", out);
          return out;
        };



    return event.sessions.map<SessionRow>((s) => {
      const base = {
        dateTimeLocal: toLocal(s.dateTimeStart),
        durationMin: s.durationMin,
        venueName: s.venueName,
        street: s.street,
        number: s.number,
        neighborhood: s.neighborhood ?? "",
        city: s.city,
        state: s.state,
        zip: s.zip,
        artists: artistNamesFrom(s.artists),
        artistBanners: artistBannersFrom(s.artists),
      };

      if (s.ticketingType === "SEATED") {
        const sectors: SeatedSectorSpec[] =
          s.ticketCategories.length > 0
            ? s.ticketCategories.map((c, i) => ({
                name: c.title || `Sector ${i + 1}`,
                price: c.price,
                rows: [{ name: "A", seatCount: 0 }],
              }))
            : [{ name: "Sector 1", price: 0, rows: [{ name: "A", seatCount: 0 }] }];

        return { ticketingType: "SEATED", sectors, ...base };
      }

      const categories: GeneralCategoryRow[] =
        s.ticketingType === "GENERAL" && s.ticketCategories.length > 0
          ? s.ticketCategories.map((c) => ({ title: c.title, price: c.price, capacity: c.capacity }))
          : [{ title: "", price: 0, capacity: 0 }];

      return { ticketingType: "GENERAL", categories, ...base };
    });
  }, [mode, event]);

  const [sessions, setSessions] = useState<SessionRow[]>(
    mode === "edit" ? initialEditSessions : [makeEmptyGeneral()]
  );

  useEffect(() => {
    if (mode === "edit" && event) {
      reset({
        name: event.name,
        description: event.description ?? "",
        categoryId: event.categoryId,
        startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 10) : "",
        endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 10) : "",
      });
      setImagePreview(event.image ?? null);
      setSessions(initialEditSessions);
    }
  }, [mode, event, reset, initialEditSessions]);

  const addSession = () => setSessions((prev) => [...prev, makeEmptyGeneral()]);
  const removeSession = (idx: number) =>
    setSessions((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  // ───── Atualizadores base ─────
  function updateBaseField<K extends keyof BaseSessionFields>(sIdx: number, key: K, value: BaseSessionFields[K]) {
    setSessions((prev) => prev.map((s, i) => (i === sIdx ? ({ ...s, [key]: value } as SessionRow) : s)));
  }
  function updateArtistBanner(sIdx: number, name: string, url: string) {
    setSessions((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx) return s;
        const next = { ...s.artistBanners, [name]: url };
        return { ...s, artistBanners: next };
      })
    );
  }

  // ───── Switch GENERAL/SEATED ─────
  function switchToGeneral(sIdx: number) {
    setSessions((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx) return s;
        const categoriesFromSectors: GeneralCategoryRow[] =
          s.ticketingType === "SEATED"
            ? s.sectors.map((sec) => ({ title: sec.name, price: sec.price, capacity: 0 }))
            : s.categories;
        const next: SessionRow = {
          ticketingType: "GENERAL",
          dateTimeLocal: s.dateTimeLocal,
          durationMin: s.durationMin,
          venueName: s.venueName,
          street: s.street,
          number: s.number,
          neighborhood: s.neighborhood,
          city: s.city,
          state: s.state,
          zip: s.zip,
          categories: categoriesFromSectors.length ? categoriesFromSectors : [{ title: "", price: 0, capacity: 0 }],
          artists: s.artists,
          artistBanners: s.artistBanners,
        };
        return next;
      })
    );
  }
  function switchToSeated(sIdx: number) {
    setSessions((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx) return s;
        const sectorsFromCategories: SeatedSectorSpec[] =
          s.ticketingType === "GENERAL"
            ? s.categories.map((c, idx) => ({
                name: c.title || `Sector ${idx + 1}`,
                price: c.price,
                rows: [{ name: "A", seatCount: 0 }],
              }))
            : s.sectors;
        const next: SessionRow = {
          ticketingType: "SEATED",
          dateTimeLocal: s.dateTimeLocal,
          durationMin: s.durationMin,
          venueName: s.venueName,
          street: s.street,
          number: s.number,
          neighborhood: s.neighborhood,
          city: s.city,
          state: s.state,
          zip: s.zip,
          sectors: sectorsFromCategories.length
            ? sectorsFromCategories
            : [{ name: "Sector 1", price: 0, rows: [{ name: "A", seatCount: 0 }] }],
          artists: s.artists,
          artistBanners: s.artistBanners,
        };
        return next;
      })
    );
  }

  // ───── Editores de categorias/sectores/filas ─────
  function updateCategoryField<K extends keyof GeneralCategoryRow>(
    sIdx: number,
    cIdx: number,
    key: K,
    value: GeneralCategoryRow[K]
  ) {
    setSessions((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx || s.ticketingType !== "GENERAL") return s;
        if (cIdx < 0 || cIdx >= s.categories.length) return s;
        const nextCats = s.categories.map((c, j) => (j === cIdx ? { ...c, [key]: value } : c));
        return { ...s, categories: nextCats };
      })
    );
  }
  function addCategory(sIdx: number) {
    setSessions((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx || s.ticketingType !== "GENERAL") return s;
        return { ...s, categories: [...s.categories, { title: "", price: 0, capacity: 0 }] };
      })
    );
  }
  function removeCategory(sIdx: number, cIdx: number) {
    setSessions((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx || s.ticketingType !== "GENERAL") return s;
        if (s.categories.length <= 1) return s;
        return { ...s, categories: s.categories.filter((_, j) => j !== cIdx) };
      })
    );
  }

  function addSector(sIdx: number) {
    setSessions((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx || s.ticketingType !== "SEATED") return s;
        return {
          ...s,
          sectors: [...s.sectors, { name: `Sector ${s.sectors.length + 1}`, price: 0, rows: [{ name: "A", seatCount: 0 }] }],
        };
      })
    );
  }
  function removeSector(sIdx: number, secIdx: number) {
    setSessions((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx || s.ticketingType !== "SEATED") return s;
        if (s.sectors.length <= 1) return s;
        return { ...s, sectors: s.sectors.filter((_, j) => j !== secIdx) };
      })
    );
  }
  function updateSectorField<K extends keyof SeatedSectorSpec>(
    sIdx: number,
    secIdx: number,
    key: K,
    value: SeatedSectorSpec[K]
  ) {
    setSessions((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx || s.ticketingType !== "SEATED") return s;
        if (secIdx < 0 || secIdx >= s.sectors.length) return s;
        const nextSecs = s.sectors.map((sec, j) => (j === secIdx ? { ...sec, [key]: value } : sec));
        return { ...s, sectors: nextSecs };
      })
    );
  }
  function addRowToSector(sIdx: number, secIdx: number) {
    setSessions((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx || s.ticketingType !== "SEATED") return s;
        const nextSecs = s.sectors.map((sec, j) =>
          j === secIdx
            ? { ...sec, rows: [...sec.rows, { name: String.fromCharCode(65 + sec.rows.length), seatCount: 0 }] }
            : sec
        );
        return { ...s, sectors: nextSecs };
      })
    );
  }
  function removeRowFromSector(sIdx: number, secIdx: number, rowIdx: number) {
    setSessions((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx || s.ticketingType !== "SEATED") return s;
        const sec = s.sectors[secIdx];
        if (!sec || sec.rows.length <= 1) return s;
        const nextSecs = s.sectors.map((curr, j) =>
          j === secIdx ? { ...curr, rows: curr.rows.filter((_, k) => k !== rowIdx) } : curr
        );
        return { ...s, sectors: nextSecs };
      })
    );
  }
  function updateRowField(
    sIdx: number,
    secIdx: number,
    rowIdx: number,
    key: keyof SeatedRowSpec,
    value: SeatedRowSpec[typeof key]
  ) {
    setSessions((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx || s.ticketingType !== "SEATED") return s;
        const sec = s.sectors[secIdx];
        if (!sec || rowIdx < 0 || rowIdx >= sec.rows.length) return s;
        const nextSecs = s.sectors.map((curr, j) => {
          if (j !== secIdx) return curr;
          const nextRows = curr.rows.map((r, k) => (k === rowIdx ? { ...r, [key]: value } : r));
          return { ...curr, rows: nextRows };
        });
        return { ...s, sectors: nextSecs };
      })
    );
  }

  // ───────────────── Submit ─────────────────
  const onSubmit = async (data: EventFormInput) => {
    if (!session?.user?.id) {
      alert("Usuario no autenticado");
      return;
    }

    if (sessions.length === 0) {
      alert("Agregue al menos una sesión.");
      return;
    }
    for (const s of sessions) {
      if (!s.dateTimeLocal) {
        alert("Complete la fecha y hora de todas las sesiones.");
        return;
      }
      if (s.ticketingType === "GENERAL") {
        const ok = s.categories.some((c) => c.title.trim().length > 0 && c.price > 0);
        if (!ok) {
          alert("Cada sesión (GENERAL) debe tener al menos una categoría válida (nombre y precio).");
          return;
        }
      } else {
        const ok = s.sectors.some((sec) => sec.name.trim().length > 0 && sec.price > 0);
        if (!ok) {
          alert("Cada sesión (SEATED) debe tener al menos un sector con nombre y precio.");
          return;
        }
      }
    }

    // sobe banner do evento (opcional)
    let imageUrl: string | undefined;
    try {
      imageUrl = await uploadEventImage();
    } catch {
      alert("Error al subir la imagen del evento");
      return;
    }

    // garante que já temos URLs públicas para TODOS os banners de artistas setados
    // (se usuário colou URL, mantemos; se subiu arquivo, já convertemos no editor)
    // aqui apenas normalizamos strings
    const normalizeArtistBanners = (ab: Record<string, string>): Record<string, string> => {
      const out: Record<string, string> = {};
      Object.entries(ab).forEach(([k, v]) => {
        const vv = v.trim();
        if (k.trim() && vv) out[k.trim()] = vv;
      });
      return out;
    };

    try {
      if (mode === "create") {
        // cria o evento
        const createdEvent = await createEventMutation.mutateAsync({
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          userId: session.user.id,
          image: imageUrl,
          startDate: parseDateOnlyToDate(data.startDate),
          endDate: parseDateOnlyToDate(data.endDate),
        });

        // cria sessões + categorias + artistas
        for (const s of sessions) {
          const parsedDate = parseDateTimeLocal(s.dateTimeLocal);
          if (!parsedDate) throw new Error("Fecha/hora de sesión inválida.");

          const ticketCategories =
            s.ticketingType === "GENERAL"
              ? s.categories.map((c) => ({
                  title: c.title,
                  price: Number(c.price) || 0,
                  capacity: Number(c.capacity) || 0,
                }))
              : s.sectors.map((sec) => ({
                  title: sec.name,
                  price: Number(sec.price) || 0,
                  capacity: 0,
                }));

          const createdSession = await createSessionMutation.mutateAsync({
            eventId: createdEvent.id,
            dateTimeStart: parsedDate,
            durationMin: Number(s.durationMin) || 0,
            timezone: "America/Buenos_Aires",
            venueName: s.venueName,
            street: s.street,
            number: s.number,
            neighborhood: s.neighborhood,
            city: s.city,
            state: s.state,
            zip: s.zip,
            country: "AR",
            ticketingType: s.ticketingType as SessionTicketingType,
            ticketCategories,
          });

          // anexa artistas (nomes)
          if (s.artists.length > 0) {
            await attachArtistsMutation.mutateAsync({
              sessionId: createdSession.id,
              artists: s.artists,
            });

            // se existir mutação de imagem, atualiza banner do artista
            if (updateArtistImageMutation) {
              const banners = normalizeArtistBanners(s.artistBanners);
              // por artista distinto na sessão
              for (const name of s.artists) {
                const img = banners[name];
                if (img) {
                  try {
                    await updateArtistImageMutation.mutateAsync({ name, image: img });
                  } catch {
                    // // não quebra fluxo se backend ainda não suporta
                  }
                }
              }
            }
          }
        }

        if (onSuccess) onSuccess(createdEvent.id);
        else router.replace(`/event/edit/${createdEvent.id}`);
      } else {
        if (!event?.id) {
          alert("Evento inválido para edición");
          return;
        }

        // monta payload das sessões para updateWithGraph (sem mudar shape existente)
        const sessionsPayload = sessions.map((s) => {
          const parsedDate = parseDateTimeLocal(s.dateTimeLocal);
          if (!parsedDate) throw new Error("Fecha/hora de sesión inválida.");

          const base = {
            dateTimeStart: parsedDate,
            durationMin: Number(s.durationMin) || 0,
            timezone: "America/Buenos_Aires",
            venueName: s.venueName,
            street: s.street,
            number: s.number,
            neighborhood: s.neighborhood || null,
            city: s.city,
            state: s.state,
            zip: s.zip,
            country: "AR",
            artists: s.artists as string[],
          };

          if (s.ticketingType === "GENERAL") {
            return {
              ...base,
              ticketingType: "GENERAL" as const,
              categories: s.categories.map((c) => ({
                title: c.title,
                price: Number(c.price) || 0,
                capacity: Number(c.capacity) || 0,
              })),
            };
          }

          return {
            ...base,
            ticketingType: "SEATED" as const,
            sectors: s.sectors.map((sec) => ({
              name: sec.name,
              price: Number(sec.price) || 0,
              rows: sec.rows.map((r) => ({
                name: r.name,
                seatCount: Number(r.seatCount) || 0,
              })),
            })),
          };
        });

        await updateEventGraphMutation.mutateAsync({
          id: event.id,
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          image: imageUrl,
          startDate: parseDateOnlyToDate(data.startDate),
          endDate: parseDateOnlyToDate(data.endDate),
          sessions: sessionsPayload,
        });

        // opcional: se existir endpoint de imagem, sincroniza banners informados na UI
        if (updateArtistImageMutation) {
          const seen = new Set<string>();
          for (const s of sessions) {
            const banners = Object.entries(s.artistBanners);
            for (const [name, img] of banners) {
              const key = `${name}::${img}`;
              if (!name || !img || seen.has(key)) continue;
              try {
                await updateArtistImageMutation.mutateAsync({ name, image: img });
                seen.add(key);
              } catch {
                // // ignora se backend ainda não dá suporte
              }
            }
          }
        }

        if (onSuccess) onSuccess(event.id);
        else router.replace(`/event/edit/${event.id}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ocurrió un error al guardar el evento.";
      alert(msg);
    }
  };

  // ───────────────── UI ─────────────────
  const input =
    "w-full rounded border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-200 placeholder-gray-400";
  const err = "mt-1 text-xs text-red-600";
  const card = "space-y-4 rounded-lg bg-white p-6 shadow-md";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-8 text-3xl font-bold text-gray-800">
        {mode === "create" ? "Crear Evento" : "Editar Evento"}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
        {/* Información básica */}
        <div className={card}>
          <h2 className="text-xl font-semibold text-gray-700">Información básica</h2>

          <label className="block text-sm text-gray-700 mb-1">Nombre del evento</label>
          <input {...register("name")} placeholder="Ej.: Festival Internacional de Música 2025" className={input} />
          {errors.name && <p className={err}>{errors.name.message}</p>}

          <label className="block text-sm text-gray-700 mt-4 mb-1">Descripción</label>
          <textarea
            {...register("description")}
            placeholder="Agrega una descripción: artistas principales, género, público objetivo…"
            className={input}
          />
          {errors.description && <p className={err}>{errors.description.message}</p>}
        </div>

        {/* Categoría */}
        <div className={card}>
          <h2 className="text-xl font-semibold text-gray-700">Categoría</h2>
          <label className="block text-sm text-gray-700 mb-1">Seleccione la categoría</label>
          <select {...register("categoryId")} className={input} defaultValue="">
            <option value="">Selecciona la categoría del evento</option>
            {categories.map((c: { id: string; title: string }) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          {errors.categoryId && <p className={err}>{errors.categoryId.message}</p>}
        </div>

        {/* Fechas (opcional) */}
        <div className={card}>
          <h2 className="text-xl font-semibold text-gray-700">Fechas (opcional)</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-700">Fecha de inicio</label>
              <input type="date" {...register("startDate")} className={input} />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Fecha de fin</label>
              <input type="date" {...register("endDate")} className={input} />
              {errors.endDate && <p className={err}>{errors.endDate.message}</p>}
            </div>
          </div>
        </div>

        {/* Imagen del evento */}
        <div className={card}>
          <h2 className="mb-2 text-xl font-semibold text-gray-700">Imagen</h2>

          <div className="flex items-center gap-3">
            <input
              id="event-image"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0] ?? null;
                setImageFile(file);
                setImagePreview(file ? URL.createObjectURL(file) : null);
              }}
              className="sr-only"
            />
            <label htmlFor="event-image" className="cursor-pointer rounded bg-primary-100 px-4 py-2 text-white hover:bg-primary-200">
              Seleccionar archivo
            </label>
            <span className="truncate text-sm text-gray-600">
              {imageFile ? imageFile.name : imagePreview ? "Imagen existente" : "Ningún archivo seleccionado"}
            </span>
          </div>

          {imagePreview && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-gray-500">Vista previa:</p>
              <div className="relative h-64 w-full overflow-hidden rounded">
                <Image
                  src={imagePreview}
                  alt="Vista previa"
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sesiones */}
        <div className={card}>
          <h2 className="mb-2 text-xl font-semibold text-gray-700">Sesiones</h2>

          {sessions.map((s, sIdx) => {
            const isGeneral = s.ticketingType === "GENERAL";

            return (
              <div key={sIdx} className="rounded border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700">Sesión {sIdx + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeSession(sIdx)}
                    disabled={sessions.length === 1}
                    className="rounded border px-3 py-2 text-sm text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    title={sessions.length === 1 ? "Mínimo 1 sesión" : "Eliminar sesión"}
                  >
                    Eliminar sesión
                  </button>
                </div>

                {/* Tipo + Fecha/Hora + Duración */}
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Tipo de sesión</label>
                    <select
                      value={s.ticketingType}
                      onChange={(e) => (e.target.value === "GENERAL" ? switchToGeneral(sIdx) : switchToSeated(sIdx))}
                      className={input}
                    >
                      <option value="GENERAL">General (sin asientos)</option>
                     {/* <option value="SEATED">Seated (con asientos)</option>*/}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Fecha y hora</label>
                    <input
                      type="datetime-local"
                      value={s.dateTimeLocal}
                      onChange={(e) => updateBaseField(sIdx, "dateTimeLocal", e.target.value)}
                      placeholder="Ej.: 2025-12-20T21:00"
                      className={input}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Duración (min)</label>
                    <input
                      type="number"
                      min={1}
                      value={s.durationMin}
                      onChange={(e) => updateBaseField(sIdx, "durationMin", Math.max(1, Number(e.target.value) || 1))}
                      placeholder="Duración (ej.: 120)"
                      className={input}
                    />
                  </div>
                </div>

                {/* Artistas + Banners */}
                  <div className="mb-4">
                    <ArtistPicker
                      selected={s.artists}
                      banners={s.artistBanners}
                      userId={session?.user?.id}
                      onAdd={(name) => {
                        setSessions((prev) =>
                          prev.map((prevS, i) =>
                            i === sIdx
                              ? {
                                  ...prevS,
                                  artists: prevS.artists.includes(name)
                                    ? prevS.artists
                                    : [...prevS.artists, name],
                                  artistBanners: { ...prevS.artistBanners },
                                }
                              : prevS
                          )
                        );
                      }}
                      onRemove={(name) => {
                        setSessions((prev) =>
                          prev.map((prevS, i) =>
                            i === sIdx
                              ? {
                                  ...prevS,
                                  artists: prevS.artists.filter((n) => n !== name),
                                  artistBanners: Object.fromEntries(
                                    Object.entries(prevS.artistBanners).filter(([k]) => k !== name)
                                  ),
                                }
                              : prevS
                          )
                        );
                      }}
                      onBannerChange={(name, url) => updateArtistBanner(sIdx, name, url)}
                    />
                  </div>

                {/* Lugar y dirección */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-700 mb-1">Lugar</label>
                  <input
                    value={s.venueName}
                    onChange={(e) => updateBaseField(sIdx, "venueName", e.target.value)}
                    placeholder="Lugar (ej.: Teatro Gran Rex)"
                    className={`${input} mb-3`}
                  />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Calle</label>
                      <input
                        value={s.street}
                        onChange={(e) => updateBaseField(sIdx, "street", e.target.value)}
                        placeholder="Calle (ej.: Av. Corrientes)"
                        className={input}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Número</label>
                      <input
                        value={s.number}
                        onChange={(e) => updateBaseField(sIdx, "number", e.target.value)}
                        placeholder="Número (ej.: 857)"
                        className={input}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Barrio (opcional)</label>
                      <input
                        value={s.neighborhood}
                        onChange={(e) => updateBaseField(sIdx, "neighborhood", e.target.value)}
                        placeholder="Barrio (opcional)"
                        className={input}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Ciudad</label>
                      <input
                        value={s.city}
                        onChange={(e) => updateBaseField(sIdx, "city", e.target.value)}
                        placeholder="Ciudad"
                        className={input}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Provincia/Estado</label>
                      <input
                        value={s.state}
                        onChange={(e) => updateBaseField(sIdx, "state", e.target.value)}
                        placeholder="Provincia/Estado"
                        className={input}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Código postal</label>
                      <input
                        value={s.zip}
                        onChange={(e) => updateBaseField(sIdx, "zip", e.target.value)}
                        placeholder="Código postal"
                        className={input}
                      />
                    </div>
                  </div>
                </div>

                {/* Categorías / Sectores */}
                {isGeneral ? (
                  <div>
                    <h4 className="mb-2 font-semibold text-gray-700">Categorías de la sesión</h4>
                    {s.categories.map((c, cIdx) => (
                      <div key={cIdx} className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Nombre de la categoría</label>
                          <input
                            value={c.title}
                            onChange={(e) => updateCategoryField(sIdx, cIdx, "title", e.target.value)}
                            placeholder="Nombre (VIP, Pista, Pullman...)"
                            className={input}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Precio (ARS)</label>
                          <input
                            type="number"
                            min={0}
                            value={c.price}
                            onChange={(e) => updateCategoryField(sIdx, cIdx, "price", Number(e.target.value) || 0)}
                            placeholder="Precio (ARS)"
                            className={input}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Capacidad</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min={0}
                              value={c.capacity}
                              onChange={(e) =>
                                updateCategoryField(sIdx, cIdx, "capacity", Number(e.target.value) || 0)
                              }
                              placeholder="Capacidad (GENERAL)"
                              className={input}
                            />
                            <button
                              type="button"
                              onClick={() => removeCategory(sIdx, cIdx)}
                              disabled={s.categories.length === 1}
                              className="min-w-[96px] rounded border px-3 py-2 text-sm text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                              title={s.categories.length === 1 ? "Mínimo 1 categoría" : "Eliminar"}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button type="button" onClick={() => addCategory(sIdx)} className="text-sm text-blue-600 underline">
                      + Añadir categoría
                    </button>
                  </div>
                ) : (
                  <div>
                    <h4 className="mb-2 font-semibold text-gray-700">Sectores y filas</h4>

                    {s.sectors.map((sec, secIdx) => (
                      <div key={secIdx} className="mb-4 rounded border p-3">
                        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">Nombre del sector</label>
                            <input
                              value={sec.name}
                              onChange={(e) => updateSectorField(sIdx, secIdx, "name", e.target.value)}
                              placeholder="Nombre del sector (ej.: Platea A)"
                              className={input}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">Precio del sector (ARS)</label>
                            <input
                              type="number"
                              min={0}
                              value={sec.price}
                              onChange={(e) => updateSectorField(sIdx, secIdx, "price", Number(e.target.value) || 0)}
                              placeholder="Precio del sector (ARS)"
                              className={input}
                            />
                          </div>
                          <div className="flex items-end justify-end">
                            <button
                              type="button"
                              onClick={() => removeSector(sIdx, secIdx)}
                              disabled={s.sectors.length === 1}
                              className="min-w-[120px] rounded border px-3 py-2 text-sm text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                              title={s.sectors.length === 1 ? "Mínimo 1 sector" : "Eliminar sector"}
                            >
                              Eliminar sector
                            </button>
                          </div>
                        </div>

                        <p className="text-sm text-gray-700 mb-2 font-medium">Filas del sector</p>
                        <p className="text-xs text-gray-500 mb-3">
                          Indique el <strong>nombre de la fila</strong> (por ejemplo A, B, C…) y la{" "}
                          <strong>cantidad de asientos</strong> en esa fila.
                        </p>

                        {sec.rows.map((row, rowIdx) => (
                          <div key={rowIdx} className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">Nombre de la fila</label>
                              <input
                                value={row.name}
                                onChange={(e) => updateRowField(sIdx, secIdx, rowIdx, "name", e.target.value)}
                                placeholder="Ej.: A, B, C…"
                                className={input}
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">Asientos en la fila</label>
                              <input
                                type="number"
                                min={0}
                                value={row.seatCount}
                                onChange={(e) =>
                                  updateRowField(
                                    sIdx,
                                    secIdx,
                                    rowIdx,
                                    "seatCount",
                                    Math.max(0, Number(e.target.value) || 0)
                                  )
                                }
                                placeholder="Ej.: 20"
                                className={input}
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => removeRowFromSector(sIdx, secIdx, rowIdx)}
                                disabled={sec.rows.length === 1}
                                className="min-w-[120px] rounded border px-3 py-2 text-sm text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                title={sec.rows.length === 1 ? "Mínimo 1 fila" : "Eliminar fila"}
                              >
                                Eliminar fila
                              </button>
                            </div>
                          </div>
                        ))}

                        <button type="button" onClick={() => addRowToSector(sIdx, secIdx)} className="text-sm text-blue-600 underline">
                          + Añadir fila
                        </button>
                      </div>
                    ))}

                    <button type="button" onClick={() => addSector(sIdx)} className="text-sm text-blue-600 underline">
                      + Añadir sector
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-4">
            <button type="button" onClick={addSession} className="text-sm text-blue-600 underline">
              + Añadir otra sesión
            </button>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3">
          {mode === "edit" && (
            <button
              type="button"
              onClick={() => router.back()}
              className="hover:bg-primary-200 rounded bg-primary-100 px-6 py-3 font-semibold text-white transition"
            >
              Volver
            </button>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting ||
              createEventMutation.isLoading ||
              createSessionMutation.isLoading ||
              updateEventMutation.isLoading ||
              attachArtistsMutation.isLoading ||
              updateEventGraphMutation.isLoading
            }
            className="hover:bg-primary-200 rounded bg-primary-100 px-6 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ||
            createEventMutation.isLoading ||
            createSessionMutation.isLoading ||
            updateEventMutation.isLoading ||
            updateEventGraphMutation.isLoading
              ? "Guardando…"
              : mode === "create"
              ? "Crear Evento y Sesiones"
              : "Guardar Cambios"}
          </button>

          {(createEventMutation.error ||
            createSessionMutation.error ||
            updateEventMutation.error ||
            updateEventGraphMutation.error) && (
            <span className="text-sm text-red-600">
              {createEventMutation.error?.message ??
                createSessionMutation.error?.message ??
                updateEventMutation.error?.message ??
                updateEventGraphMutation.error?.message ??
                "Error al guardar"}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
