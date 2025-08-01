import React from "react";
import DashboardContent from "../components/dashboard/DashboardContent";
import type { NextPage, GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";

const Dashboard: NextPage = () => {
  return (
    <div>
      <DashboardContent />
    </div>
  );
};

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

export default Dashboard;
