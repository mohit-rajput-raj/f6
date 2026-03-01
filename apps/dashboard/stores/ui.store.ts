import {create} from "zustand"


interface UIStore {
    bottombarOpen:boolean;
    setBottombarOpen:(open: boolean) => void;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    minimapOpen?: boolean;
    setMinimapOpen?: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
    sidebarOpen: false,
    setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
    minimapOpen: false,
    setMinimapOpen: (open: boolean) => set({ minimapOpen: open }),
     bottombarOpen: false,
    setBottombarOpen: (open: boolean) => set({ bottombarOpen: open }),
}));