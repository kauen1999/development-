// src/pages/login.tsx
import type { NextPage, GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import LoginSection from "../components/principal/login/LoginSection";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { trpc } from "../utils/trpc";

type UserProfile = {
  name?: string | null;
  dniName?: string | null;
  dni?: string | null;
  phone?: string | null;
  birthdate?: string | Date | null;
};

function isProfileComplete(profile: UserProfile): boolean {
  const required = [
    profile?.name,
    profile?.dniName,
    profile?.dni,
    profile?.phone,
  ];
  // Considera campo vazio se for undefined, null ou string só com espaços
  const allFilled = required.every(
    (field) => typeof field === "string" && field.trim().length > 0
  );
  let birthdateOk = false;
  if (typeof profile?.birthdate === "string") {
    birthdateOk = profile.birthdate.trim().length > 0;
  } else if (profile?.birthdate instanceof Date) {
    birthdateOk = !isNaN(profile.birthdate.getTime());
  }
  return allFilled && birthdateOk;
}


const Login: NextPage = () => {
  const router = useRouter();
  const { status, data: session } = useSession();

  // Query do perfil: só ativa se autenticado
  const { data: userProfile, isLoading: isLoadingProfile } = trpc.auth.profile.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  useEffect(() => {
    console.log("EFFECT START");
    console.log("status:", status);
    console.log("session:", session);
    console.log("userProfile:", userProfile);
    console.log("isLoadingProfile:", isLoadingProfile);

    if (status === "authenticated") {
      // Se admin, vai para dashboard
      if (session?.user?.role === "ADMIN") {
        console.log("Redirecionando para /dashboard");
        router.replace("/dashboard");
        return;
      }
      // Se perfil incompleto, vai para /auth
      if (!isLoadingProfile && userProfile) {
        const complete = isProfileComplete(userProfile);
        console.log("Perfil está completo?", complete);
        if (!complete) {
          console.log("Redirecionando para /auth");
          router.replace("/auth");
        } else {
          // Perfil completo: home
          console.log("Redirecionando para /");
          router.replace("/");
        }
      }
    }
  }, [status, session, userProfile, isLoadingProfile, router]);

  if (status === "loading" || (status === "authenticated" && isLoadingProfile)) {
    return <div>Carregando...</div>;
  }

  return <LoginSection />;
};

export default Login;

// SSR – não faz redirecionamento, apenas permite lógica no client-side
export async function getServerSideProps(
  _context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<Record<string, never>>> {
  return { props: {} };
}
