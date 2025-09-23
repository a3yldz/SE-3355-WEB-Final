// app/store/useNavStore.ts
import { create } from "zustand";
export type Route = "home" | "map" | "fire" | "donate";
interface NavState { route: Route; go: (r: Route) => void }
export const useNavStore = create<NavState>((set) => ({
  route: "home",
  go: (r) => set({ route: r }),
}));