import React from "react";
import DashboardContent from "../components/dashboard/DashboardContent";
import { NextPage } from "next";

const Dashboard: NextPage = () => {
  return (
    <div>
      <DashboardContent />
    </div>
  );
};

export async function getServerSideProps({ req }: any) {
  if (req.cookies.userType === "admin") {
    return {
      props: {},
    };
  }
  return {
    redirect: {
      destination: "/",
      permanent: false,
    },
  };
}

export default Dashboard;
