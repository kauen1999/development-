import React from "react";
import { type NextPage } from "next";
import LoginSection from "../components/principal/login/LoginSection";
import { useRouter } from "next/router";

import { useSession } from "next-auth/react";

const Login: NextPage = () => {
  const router = useRouter();

  const handleRedirect = () => {
    router.push("/");
  };

  const { data: sessionData } = useSession();

  return <>{sessionData ? handleRedirect() : <LoginSection />}</>;
};

export default Login;
