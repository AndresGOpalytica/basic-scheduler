import { useState } from "react";
import dynamic from "next/dynamic";

// const Scheduler = dynamic(() => import("./Scheduler"), {
const Scheduler = dynamic(() => import("./Scheduler.min"), {
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
  const [dummy, setDummy] = useState(false);
  return (
    <>
      <button className="btn btn-primary" onClick={() => setDummy(!dummy)}>
        Toggle useState
      </button>
      <Scheduler externalDummyData={dummy} />
    </>
  );
};

export { SchedulerWrapper };
