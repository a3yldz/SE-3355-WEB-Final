import React, { useEffect, useMemo, useRef } from "react";
import maplibregl, { Map, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Point } from "geojson";
import { colorForRisk } from "../../utils/colors";

// ---- Types
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
  hotThreshold?: number; // ✅ yeni: hotspot eşiği (default 0.75)
  onRiskCellPress?: (p: any) => void;
  onViewportChange?: (bbox: BBox) => void;
};

export default function WebMap({
  initialCenter,
  initialZoom = 8,
  riskGeoJSON,
  riskOpacity = 0.9,
  hotThreshold = 0.75,
  onRiskCellPress,
  onViewportChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  // 1) Map init / dispose
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const m = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: initialCenter,
      zoom: initialZoom,
    });
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));

    // Viewport'i üst bileşene bildirmek istersek:
    const fireViewport = () => {
      if (!onViewportChange) return;
      const b = m.getBounds();
      onViewportChange({
        minLon: b.getWest(),
        minLat: b.getSouth(),
        maxLon: b.getEast(),
        maxLat: b.getNorth(),
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

  // 2) Risk verisini renklendir (prop'ta yoksa hesapla)
  const colored: RiskFC = useMemo(() => {
    if (!riskGeoJSON) return { type: "FeatureCollection", features: [] };
    const features = riskGeoJSON.features.map((f: any) => {
      const props: RiskProps = { ...(f.properties ?? {}) };
      const clr = props.color ?? colorForRisk(Number(props.risk ?? 0));
      return { ...f, properties: { ...props, color: clr } };
    });
    return { type: "FeatureCollection", features };
  }, [riskGeoJSON]);

  // 3) Source/layer ekle-güncelle + hotspot + tekil click handler
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    const sourceId = "risk-src";
    const baseLayerId = "risk-layer";
    const hotLayerId = "risk-hot-layer";

    const coerceNum = (v: any) => (typeof v === "string" ? Number(v) : v);
    const handleClick = (e: any) => {
      if (!onRiskCellPress) return;
      const f = e.features?.[0] as any;
      const p = (f?.properties ?? {}) as RiskProps;
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

    const addOrUpdate = () => {
      // source
      if (!m.getSource(sourceId)) {
        m.addSource(sourceId, { type: "geojson", data: colored });
      } else {
        (m.getSource(sourceId) as GeoJSONSource).setData(colored);
      }

      // temel (tüm noktalar)
      if (!m.getLayer(baseLayerId)) {
        m.addLayer({
          id: baseLayerId,
          type: "circle",
          source: sourceId,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2, 12, 6],
            "circle-opacity": riskOpacity,
            "circle-color": ["case", ["has", "color"], ["get", "color"], "#888"],
          },
        });
      } else {
        m.setPaintProperty(baseLayerId, "circle-opacity", riskOpacity);
      }

      // ✅ HOTSPOT katmanı (eşik ve üstü – üstte dursun)
      if (!m.getLayer(hotLayerId)) {
        m.addLayer({
          id: hotLayerId,
          type: "circle",
          source: sourceId,
          filter: [">=", ["get", "risk"], hotThreshold],
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 4, 12, 10],
            "circle-opacity": 0.95,
            "circle-color": ["case", ["has", "color"], ["get", "color"], "#f00"],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 0.8,
          },
        });
      } else {
        // eşik değişirse filtreyi güncelle
        m.setFilter(hotLayerId, [">=", ["get", "risk"], hotThreshold]);
      }

      // interactivity (tek handler, iki layer’a da bağla)
      m.getCanvas().style.cursor = "";
      m.off("click", baseLayerId, handleClick as any);
      m.off("click", hotLayerId, handleClick as any);
      m.on("click", baseLayerId, handleClick as any);
      m.on("click", hotLayerId, handleClick as any);
      m.on("mouseenter", baseLayerId, () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseenter", hotLayerId, () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", baseLayerId, () => (m.getCanvas().style.cursor = ""));
      m.on("mouseleave", hotLayerId, () => (m.getCanvas().style.cursor = ""));
    };

    if (m.isStyleLoaded()) addOrUpdate();
    else m.once("load", addOrUpdate);
  }, [colored, riskOpacity, hotThreshold, onRiskCellPress]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
