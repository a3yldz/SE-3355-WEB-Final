import { create } from "zustand";

interface UIState {
layerRiskVisible: boolean;
riskOpacity: number;
hourOffset: number;
setHourOffset: (h: number) => void;
toggleRisk: () => void;
}

export const useUIStore = create<UIState>((set) => ({
layerRiskVisible: true,
riskOpacity: 0.9,
hourOffset: 0,
setHourOffset: (h) => set({ hourOffset: h }),
toggleRisk: () => set((s) => ({ layerRiskVisible: !s.layerRiskVisible })),
}));