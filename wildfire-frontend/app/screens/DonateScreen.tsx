// app/screens/BirlikteYeserScreen.tsx (ported)
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

/** Yerel, sade palet (tema bağımsız) */
const c = {
  bg: "#ffffff",
  panel: "#f9fafb",
  border: "rgba(0,0,0,0.08)",
  text: "#0f172a",     // slate-900
  muted: "#6b7280",    // slate-500
  accent: "#16a34a",   // green-600
  accentBg: "#e8f5ee",
  warn: "#F4CE14",
};

export default function DonateScreen() {
  // (Mock) metrikler
  const monthPoolTL = 1860;
  const goalTL = 3000;
  const treesPlanted = 210;
  const animalsHelped = 37;
  const progress = Math.max(0, Math.min(1, monthPoolTL / goalTL));

  // Aksiyonlar (şimdilik stub)
  const onUploadPress = () =>
    Alert.alert("İhbar Et", "Konum + fotoğraf yükleme akışını bağlayın.");
  const donatePoints = () =>
    Alert.alert("Puanımı Bağışla", "100 puan = 10₺ havuza çevrilir (örnek).");
  const plantOneTree = async () => {
    try {
      await Linking.openURL("https://example.org/bir-fidan");
    } catch {}
  };

  // 🌱 Basit “fidan büyüme” animasyonu (dosyasız)
  const scale = useRef(new Animated.Value(0.92)).current;
  const sway = useRef(new Animated.Value(0)).current; // -1..1
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
        contentContainerStyle={{ paddingBottom: 120 /* FAB boşluğu */ }}
      >
        {/* HERO */}
        <View style={s.heroCard}>
          {/* üstte ince yeşil şerit */}
          <View style={s.heroTopStripe} />
          <Text style={s.kicker}>Birlikte Yeşer</Text>
          <Text style={s.heroTitle}>İhbar et, doğrula; puanın fidana dönüşsün</Text>
          <Text style={s.heroSub}>
            Topluluk gücüyle yangınları en erken anda yakalıyoruz. Puanlar ay sonunda
            fidan dikimi ve yaralı hayvanların tedavisine eşit pay edilir.
          </Text>

          {/* 🌱 animasyon */}
          <Animated.View
            style={[
              s.plantBubble,
              { transform: [{ scale }, { rotate }] },
            ]}
          >
            <MaterialIcons name="park" size={56} color={c.accent} />
          </Animated.View>

          {/* hedef/ilerleme çubuğu */}
          <View style={{ width: "100%", marginTop: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={s.heroMeta}>Hedef: {goalTL.toLocaleString("tr-TR")}₺</Text>
              <Text style={s.heroMeta}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressBar, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={[s.heroMeta, { marginTop: 6 }]}>
              Toplanan: <Text style={{ fontWeight: "900", color: c.text }}>{monthPoolTL}₺</Text>
            </Text>
          </View>

          {/* CTA'lar */}
          <View style={s.ctaRow}>
            <TouchableOpacity style={s.ctaPrimary} onPress={donatePoints}>
              <MaterialIcons name="favorite" size={18} color="#0b2b1a" />
              <Text style={s.ctaPrimaryText}>Puanımı Bağışla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ctaGhost} onPress={plantOneTree}>
              <MaterialIcons name="park" size={18} color={c.text} />
              <Text style={s.ctaGhostText}>Bir Fidan Dik</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* İlham banner (uzak görsel; istersen kendi dosyanla değiştir) */}
        <View style={{ marginHorizontal: 12, marginTop: 10 }}>
          <View style={s.bannerCard}>
            <ImageBackground
              source={{ uri: "https://images.unsplash.com/photo-1465101162946-4377e57745c3?q=80&w=1600&auto=format&fit=crop" }}
              style={StyleSheet.absoluteFill}
              imageStyle={{ resizeMode: "cover" }}
            />
            <View style={s.bannerOverlay} />
            <View style={s.bannerContent}>
              <Text style={s.bannerKicker}>Toplulukla Güçlü</Text>
              <Text style={s.bannerTitle}>Fidanlarımızı ekiyor, umutlarımızı çoğaltıyoruz</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <TouchableOpacity style={s.ctaPrimary} onPress={donatePoints}>
                  <MaterialIcons name="favorite" size={18} color="#0b2b1a" />
                  <Text style={s.ctaPrimaryText}>Puanımı Bağışla</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Sayaçlar */}
        <View style={s.metricsRow}>
          <Metric label="Bu Ay Bağış" value={`${monthPoolTL}₺`} trend="+240₺" />
          <Metric label="Dikilen Fidan" value={`${treesPlanted}`} trend="+12" />
          <Metric label="Tedavi (Hayvan)" value={`${animalsHelped}`} trend="+3" />
        </View>

        {/* 3 Adım */}
        <Panel title="3 Adımda Katkı">
          <View style={s.stepsRow}>
            <Step icon="photo-camera" title="İhbar Et" desc="Konum + fotoğraf ekle" onPress={onUploadPress} />
            <Step icon="thumb-up" title="Doğrula" desc="Topluluk ihbarlarını onayla" />
            <Step icon="volunteer-activism" title="Puanı Fidan Yap" desc="100 puan ≈ 10₺ etki" onPress={donatePoints} />
          </View>
        </Panel>

        {/* Şeffaflık Sözümüz */}
        <Panel title="Şeffaflık Sözümüz">
          <Bullet>100 puan = <Text style={s.bold}>10₺</Text> havuza çevrilir.</Bullet>
          <Bullet>Havuzun <Text style={s.bold}>%50’si fidan</Text>, <Text style={s.bold}>%50’si hayvan tedavisine</Text> ayrılır.</Bullet>
          <Bullet>Aylık rapor ve sayaçlar herkesle paylaşılır.</Bullet>
        </Panel>

        {/* SSS */}
        <Panel title="Sık Sorulanlar">
          <QA q="Puanları nasıl kazanırım?" a="İhbar +10, doğrulama +2. Günlük sınırlar uygulanır." />
          <QA q="Bağışa dönüştürme ne zaman olur?" a="İstediğin an puanı dönüştürürsün; ay sonunda rapora girer." />
          <QA q="Anonim kalabilir miyim?" a="Evet. Liderlikte ismin yerine anonim gösterebiliriz." />
          <QA q="Yanlış ihbar cezası var mı?" a="Kötü niyetli tekrarlar puan kazanmaz, sistem tarafından filtrelenir." />
        </Panel>
      </ScrollView>

      {/* FAB'ler (mobil aksiyon kısayolları) */}
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

/* -------------------- küçük bileşenler -------------------- */

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

/* -------------------- stiller -------------------- */

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



