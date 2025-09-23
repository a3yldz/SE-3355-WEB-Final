
import React, { useEffect, useMemo, useRef } from "react";
import maplibregl, { Map, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Point } from "geojson";
import { colorForRisk } from "../../utils/colors";

type RiskProps = {
  risk: number;
  color?: string;
  temp?: number;
  rh?: number;
  wind?: number;
  wind_dir?: number;
  [k: string]: any;
};
type RiskFC = FeatureCollection<Point, RiskProps>;

type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number };

type Props = {
  initialCenter: [number, number];
  initialZoom?: number;
  riskGeoJSON?: RiskFC;
  riskOpacity?: number;
  hotThreshold?: number;
  onRiskCellPress?: (p: any) => void;
  onViewportChange?: (bbox: BBox) => void;
  onMapClick?: (lngLat: [number, number]) => void;
  markers?: Array<{ id: string; coord: [number, number] }>;
};

export default function WebMap({
  initialCenter,
  initialZoom = 8,
  riskGeoJSON,
  riskOpacity = 0.9,
  onRiskCellPress,
  onViewportChange,
  onMapClick,
  markers,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  // 1) Harita başlatma (değişiklik yok)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const m = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: initialCenter,
      zoom: initialZoom,
    });
    m.boxZoom.disable();
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));
    m.on("click", (e) => {
      const ev = (e as any)?.originalEvent as MouseEvent | undefined;
      if (ev?.shiftKey && onMapClick) {
        onMapClick([e.lngLat.lng, e.lngLat.lat]);
      }
    });

    const fireViewport = () => {
      if (!onViewportChange) return;
      const b = m.getBounds();
      onViewportChange({
        minLon: b.getWest(), minLat: b.getSouth(),
        maxLon: b.getEast(), maxLat: b.getNorth(),
      });
    };
    m.once("load", fireViewport);
    m.on("moveend", fireViewport);

    mapRef.current = m;

    return () => {
      m.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Risk verisini renklendirme (değişiklik yok)
  const colored: RiskFC = useMemo(() => {
    if (!riskGeoJSON) return { type: "FeatureCollection", features: [] };
    const features = riskGeoJSON.features.map((f: any) => {
      const props: RiskProps = { ...(f.properties ?? {}) };
      const clr = props.color ?? colorForRisk(Number(props.risk ?? 0));
      return { ...f, properties: { ...props, color: clr } };
    });
    return { type: "FeatureCollection", features };
  }, [riskGeoJSON]);

  // 3) Kaynakları ve Katmanları yöneten ana useEffect (BASİTLEŞTİRİLDİ)
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    const riskSourceId = "risk-src";
    const heatmapLayerId = "risk-heatmap-layer";
    const clickablePointsLayerId = "risk-clickable-points";

    const handleClick = (e: any) => {
        if (!onRiskCellPress) return;
        const f = e.features?.[0] as any;
        if (!f) return;
        const p = (f.properties ?? {}) as RiskProps;
        const coerceNum = (v: any) => (typeof v === "string" ? Number(v) : v);
        onRiskCellPress({
          ...p,
          risk: coerceNum(p.risk),
          temp: coerceNum(p.temp),
          rh: coerceNum(p.rh),
          wind: coerceNum(p.wind),
          wind_dir: coerceNum(p.wind_dir),
          coord: f?.geometry?.coordinates,
        });
    };

    const addOrUpdateLayers = () => {
      if (!m.getSource(riskSourceId)) {
        m.addSource(riskSourceId, { type: "geojson", data: colored });
      } else {
        (m.getSource(riskSourceId) as GeoJSONSource).setData(colored);
      }

      // 1. Heatmap Katmanı
      if (!m.getLayer(heatmapLayerId)) {
        m.addLayer({
          id: heatmapLayerId, type: "heatmap", source: riskSourceId, maxzoom: 14,
          paint: {
            "heatmap-weight": ["get", "risk"],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 5, 1, 9, 2.5],
            "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,255,0)", 0.1, "royalblue", 0.3, "cyan", 0.5, "lime", 0.7, "yellow", 1, "red"],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 5, 20, 12, 50], // Yarıçapı biraz artırarak daha dolgun bir görünüm elde edebiliriz
            "heatmap-opacity": riskOpacity,
          },
        });
      } else {
        m.setPaintProperty(heatmapLayerId, "heatmap-opacity", riskOpacity);
      }
      
      // MASK KATMANI LOGIĞI TAMAMEN KALDIRILDI, ÇÜNKÜ GEREKLİ DEĞİL.

      // 2. Görünmez Tıklama Katmanı
      if (!m.getLayer(clickablePointsLayerId)) {
        m.addLayer({
          id: clickablePointsLayerId, type: "circle", source: riskSourceId,
          paint: { "circle-radius": 10, "circle-color": "transparent" },
        });
      }

      // Interactivity
      m.getCanvas().style.cursor = "";
      m.off("click", clickablePointsLayerId, handleClick);
      m.on("click", clickablePointsLayerId, handleClick);
      m.on("mouseenter", clickablePointsLayerId, () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", clickablePointsLayerId, () => { m.getCanvas().style.cursor = ""; });
    };

    if (m.isStyleLoaded()) {
      addOrUpdateLayers();
    } else {
      m.once("load", addOrUpdateLayers);
    }
  }, [colored, riskOpacity, onRiskCellPress, onMapClick]);

  // 4) Marker katmanı (değişiklik yok)
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const srcId = "custom-markers-src";
    const layerId = "custom-markers-layer";

    const fc: FeatureCollection<Point, any> = {
      type: "FeatureCollection",
      features: (markers || []).map((mk) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: mk.coord },
        properties: { id: mk.id },
      })),
    };

    const ensureImage = async () => {
      if (m.hasImage("fire-station")) return;
      await new Promise<void>((resolve) => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path fill="#ef4444" d="M12 2c2 3 6 4 6 9 0 3.866-3.134 7-7 7s-7-3.134-7-7c0-2.89 1.5-4.88 3.5-6.5C7.5 7 10 9 10 12a2 2 0 1 0 4 0c0-2-.5-3.5-2-6z"/><path fill="#fff" d="M11 11h2v6h-2z"/></svg>';
        const img = new Image(32, 32);
        img.onload = () => {
          if (!m.hasImage("fire-station")) m.addImage("fire-station", img as any, { pixelRatio: 2 });
          resolve();
        };
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      });
    };

    const addOrUpdate = async () => {
      await ensureImage();
      if (!m.getSource(srcId)) {
        m.addSource(srcId, { type: "geojson", data: fc });
      } else {
        (m.getSource(srcId) as GeoJSONSource).setData(fc);
      }
      if (!m.getLayer(layerId)) {
        m.addLayer({
          id: layerId,
          type: "symbol",
          source: srcId,
          layout: {
            "icon-image": "fire-station",
            "icon-size": 1,
            "icon-allow-overlap": true,
          },
        });
      }
    };

    if (m.isStyleLoaded()) addOrUpdate();
    else m.once("load", () => addOrUpdate());
  }, [markers]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}