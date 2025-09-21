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
  onMapClick?: (lngLat: [number, number]) => void;
  markers?: Array<{ id: string; coord: [number, number] }>;
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
    // Genel tıklama
    m.on("click", (e) => {
      if (onMapClick) onMapClick([e.lngLat.lng, e.lngLat.lat]);
    });

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

  // 4) Marker layer (fire-station symbol)
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

    const ensureImage = () => {
      if (!m.hasImage("fire-station")) {
        const svg =
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path fill="#ef4444" d="M12 2c2 3 6 4 6 9 0 3.866-3.134 7-7 7s-7-3.134-7-7c0-2.89 1.5-4.88 3.5-6.5C7.5 7 10 9 10 12a2 2 0 1 0 4 0c0-2-.5-3.5-2-6z"/><path fill="#fff" d="M11 11h2v6h-2z"/></svg>';
        const img = new Image(32, 32);
        img.onload = () => m.addImage("fire-station", img as any, { pixelRatio: 2 });
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      }
    };

    const addOrUpdate = () => {
      ensureImage();
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
    else m.once("load", addOrUpdate);
  }, [markers]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
