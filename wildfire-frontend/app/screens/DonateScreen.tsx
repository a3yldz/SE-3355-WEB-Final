import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Animated,
  Easing,
  ImageBackground,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const c = {
  bg: "#ffffff",
  panel: "#f9fafb",
  border: "rgba(0,0,0,0.08)",
  text: "#0f172a",
  muted: "#6b7280",
  accent: "#16a34a",
  accentBg: "#e8f5ee",
  warn: "#F4CE14",
};

export default function DonateScreen() {
  const monthPoolTL = 1860;
  const goalTL = 3000;
  const treesPlanted = 210;
  const animalsHelped = 37;
  const progress = Math.max(0, Math.min(1, monthPoolTL / goalTL));

  const onUploadPress = () =>
    Alert.alert("Report Incident", "Connect location + photo upload flow.");
  const donatePoints = () =>
    Alert.alert("Donate My Points", "100 points = ₺10 converted to pool (example).");
  const plantOneTree = async () => {
    try {
      await Linking.openURL("https://example.org/bir-fidan");
    } catch { }
  };

  const scale = useRef(new Animated.Value(0.92)).current;
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.05, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.95, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(sway, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(sway, { toValue: -1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [scale, sway]);
  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ["-5deg", "5deg"] });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={s.heroCard}>
          <View style={s.heroTopStripe} />
          <Text style={s.kicker}>Grow Together</Text>
          <Text style={s.heroTitle}>Report, verify; let your points become saplings</Text>
          <Text style={s.heroSub}>
            With community power, we catch fires at the earliest moment. Points are equally
            distributed between sapling planting and injured animal treatment at month end.
          </Text>

          <Animated.View
            style={[
              s.plantBubble,
              { transform: [{ scale }, { rotate }] },
            ]}
          >
            <MaterialIcons name="park" size={56} color={c.accent} />
          </Animated.View>

          <View style={{ width: "100%", marginTop: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={s.heroMeta}>Goal: {goalTL.toLocaleString("en-US")}₺</Text>
              <Text style={s.heroMeta}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressBar, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={[s.heroMeta, { marginTop: 6 }]}>
              Collected: <Text style={{ fontWeight: "900", color: c.text }}>{monthPoolTL}₺</Text>
            </Text>
          </View>

          <View style={s.ctaRow}>
            <TouchableOpacity style={s.ctaPrimary} onPress={donatePoints}>
              <MaterialIcons name="favorite" size={18} color="#0b2b1a" />
              <Text style={s.ctaPrimaryText}>Donate My Points</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ctaGhost} onPress={plantOneTree}>
              <MaterialIcons name="park" size={18} color={c.text} />
              <Text style={s.ctaGhostText}>Plant a Tree</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginHorizontal: 12, marginTop: 10 }}>
          <View style={s.bannerCard}>
            <ImageBackground
              source={{ uri: "https://images.unsplash.com/photo-1465101162946-4377e57745c3?q=80&w=1600&auto=format&fit=crop" }}
              style={StyleSheet.absoluteFill}
              imageStyle={{ resizeMode: "cover" }}
            />
            <View style={s.bannerOverlay} />
            <View style={s.bannerContent}>
              <Text style={s.bannerKicker}>Strong with Community</Text>
              <Text style={s.bannerTitle}>Planting our saplings, multiplying our hopes</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <TouchableOpacity style={s.ctaPrimary} onPress={donatePoints}>
                  <MaterialIcons name="favorite" size={18} color="#0b2b1a" />
                  <Text style={s.ctaPrimaryText}>Donate My Points</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={s.metricsRow}>
          <Metric label="This Month Donation" value={`${monthPoolTL}₺`} trend="+240₺" />
          <Metric label="Trees Planted" value={`${treesPlanted}`} trend="+12" />
          <Metric label="Animals Treated" value={`${animalsHelped}`} trend="+3" />
        </View>

        <Panel title="3 Steps to Contribute">
          <View style={s.stepsRow}>
            <Step icon="photo-camera" title="Report" desc="Add location + photo" onPress={onUploadPress} />
            <Step icon="thumb-up" title="Verify" desc="Confirm community reports" />
            <Step icon="volunteer-activism" title="Points to Trees" desc="100 points ≈ ₺10 impact" onPress={donatePoints} />
          </View>
        </Panel>

        <Panel title="Our Transparency Promise">
          <Bullet>100 points = <Text style={s.bold}>₺10</Text> converted to pool.</Bullet>
          <Bullet><Text style={s.bold}>50% of pool to saplings</Text>, <Text style={s.bold}>50% to animal treatment</Text>.</Bullet>
          <Bullet>Monthly reports and counters shared with everyone.</Bullet>
        </Panel>

        <Panel title="FAQ">
          <QA q="How do I earn points?" a="Report +10, verification +2. Daily limits apply." />
          <QA q="When is the donation conversion?" a="Convert points anytime; entered in month-end report." />
          <QA q="Can I stay anonymous?" a="Yes. We can show anonymous instead of your name on leaderboard." />
          <QA q="Is there a penalty for false reports?" a="Malicious repeats don't earn points, filtered by system." />
        </Panel>
      </ScrollView>

      <View pointerEvents="box-none" style={s.fabsWrap}>
        <TouchableOpacity style={[s.fab, { backgroundColor: c.accent }]} onPress={onUploadPress}>
          <MaterialIcons name="photo-camera" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[s.fab, { backgroundColor: c.warn }]} onPress={donatePoints}>
          <MaterialIcons name="favorite" size={22} color="#0b2b1a" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.panel}>
      <Text style={s.panelTitle}>{title}</Text>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

