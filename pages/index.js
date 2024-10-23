import "@bryntum/scheduler/scheduler.stockholm.css";

import { SchedulerWrapper } from "@/components/SchedulerWrapper";

export default function Home() {
  return (
    <main
      style={{
        height: "100vh",
      }}
    >
      <SchedulerWrapper />
    </main>
  );
}
