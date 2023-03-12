import React, { useState, useRef, useEffect } from "react";
import img from "../../../../public/images/queen.jpg";
import { AiOutlineClockCircle } from "react-icons/ai";
import Details from "./Details";

const BuyHero = () => {

  const Ref = useRef(null);

  const [timer, setTimer] = useState("00:00:00");

  const getTimeRemaining = (e) => {
    const total = Date.parse(e) - Date.parse(new Date());
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / 1000 / 60 / 60) % 24);
    return {
      total,
      hours,
      minutes,
      seconds,
    };
  };

  const startTimer = (e) => {
    let { total, hours, minutes, seconds } = getTimeRemaining(e);
    if (total >= 0) {
      setTimer(
        (hours > 9 ? hours : "0" + hours) +
          ":" +
          (minutes > 9 ? minutes : "0" + minutes) +
          ":" +
          (seconds > 9 ? seconds : "0" + seconds)
      );
    }
  };

  const clearTimer = (e) => {
    setTimer("00:4:00");

    if (Ref.current) clearInterval(Ref.current);
    const id = setInterval(() => {
      startTimer(e);
    }, 1000);
    Ref.current = id;
  };

  const getDeadTime = () => {
    let deadline = new Date();

    deadline.setSeconds(deadline.getSeconds() + 10);
    return deadline;
  };

  useEffect(() => {
    clearTimer(getDeadTime());
  }, []);

  const onClickReset = () => {
    clearTimer(getDeadTime());
  };

  return (
    <div className="mt-5 flex flex-col gap-5 bg-primary-100 p-5 lg:flex-row lg:items-center lg:justify-between 2xl:px-14">
      <Details
        img={img}
        title="Queen: tour"
        fecha="27 Nov - Dom - 19:20pm"
        ubi="Estadium Luna Park - Buenos Aires"
      />

      <div className="flex w-max items-center gap-2 rounded-lg bg-white p-2 text-slate-400">
        <AiOutlineClockCircle className="text-2xl" />
        <p>Tiempo de reserva: {timer} min</p>
      </div>
    </div>
  );
};

export default BuyHero;
