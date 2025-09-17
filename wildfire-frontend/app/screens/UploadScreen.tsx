import React, { useMemo, useState } from "react";
import { View, Text, Image, Platform, TouchableOpacity } from "react-native";
import { useSmokeDetectMock } from "../hooks/useSmokeDetectMock";

export default function UploadScreen(){
const [preview, setPreview] = useState<string | null>(null);
const detect = useSmokeDetectMock();

const onFileChangeWeb = async (e: any) => {
const file = e.target.files?.[0];
if (!file) return;
const url = URL.createObjectURL(file);
setPreview(url);
await detect.mutateAsync({ file });
};

return (
<View style={{ flex:1, padding:24 }}>
<Text style={{ color: "#e5e7eb", fontSize: 22, fontWeight:"800", marginBottom: 12 }}>Duman Tespiti — Fotoğraf Yükle</Text>
<View style={{ flexDirection:"row", gap: 16, flexWrap:"wrap" }}>
<View style={{ width: 420, height: 280, backgroundColor: "#0b1220", borderRadius: 12, borderWidth:1, borderColor:"#1f2937", alignItems:"center", justifyContent:"center" }}>
{preview ? (
<Image source={{ uri: preview }} style={{ width: "100%", height: "100%", borderRadius: 12 }} />
) : (
<Text style={{ color: "#64748b" }}>Önizleme burada görünecek</Text>
)}
</View>
<View style={{ gap: 12, flexGrow:1, minWidth: 280 }}>
<Text style={{ color:"#94a3b8" }}>Bir fotoğraf seçin. Web’de dosya seçici, mobilde daha sonra expo-image-picker ekleriz.</Text>
{Platform.OS === "web" ? (
<input type="file" accept="image/*" onChange={onFileChangeWeb} style={{ background:"#111827", color:"#e5e7eb", padding:12, borderRadius:10, border:"1px solid #1f2937" }} />
) : (
<TouchableOpacity disabled style={{ backgroundColor: "#1f2937", padding: 12, borderRadius:10 }}>
<Text style={{ color: "#9ca3af" }}>Mobil seçici yakında</Text>
</TouchableOpacity>
)}

<View style={{ backgroundColor: "#0b1220", padding: 12, borderRadius: 10, borderWidth:1, borderColor:"#1f2937" }}>
<Text style={{ color: "#e5e7eb" }}>Skor: {detect.data?.score_smoke?.toFixed?.(2) ?? "–"}</Text>
{detect.data?.gradcam_url && <Text style={{ color: "#94a3b8", marginTop: 4 }}>Grad‑CAM hazır (harita sayfasında overlay olarak kullanacağız).</Text>}
</View>
</View>
</View>
</View>
);
}
