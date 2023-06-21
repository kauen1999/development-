import React from "react";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import { getSession, useSession } from "next-auth/react";
import RegisterSection from "../components/principal/register/RegisterSection";

const Register: NextPage = () => {
  const router = useRouter();

  const handleRedirect = () => {
    router.push("/");
  };

  const { data: sessionData } = useSession();

  return <>{sessionData ? handleRedirect() : <RegisterSection />}</>;
};

export default Register;

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
