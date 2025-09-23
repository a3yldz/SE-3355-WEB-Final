// app/utils/config.ts
import { Platform } from "react-native";

export const BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";

// EsraGun2 bağış URL'si – ihtiyaç halinde güncellenebilir
export const DONATION_URL =
  typeof process !== "undefined" && (process as any)?.env?.DONATION_URL
    ? (process as any).env.DONATION_URL
    : "https://esragun2.example.com/donate";