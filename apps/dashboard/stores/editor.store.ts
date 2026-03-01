import {create} from "zustand"


interface table{
    name:string;
    data:string[];
}

interface EditorStore {
    tables:table[];
    setTables:(tables:table[]) => void;
}