// import { Queue } from "bullmq";
// import { fileURLToPath } from "node:url";
// import dotenv from "dotenv";
// import { connection } from "../config/env.js";
// dotenv.config();

// const notificatinQ = new Queue("emialQ", { connection });

// // const executionId="d2427326ddac43a70ae4f1f4cd29c9eb6c313bc45bf12150af7eb283107682b6";
// export async function init() {
//   const res = await notificatinQ.add("emailToMohit", {
//     message: "wha are u doing",
//     date: "34/34/34",
//   });

//   await notificatinQ.close();

//   console.log("job id is ", res.id);
// }
