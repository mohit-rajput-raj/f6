import {create} from "zustand"




interface EditorStore {
    dashid:string;
    setDashidValue:(dashid:string) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
    dashid: "0",
    setDashidValue: (dashid: string) => set({ dashid }),
}));