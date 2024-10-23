import dynamic from "next/dynamic";
import { schedulerConfig } from "@/configs/schedulerConfig";

const Scheduler = dynamic(() => import("./Scheduler"), {
  ssr: false,
  loading: () => {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <p>Loading...</p>
      </div>
    );
  },
});

const SchedulerWrapper = () => {
  return (
    <>
      <Scheduler {...schedulerConfig} />
    </>
  );
};

export { SchedulerWrapper };
