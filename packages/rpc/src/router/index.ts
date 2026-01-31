export const runtime = "nodejs";

import { listUsers } from "./users";

export const router ={
    users:{
        list: listUsers
    }
}