function Metric({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue}>{value}</Text>
      {!!trend && <Text style={s.metricTrend}>{trend}</Text>}
    </View>
  );
}

function Step({
  icon,
  title,
  desc,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  desc: string;
  onPress?: () => void;
}) {
  const Body = (
    <View style={s.step}>
      <View style={s.stepIcon}>
        <MaterialIcons name={icon} size={18} color={c.accent} />
      </View>
      <Text style={s.stepTitle}>{title}</Text>
      <Text style={s.stepDesc}>{desc}</Text>
    </View>
  );
  if (!onPress) return Body;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      {Body}
    </TouchableOpacity>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Text style={{ color: c.accent, marginTop: Platform.OS === "ios" ? 2 : 0 }}>•</Text>
      <Text style={s.body}>{children}</Text>
    </View>
  );
}

function QA({ q, a }: { q: string; a: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.qaQ}>{q}</Text>
      <Text style={s.qaA}>{a}</Text>
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  android: { elevation: 3 },
});

const s = StyleSheet.create({
  heroCard: {
    backgroundColor: c.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 18,
    marginHorizontal: 12,
    marginTop: 12,
    alignItems: "center",
    ...cardShadow,
  },
  heroTopStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: c.accent,
    opacity: 0.25,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  kicker: { color: c.accent, fontWeight: "900", letterSpacing: 0.2, marginBottom: 6 },
  heroTitle: { color: c.text, fontWeight: "900", fontSize: 24, textAlign: "center" },
  heroSub: {
    color: c.muted,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 720,
    marginTop: 6,
  },
  plantBubble: {
    marginTop: 10,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: c.accentBg,
    alignItems: "center",
    justifyContent: "center",
  },
  heroMeta: { color: c.muted, fontSize: 12 },
  progressTrack: {
    height: 10,
    backgroundColor: "#edf2f7",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 6,
  },
  progressBar: { height: "100%", backgroundColor: c.accent },

  ctaRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  ctaPrimary: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: c.warn,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  ctaPrimaryText: { color: "#0b2b1a", fontWeight: "900" },
  ctaGhost: {
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  ctaGhostText: { color: c.text, fontWeight: "800" },

  bannerCard: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: c.border,
    ...cardShadow,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  bannerContent: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  bannerKicker: { color: "#065f46", fontWeight: "900", fontSize: 12, marginBottom: 4 },
  bannerTitle: { color: c.text, fontSize: 18, fontWeight: "900", lineHeight: 24 },

  metricsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    marginVertical: 12,
  },
  metric: {
    flex: 1,
    backgroundColor: c.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 16,
    alignItems: "center",
    ...cardShadow,
  },
  metricLabel: { color: c.muted, fontSize: 12 },
  metricValue: { color: c.text, fontSize: 20, fontWeight: "900", marginTop: 2 },
  metricTrend: { color: "#16a34a", fontSize: 12, marginTop: 4 },

  panel: {
    backgroundColor: c.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    ...cardShadow,
  },
  panelTitle: { color: c.text, fontWeight: "800", marginBottom: 10 },
  body: { color: c.muted, fontSize: 14, lineHeight: 20 },
  qaQ: { color: c.text, fontWeight: "800" },
  qaA: { color: c.muted },

  stepsRow: { flexDirection: "row", gap: 10, justifyContent: "space-between" },
  step: { flex: 1, alignItems: "center", paddingHorizontal: 6 },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  stepTitle: { color: c.text, fontWeight: "800" },
  stepDesc: { color: c.muted, fontSize: 12, textAlign: "center", marginTop: 2 },

  bold: { color: c.text, fontWeight: "900" },

  fabsWrap: {
    position: "absolute",
    right: 16,
    bottom: 24,
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
  },
});
