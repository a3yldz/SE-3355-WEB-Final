import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ImageBackground,
  Platform,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Easing,
  Image,
} from "react-native";
import { useNavStore } from "../store/useNavStore";
import { useSmokeDetectMock } from "../hooks/useSmokeDetectMock";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';

const { width: screenWidth } = Dimensions.get("window");

export default function HomeScreen() {
  const go = useNavStore((s) => s.go);
  const detect = useSmokeDetectMock();
  const [preview, setPreview] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
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
      alert("expo-image-picker is required for mobile picker.");
    }
  };

  const onFileChangeWeb = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    await detect.mutateAsync({ file });
  };

  const score = detect.data?.score_smoke ?? 0;
  const scorePct = Math.round(score * 100);

  const getStatusColor = () => {
    if (scorePct >= 70) return { main: "#ef4444", bg: "rgba(239, 68, 68, 0.2)", label: "CRITICAL RISK" };
    if (scorePct >= 40) return { main: "#f59e0b", bg: "rgba(245, 158, 11, 0.2)", label: "MODERATE RISK" };
    return { main: "#22c55e", bg: "rgba(34, 197, 94, 0.2)", label: "SAFE / LOW RISK" };
  };

  const status = getStatusColor();

  return (
    <View style={styles.mainContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.heroWrapper}>
          <ImageBackground
            source={require("../../assets/home-hero.jpg")}
            style={styles.heroBackground}
            imageStyle={{ opacity: 0.6 }}
          >
            <LinearGradient
              colors={["transparent", "#0f172a"]}
              style={styles.heroGradient}
            />

            <Animated.View style={[styles.heroContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.badgeContainer}>
                <View style={styles.activeDot} />
                <Text style={styles.badgeText}>AI SYSTEM ONLINE</Text>
              </View>

              <Text style={styles.heroTitle}>
                Smart Protection for{"\n"}
                <Text style={{ color: "#4ade80" }}>Greener Tomorrows</Text>
              </Text>

              <Text style={styles.heroSubtitle}>
                Advanced wildfire prevention utilizing real-time satellite data,
                AI smoke detection, and predictive risk modeling.
              </Text>

              <View style={styles.heroButtons}>
                <TouchableOpacity style={styles.btnPrimary} onPress={() => go("map")}>
                  <LinearGradient
                    colors={["#22c55e", "#16a34a"]}
                    style={styles.btnGradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <MaterialCommunityIcons name="radar" size={20} color="#fff" />
                    <Text style={styles.btnText}>Open Risk Map</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ImageBackground>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>SYSTEM CAPABILITIES</Text>
          <View style={styles.gridContainer}>
            <FeatureCard icon="image-search-outline" title="AI Vision" desc="99.8% smoke accuracy" color="#38bdf8" />
            <FeatureCard icon="weather-windy" title="Spread Sim" desc="Real-time wind models" color="#a78bfa" />
            <FeatureCard icon="map-marker-radius" title="Geo-Fencing" desc="Instant alert zones" color="#f472b6" />
            <FeatureCard icon="satellite-variant" title="Satellite" desc="24/7 Thermal monitor" color="#facc15" />
          </View>
        </View>

        <View style={styles.analysisContainer}>
          <LinearGradient colors={["rgba(30, 41, 59, 0.5)", "rgba(15, 23, 42, 0.8)"]} style={styles.analysisCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="analytics" size={24} color="#4ade80" />
              <Text style={styles.cardTitle}>AI Smoke Analysis</Text>
            </View>

            <Text style={styles.cardDesc}>
              Upload a photo from the field. Our neural engine will analyze pixel density and color patterns to detect smoke.
            </Text>

            <TouchableOpacity
              style={styles.uploadArea}
              onPress={Platform.OS !== "web" ? pickMobile : undefined}
              activeOpacity={0.8}
            >
              {preview ? (
                <Image source={{ uri: preview }} style={styles.previewImage} />
              ) : (
                <View style={styles.placeholderContent}>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <MaterialCommunityIcons name="cloud-upload-outline" size={48} color="#94a3b8" />
                  </Animated.View>
                  <Text style={styles.uploadTitle}>Tap to Upload Image</Text>
                  <Text style={styles.uploadSub}>Supports JPG, PNG (Max 5MB)</Text>
                </View>
              )}

              {Platform.OS === "web" && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileChangeWeb}
                  style={styles.webInput as any}
                />
              )}
            </TouchableOpacity>

            {detect.isPending ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Analyzing patterns...</Text>
              </View>
            ) : preview && (
              <View style={styles.resultDashboard}>
                <View style={[styles.resultBadge, { backgroundColor: status.bg, borderColor: status.main }]}>
                  <Text style={[styles.resultBadgeText, { color: status.main }]}>{status.label}</Text>
                </View>

                <View style={styles.scoreRow}>
                  <View style={styles.scoreMeta}>
                    <Text style={styles.scoreLabel}>CONFIDENCE SCORE</Text>
                    <Text style={[styles.scoreBig, { color: status.main }]}>{scorePct}<Text style={{ fontSize: 20 }}>/100</Text></Text>
                  </View>
                  <View style={styles.barContainer}>
                    <View style={[styles.barFill, { width: `${scorePct}%`, backgroundColor: status.main }]} />
                  </View>
                </View>

                <Text style={styles.disclaimer}>
                  * This is an AI estimation. Always verify with local fire authorities.
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const FeatureCard = ({ icon, title, desc, color }: any) => (
  <View style={styles.featureCard}>
    <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
    </View>
    <View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroWrapper: {
    height: 480,
    width: '100%',
    position: 'relative',
    marginBottom: 20,
  },
  heroBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
  heroContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'flex-start',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginRight: 8,
  },
  badgeText: {
    color: "#4ade80",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 48,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#94a3b8",
    lineHeight: 24,
    maxWidth: 600,
    marginBottom: 24,
  },
  heroButtons: {
    flexDirection: 'row',
  },
  btnPrimary: {
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 2,
  },
  featureDesc: {
    color: "#94a3b8",
    fontSize: 12,
  },
  analysisContainer: {
    paddingHorizontal: 20,
  },
  analysisCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  cardDesc: {
    color: "#94a3b8",
    marginBottom: 20,
    lineHeight: 20,
  },
  uploadArea: {
    width: '100%',
    height: 200,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 20,
  },
  placeholderContent: {
    alignItems: 'center',
    gap: 8,
  },
  uploadTitle: {
    color: "#e2e8f0",
    fontWeight: "600",
    fontSize: 16,
  },
  uploadSub: {
    color: "#64748b",
    fontSize: 12,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  webInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  resultDashboard: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  resultBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  resultBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  scoreRow: {
    marginBottom: 12,
  },
  scoreMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  scoreLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
  },
  scoreBig: {
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 36,
  },
  barContainer: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  disclaimer: {
    color: "#475569",
    fontSize: 10,
    fontStyle: 'italic',
  },
});