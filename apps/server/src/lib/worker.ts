// import { Worker } from "bullmq";
// import { connection } from "../config/env.js";

// export const worker = new Worker(
//   "emialQ",
//   async (job) => {
//     const { executionId, step, context, iteration = 1 } = job.data;
//     const isStopped = await connection.get(`status:${executionId}`);
//     console.log(isStopped);
//     if (isStopped === "STOPPED") {
//       console.log(`⏹️ Workflow [${executionId}] stopped by user.`);
//       return;
//     }
//     console.log("job id is", job.id);
//     console.log("message is : ", job.data.message);

//     console.log(`sending emails to ${job.data}`);
//     return new Promise((res, rej) =>
//       setTimeout(() => rej(new Error("Email delivery failed")), 1000),
//     );
//   },
//   { connection: connection },
// );
