import React from "react";
import Link from "@docusaurus/Link";
import clsx from "clsx";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import homepage from "../../../homepage";
import "./promo.css";

const Promo = () => {
  const { promo } = homepage;

  return (
    <div className="promo relative h-[706px] rounded-[40px] flex-col justify-center items-center gap-32 inline-flex overflow-hidden">
      <video
        id="promo-video"
        loop
        playsInline
        autoPlay
        muted
        className="absolute z-0 w-full rounded-[48px]"
      >
        <source src="videos/sov-animation-loop-header-transcode.mp4" />
        <source src="videos/sov-animation-loop-header-transcode.webm" />
      </video>
      <div className="absolute top-[40px] sm:top-auto sm:bottom-auto z-1 h-[326px] flex-col justify-start items-center lg:gap-14 inline-flex">
        <div className="p-10 flex-col justify-start items-center gap-4 flex rounded-[40px] promo-shadow">
          <div className="h-7 px-[7px] bg-teal-400/10 rounded-[48px] border border-solid border-green-600/70 backdrop-blur-[36px] justify-center items-center inline-flex">
            <div className="self-stretch px-1.5 justify-center items-center gap-2 flex">
              <div className="text-center text-white dark:text-teal-200 dark:opacity-60 text-base font-normal leading-none">
                {promo.tag}
              </div>
            </div>
          </div>
          <div className="lg:w-[686px] text-center text-neutral-200 font-medium text-[42px] leading-[46px] lg:text-[56px] lg:leading-[56px]">
            {promo.title}
          </div>
          <div className="lg:w-[700px] text-center text-neutral-500 lg:text-[21px] font-normal leading-snug">
            {promo.subtitle}
          </div>
        </div>
        {promo.link && (
          <div className="justify-center items-start gap-2 inline-flex px-5">
            <Link
              to={promo.link}
              className={clsx(
                "btn-teal text-black dark:text-primary bg-white hover:bg-neutral-200 dark:bg-primary dark:hover:bg-teal-300 px-3  rounded-xl justify-center items-center flex hover:no-underline"
              )}
            >
              <div className="px-4 py-3 rounded-lg justify-center items-center gap-2 flex">
                <div className="text-center text-gray-950 text-lg font-semibold leading-normal">
                  {promo.button}
                </div>
              </div>
              <div className="justify-center items-center flex">
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="w-6 text-center text-gray-950 text-2xl font-black"
                />
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Promo;
