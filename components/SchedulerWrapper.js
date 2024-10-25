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
  return (
    <>
      <Scheduler />
    </>
  );
};

export { SchedulerWrapper };
