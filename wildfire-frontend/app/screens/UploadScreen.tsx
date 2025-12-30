import React, { useState } from "react";
import { View, Text, Image, Platform, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useSmokeDetectMock } from "../hooks/useSmokeDetectMock";

export default function UploadScreen() {
    const [preview, setPreview] = useState<string | null>(null);
    const detect = useSmokeDetectMock();

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
            setPreview(result.assets[0].uri);
            await detect.mutateAsync({ file: { uri: result.assets[0].uri, name: 'upload.jpg', type: 'image/jpeg' } as any });
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
    const scorePct = (score * 100).toFixed(1);

    const getRiskColor = (val: number) => {
        if (val >= 0.7) return "#ef4444";
        if (val >= 0.4) return "#f59e0b";
        return "#22c55e";
    };

    const riskColor = getRiskColor(score);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["#0f172a", "#1e293b"]}
                style={styles.background}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.iconBox}>
                        <MaterialCommunityIcons name="cloud-upload-outline" size={28} color="#4ade80" />
                    </View>
                    <View>
                        <Text style={styles.title}>Smoke Analysis</Text>
                        <Text style={styles.subtitle}>Upload visuals for AI inspection</Text>
                    </View>
                </View>

                <View style={styles.mainGrid}>
                    <View style={styles.cardContainer}>
                        <View style={styles.previewBox}>
                            {preview ? (
                                <Image source={{ uri: preview }} style={styles.image} />
                            ) : (
                                <View style={styles.placeholder}>
                                    <Ionicons name="image-outline" size={64} color="#334155" />
                                    <Text style={styles.placeholderText}>No Image Selected</Text>
                                </View>
                            )}

                            {detect.isPending && (
                                <View style={styles.loaderOverlay}>
                                    <ActivityIndicator size="large" color="#22c55e" />
                                    <Text style={styles.loaderText}>Analyzing...</Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={Platform.OS !== "web" ? pickImage : undefined}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={["#22c55e", "#16a34a"]}
                                style={styles.gradientBtn}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                <Ionicons name="camera" size={20} color="#fff" />
                                <Text style={styles.btnText}>Select Photo</Text>
                            </LinearGradient>

                            {Platform.OS === "web" && (
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={onFileChangeWeb}
                                    style={styles.webInput as any}
                                />
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoContainer}>
                        <View style={styles.statsCard}>
                            <Text style={styles.statsTitle}>DETECTION RESULTS</Text>

                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreLabel}>Confidence Score</Text>
                                <Text style={[styles.scoreValue, { color: riskColor }]}>{scorePct}%</Text>
                            </View>

                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${Math.min(score * 100, 100)}%`, backgroundColor: riskColor }]} />
                            </View>

                            <View style={styles.badgeRow}>
                                <View style={[styles.badge, { borderColor: riskColor, backgroundColor: `${riskColor}20` }]}>
                                    <Text style={[styles.badgeText, { color: riskColor }]}>
                                        {score >= 0.7 ? "HIGH RISK" : score >= 0.4 ? "MODERATE" : "LOW RISK"}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {detect.data?.gradcam_url && (
                            <View style={styles.gradCamCard}>
                                <MaterialCommunityIcons name="layers-outline" size={24} color="#94a3b8" />
                                <View>
                                    <Text style={styles.gradTitle}>Grad-CAM Layer Ready</Text>
                                    <Text style={styles.gradDesc}>Heatmap overlay available for map visualization.</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f172a",
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
        gap: 16,
    },
    iconBox: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: "rgba(30, 41, 59, 0.5)",
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
    },
    title: {
        color: "#f8fafc",
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    subtitle: {
        color: "#94a3b8",
        fontSize: 14,
        marginTop: 4,
    },
    mainGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 24,
    },
    cardContainer: {
        flex: 1,
        minWidth: 300,
        gap: 16,
    },
    previewBox: {
        height: 300,
        backgroundColor: "#020617",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#334155",
        borderStyle: "dashed",
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    image: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    placeholder: {
        alignItems: 'center',
        gap: 12,
        opacity: 0.5,
    },
    placeholderText: {
        color: "#94a3b8",
        fontSize: 16,
        fontWeight: "600",
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    loaderText: {
        color: "#22c55e",
        marginTop: 12,
        fontWeight: "600",
    },
    uploadButton: {
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: "#22c55e",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    gradientBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    btnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    webInput: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
        cursor: 'pointer',
    },
    infoContainer: {
        flex: 1,
        minWidth: 280,
        gap: 16,
    },
    statsCard: {
        backgroundColor: "rgba(30, 41, 59, 0.5)",
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
    },
    statsTitle: {
        color: "#64748b",
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1,
        marginBottom: 20,
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 12,
    },
    scoreLabel: {
        color: "#e2e8f0",
        fontSize: 14,
        fontWeight: "600",
    },
    scoreValue: {
        fontSize: 32,
        fontWeight: "800",
        lineHeight: 32,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 20,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    badgeRow: {
        flexDirection: 'row',
    },
    badge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    gradCamCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        borderRadius: 16,
        padding: 16,
        gap: 16,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
    },
    gradTitle: {
        color: "#e2e8f0",
        fontWeight: "600",
        fontSize: 14,
    },
    gradDesc: {
        color: "#64748b",
        fontSize: 12,
        marginTop: 2,
        maxWidth: 200,
    },
});