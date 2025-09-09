// src/pages/event/create.tsx
import { useRouter } from "next/router";
import EventForm from "@/components/forms/EventForm";

export default function CreatePage() {
  const router = useRouter();
  return (
    <EventForm
      mode="create"
      onSuccess={(id) => router.push(`/event/manage/${id}`)}
    />
  );
}
