// app/screens/HomeScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
  Platform,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { useNavStore } from "../store/useNavStore";
import { useSmokeDetectMock } from "../hooks/useSmokeDetectMock";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");

export default function HomeScreen() {
  const go = useNavStore((s) => s.go);
  const detect = useSmokeDetectMock();
  const [preview, setPreview] = useState<string | null>(null);
  const fade = useState(new Animated.Value(0))[0];
  const slide = useState(new Animated.Value(30))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pickMobile = async () => {
    try {
      const ImagePicker = await import("expo-image-picker");
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setPreview(asset.uri);
      await detect.mutateAsync({ file: new File([], "mobile.jpg") as any });
    } catch {
      alert("Mobil seçici için expo-image-picker eklenmeli.");
    }
  };

  const onFileChangeWeb = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    await detect.mutateAsync({ file });
  };

  const getScoreColor = (score: number | undefined) => {
    if (!score) return "#9aa1ab";
    if (score >= 0.7) return "#ef4444";
    if (score >= 0.4) return "#f59e0b";
    return "#22c55e";
  };

  const score = detect.data?.score_smoke ?? 0;
  const scorePct = Math.round(score * 100);
  const scoreColor = getScoreColor(score);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* HERO */}
      <View style={styles.heroWrap}>
        <ImageBackground
          source={require("../../assets/home-hero.jpg")}
          style={styles.heroBg}
          imageStyle={styles.heroBgImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(6,34,20,0.85)", "rgba(6,34,20,0.70)"]}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View
            style={[styles.heroContent, { opacity: fade, transform: [{ translateY: slide }] }]}
          >
            <Text style={styles.projectName}>GreenTopia</Text>
            <Text style={styles.heroTitle}>Akıllı Koruma, Yeşil Yarınlar</Text>
            <Text style={styles.heroParagraph}>
              Geleceğimizi tehdit eden orman yangınlarını önceden durduruyoruz. GreenTopia,
              hava verilerini anlık analiz eder, dumanı erken tespit eder ve yayılımı simüle eder.
            </Text>
            <TouchableOpacity style={styles.ctaPrimary} onPress={() => go("map")}>
              <MaterialIcons name="eco" size={18} color="#0b2b1a" />
              <Text style={styles.ctaPrimaryText}>Risk Haritasını Aç</Text>
            </TouchableOpacity>
          </Animated.View>
        </ImageBackground>
      </View>

      {/* FLOW */}
      <View style={styles.flowSection}>
        <View style={styles.flowRow}>
          {[
            { icon: "photo-library", title: "Fotoğraf Yükle", desc: "Yangın şüphesi görselini ekle" },
            { icon: "search", title: "Duman Analizi", desc: "Yapay zekâ ile inceleme" },
            { icon: "timeline", title: "Yayılım Simülasyonu", desc: "Yangının olası rotası" },
            { icon: "map", title: "Müdahale Planı", desc: "Harita üzerinde yönlendir" },
          ].map((step, idx, arr) => (
            <React.Fragment key={idx}>
              <View style={styles.flowStep}>
                <View style={styles.flowIcon}>
                  <MaterialIcons name={step.icon as any} size={20} color="#d7f5e6" />
                </View>
                <Text style={styles.flowTitle}>{step.title}</Text>
                <Text style={styles.flowDesc}>{step.desc}</Text>
              </View>
              {idx < arr.length - 1 && (
                <View style={styles.flowConnector}>
                  <Text style={styles.flowArrow}>→</Text>
                </View>
              )}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* ANALYSIS */}
      <View style={styles.analysisSection}>
        <Text style={styles.sectionHeadingLight}>Erken Tespit Ormanları Kurtarır</Text>
        <Text style={styles.sectionSub}>
          Yangını başlamadan durdurmak için dumanı erken tespit edin. Riskleri önceden görün.
        </Text>

        <TouchableOpacity
          style={styles.uploadDrop}
          onPress={Platform.OS !== "web" ? pickMobile : undefined}
          activeOpacity={0.85}
        >
          {preview ? (
            <Image source={{ uri: preview }} style={styles.previewImage} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <MaterialIcons name="cloud-upload" size={40} color="#1f5b3e" />
              <Text style={styles.uploadText}>Fotoğrafınızı buradan yükleyin</Text>
              <Text style={styles.uploadSub}>JPEG, PNG — Maks. 5MB</Text>
            </View>
          )}

          {Platform.OS === "web" && (
            <input
              type="file"
              accept="image/*"
              onChange={onFileChangeWeb}
              style={styles.coverInput as any}
            />
          )}
        </TouchableOpacity>

        <View style={styles.actionRowOnlyMap}>
          <TouchableOpacity onPress={() => go("map")} style={styles.btnOutline}>
            <MaterialIcons name="map" size={18} color="#cbd5cf" />
            <Text style={styles.btnOutlineText}>Risk Haritasını Gör</Text>
          </TouchableOpacity>
        </View>

        {/* RESULT */}
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Duman Tespit Skoru</Text>
          <View style={styles.chartRow}>
            <Text style={styles.chartEdge}>0</Text>
            <View style={styles.chartTrack}>
              <LinearGradient
                colors={
                  scorePct >= 70
                    ? ["#ef4444", "#f97316"]
                    : scorePct >= 40
                    ? ["#f59e0b", "#fbbf24"]
                    : ["#22c55e", "#10b981"]
                }
                style={[styles.chartFill, { width: `${scorePct}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              {[0, 25, 50, 75, 100].map((t) => (
                <View key={t} style={[styles.tick, { left: `${t}%` }]} />
              ))}
            </View>
            <Text style={styles.chartEdge}>100</Text>
          </View>

          <View style={styles.chartMeta}>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>{scorePct}</Text>
            <Text style={styles.scoreUnit}>/100</Text>
            <View style={styles.riskPill}>
              <Text style={styles.riskPillText}>
                {scorePct >= 70 ? "Yüksek" : scorePct >= 40 ? "Orta" : "Düşük"}
              </Text>
            </View>
          </View>

          <Text style={styles.resultDesc}>
            Yüksek skor, analiz edilen görüntüde duman olasılığının arttığını gösterir.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const YELLOW = "#F4CE14";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#071a14" },
  contentContainer: { paddingBottom: 24 },

  // HERO
  heroWrap: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: "hidden" },
  heroBg: { height: 420, justifyContent: "center", width: '100%' },
  heroBgImage: { width: '100%', height: '100%' },
  heroContent: { paddingHorizontal: 20, alignItems: "center" },
  projectName: { color: "#cfe9d9", fontSize: 18, fontWeight: "800", marginBottom: 6 },
  heroTitle: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  heroParagraph: {
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 22,
    fontSize: 14,
    maxWidth: 760,
    marginBottom: 18,
  },
  ctaPrimary: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: YELLOW,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  ctaPrimaryText: { color: "#0b2b1a", fontWeight: "800", fontSize: 14 },

  // FLOW
  flowSection: { marginTop: 16, paddingHorizontal: 12 },
  flowRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 10,
    rowGap: 18,
  },
  flowStep: { width: 180, paddingHorizontal: 8, alignItems: "center", marginBottom: 6 },
  flowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  flowTitle: {
    color: "#e3f6ec",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 2,
  },
  flowDesc: { color: "#9aa1ab", fontSize: 12, textAlign: "center", minHeight: 34 },
  flowConnector: { width: 28, alignItems: "center", justifyContent: "center", paddingTop: 10 },
  flowArrow: { color: "#7a8e88", fontWeight: "900", fontSize: 18, lineHeight: 18 },

  // ANALYSIS
  analysisSection: { backgroundColor: "#0b241a", paddingVertical: 28, paddingHorizontal: 16 },
  sectionHeadingLight: {
    color: "#e3f6ec",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  sectionSub: {
    color: "#b6c8c1",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 700,
    alignSelf: "center",
    marginBottom: 18,
  },
  uploadDrop: {
    width: "100%",
    maxWidth: 680,
    height: 220,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    alignSelf: "center",
  },
  uploadPlaceholder: { alignItems: "center", gap: 8 },
  uploadText: { color: "#d7f5e6", fontWeight: "700" },
  uploadSub: { color: "#98a8a3", fontSize: 12 },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  coverInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    cursor: "pointer",
  },

  actionRowOnlyMap: { marginTop: 12, alignItems: "center" },
  btnOutline: {
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#2a6b4b",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  btnOutlineText: { color: "#cbd5cf", fontWeight: "700" },

  // RESULT CARD
  resultCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 20,
    marginTop: 20,
    alignItems: "center",
    marginHorizontal: 8,
  },
  resultTitle: { color: "#e3f6ec", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  chartRow: {
    width: "100%",
    maxWidth: 680,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
  },
  chartEdge: { color: "#89a39a", fontSize: 12, width: 26, textAlign: "center" },
  chartTrack: {
    flex: 1,
    height: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    position: "relative",
    overflow: "hidden",
  },
  chartFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 999 },
  tick: {
    position: "absolute",
    top: -1,
    width: 2,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    transform: [{ translateX: -1 }],
  },
  chartMeta: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  scoreValue: { fontSize: 32, fontWeight: "900" },
  scoreUnit: { fontSize: 14, fontWeight: "600", color: "#9aa1ab" },
  riskPill: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  riskPillText: { color: "#d7f5e6", fontWeight: "800", fontSize: 12 },
  resultDesc: {
    color: "#a9bbb5",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 620,
  },
});

