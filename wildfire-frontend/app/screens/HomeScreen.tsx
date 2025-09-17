// app/screens/HomeScreen.tsx
import React, { useState } from "react";
import { View, Text, Image, Platform, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { colors } from "../theme";
import { useNavStore } from "../store/useNavStore";
import { useSmokeDetectMock } from "../hooks/useSmokeDetectMock";

export default function HomeScreen() {
  const go = useNavStore((s) => s.go);
  const detect = useSmokeDetectMock();
  const [preview, setPreview] = useState<string | null>(null);

  const pickMobile = async () => {
    try {
      const ImagePicker = await import("expo-image-picker");
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const res = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        quality: 0.8 
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

  // Duman skoruna göre renk belirleme
  const getScoreColor = (score: number | undefined) => {
    if (!score) return colors.mutetext;
    if (score >= 0.7) return '#e74c3c'; // Yüksek risk - kırmızı
    if (score >= 0.4) return '#f39c12'; // Orta risk - turuncu
    return '#27ae60'; // Düşük risk - yeşil
  };

  const score = detect.data?.score_smoke ?? 0;
  const scorePercentage = Math.round(score * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* HERO SECTION */}
      <View style={styles.heroContainer}>
        <Text style={styles.title}>GreenTopia: Akıllı Koruma, Yeşil Yarınlar</Text>
        <Text style={styles.subtitle}>
          Yangın riskini önceden tespit edin, doğayı koruyun. Hava verileriyle anlık yangın risk haritası, 
          fotoğraflardan duman tespiti ve ileri yayılım simülasyonu ile etkili müdahale planı oluşturun.
        </Text>
      </View>

      {/* UPLOAD SECTION */}
      <View style={styles.uploadSection}>
        <TouchableOpacity 
          style={styles.uploadContainer}
          onPress={Platform.OS !== 'web' ? pickMobile : undefined}
          activeOpacity={0.7}
        >
          {preview ? (
            <Image source={{ uri: preview }} style={styles.previewImage} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <View style={styles.uploadIcon}>
                <Text style={styles.uploadIconText}>📷</Text>
              </View>
              <Text style={styles.uploadText}>Fotoğrafınızı sürükleyin veya seçin</Text>
              <Text style={styles.uploadSubtext}>JPEG, PNG - Maksimum 5MB</Text>
            </View>
          )}
          
          {Platform.OS === "web" && (
            <input
              type="file"
              accept="image/*"
              onChange={onFileChangeWeb}
              style={styles.hiddenFileInput}
            />
          )}
        </TouchableOpacity>
        
        <View style={styles.buttonContainer}>
          {Platform.OS === "web" ? (
            <label htmlFor="file-upload" style={styles.uploadButton}>
              <Text style={styles.buttonText}>Fotoğraf Seç</Text>
            </label>
          ) : (
            <TouchableOpacity onPress={pickMobile} style={styles.uploadButton}>
              <Text style={styles.buttonText}>Fotoğraf Yükle</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => go("map")} style={styles.mapButton}>
            <Text style={styles.buttonText}>Haritayı Görüntüle</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* RESULTS SECTION */}
      <View style={styles.resultsContainer}>
        <View style={styles.scoreCard}>
          <Text style={styles.cardTitle}>Duman Tespit Skoru</Text>
          <Text style={styles.cardDescription}>
            Yüklenen fotoğraftaki duman olasılığı (0-100 arası). Bu skor, risk analizi ve 
            yayılım simülasyonu için kullanılır.
          </Text>
          
          <View style={styles.scoreCircleContainer}>
            <View style={styles.scoreCircle}>
              <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>
                {scorePercentage}
              </Text>
              <Text style={styles.scoreLabel}>/100</Text>
            </View>
            <View style={styles.scoreIndicator}>
              <View style={[styles.scoreIndicatorFill, { width: `${scorePercentage}%` }]} />
            </View>
          </View>
        </View>

        <View style={styles.flowCard}>
          <Text style={styles.cardTitle}>İşleyiş Akışı</Text>
          <View style={styles.flowSteps}>
            <View style={styles.flowStep}>
              <View style={styles.flowNumberContainer}>
                <Text style={styles.flowNumber}>1</Text>
              </View>
              <Text style={styles.flowText}>Fotoğraf Yükleme</Text>
            </View>
            
            <View style={styles.flowArrow}>
              <Text style={styles.flowArrowText}>→</Text>
            </View>
            
            <View style={styles.flowStep}>
              <View style={styles.flowNumberContainer}>
                <Text style={styles.flowNumber}>2</Text>
              </View>
              <Text style={styles.flowText}>Duman Analizi</Text>
            </View>
            
            <View style={styles.flowArrow}>
              <Text style={styles.flowArrowText}>→</Text>
            </View>
            
            <View style={styles.flowStep}>
              <View style={styles.flowNumberContainer}>
                <Text style={styles.flowNumber}>3</Text>
              </View>
              <Text style={styles.flowText}>Yayılım Simülasyonu</Text>
            </View>
            
            <View style={styles.flowArrow}>
              <Text style={styles.flowArrowText}>→</Text>
            </View>
            
            <View style={styles.flowStep}>
              <View style={styles.flowNumberContainer}>
                <Text style={styles.flowNumber}>4</Text>
              </View>
              <Text style={styles.flowText}>Müdahale Planı</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contentContainer: {
    padding: 16,
  },
  heroContainer: {
    borderRadius: 16,
    padding: 24,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.stroke,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    color: colors.pine,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    color: colors.mutetext,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  uploadSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  uploadContainer: {
    width: '100%',
    maxWidth: 400,
    height: 200,
    backgroundColor: colors.panelAlt,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.forest,
    borderStyle: 'dashed',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  uploadIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.teal + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadIconText: {
    fontSize: 24,
  },
  uploadText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadSubtext: {
    color: colors.mutetext,
    fontSize: 14,
    textAlign: 'center',
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: 'cover',
  },
  hiddenFileInput: {
    display: 'none',
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  uploadButton: {
    backgroundColor: colors.forest,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapButton: {
    backgroundColor: colors.teal,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  resultsContainer: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
    justifyContent: 'center',
  },
  scoreCard: {
    flex: 1,
    minWidth: 300,
    maxWidth: 500,
    backgroundColor: colors.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.stroke,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  flowCard: {
    flex: 1,
    minWidth: 300,
    maxWidth: 500,
    backgroundColor: colors.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.stroke,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    color: colors.pine,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  cardDescription: {
    color: colors.mutetext,
    marginBottom: 20,
    lineHeight: 20,
  },
  scoreCircleContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: colors.moss + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: colors.panelAlt,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  scoreLabel: {
    color: colors.mutetext,
    fontSize: 14,
    marginTop: 4,
  },
  scoreIndicator: {
    width: '100%',
    height: 8,
    backgroundColor: colors.panelAlt,
    borderRadius: 4,
    overflow: "hidden",
  },
  scoreIndicatorFill: {
    height: "100%",
    backgroundColor: colors.forest,
    borderRadius: 4,
  },
  flowSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  flowStep: {
    alignItems: 'center',
    minWidth: 80,
    marginVertical: 10,
    flex: 1,
  },
  flowNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  flowNumber: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  flowText: {
    color: colors.text,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  flowArrow: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 20,
    paddingTop: 20,
  },
  flowArrowText: {
    color: colors.mutetext,
    fontWeight: '700',
    fontSize: 18,
  },
});

