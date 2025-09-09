// src/components/details/hero/HeroD.tsx
import React from "react";
import Header from "../../principal/header/Header";
import { BiTimeFive } from "react-icons/bi";
import { CiLocationOn } from "react-icons/ci";

interface Props {
  picture: string;
  artist: string;
  date: string;
  description?: string;
  timeStart?: string;
  venueName?: string;
  city?: string;
  price?: number;
  buyId: string;
  minimalHeader?: boolean; // 🔹 novo
}

const HeroD = ({
  picture,
  artist,
  date,
  description,
  timeStart,
  venueName,
  city,
  price,
  minimalHeader = false, // 🔹 default = false
}: Props) => {
  const safeImage = picture || "/fallback.jpg";

  return (
    <section
      className="hero h-[100vh] bg-center bg-no-repeat object-cover"
      style={{
        backgroundImage: `url("${safeImage}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="relative hero-overlay bg-black bg-opacity-50">
        <div className="text-white">
          {/* 🔹 agora respeita o prop */}
          <Header minimal={minimalHeader} />
        </div>
        <div className="h-[8vh]"></div>

        <div className="mx-auto mt-7 flex w-11/12 flex-col items-center gap-7 lg:flex-row lg:justify-evenly lg:gap-0">
          <div className="flex flex-col gap-7 lg:justify-center">
            <div className="titles flex flex-col items-center text-white lg:items-start">
              <h1 className="text-5xl font-bold lg:text-7xl">{artist}</h1>
              <p className="text-3xl">{date}</p>
              {description && (
                <p className="text-slate-300 lg:max-w-lg">{description}</p>
              )}
            </div>

            <div className="datos flex flex-col gap-2 text-white">
              {timeStart && (
                <div className="flex items-center gap-2">
                  <BiTimeFive className="text-3xl" />
                  <h4 className="text-lg">{timeStart}</h4>
                </div>
              )}

              {(venueName || city) && (
                <div className="flex items-center gap-2">
                  <CiLocationOn className="text-3xl" />
                  <div>
                    {venueName && <h4 className="text-lg">{venueName}</h4>}
                    {city && <h4 className="text-lg">{city}</h4>}
                  </div>
                </div>
              )}

              {price !== undefined && (
                <p className="mt-2 text-lg font-semibold">
                  Desde ${price.toLocaleString("es-AR")}
                </p>
              )}
            </div>
          </div>
          <div className="w-full max-w-md text-center lg:w-[37rem] lg:max-w-none 2xl:w-[50rem]"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroD;
