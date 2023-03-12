import React from "react";
import { type NextPage } from "next";
import LoginSection from "../components/principal/login/LoginSection";
import { useRouter } from "next/router";

import { getSession, useSession } from "next-auth/react";

const Login: NextPage = () => {
  const router = useRouter();

  const handleRedirect = () => {
    router.push("/");
  };

  const { data: sessionData } = useSession();

  return <>{sessionData ? handleRedirect() : <LoginSection />}</>;
};

export default Login;

export async function getServerSideProps({ req }: any) {
  const session = await getSession({ req });

  if (session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: { session },
  };
}
