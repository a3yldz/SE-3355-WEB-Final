// app/components/MapUniversal/WebMap.tsx
import React, { useEffect, useMemo, useRef } from "react";
import maplibregl, { Map, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Point } from "geojson";
import { colorForRisk } from "../../utils/color";

type RiskFC = FeatureCollection<Point, { risk: number; color?: string }>;

export default function WebMap({
  initialCenter,
  initialZoom = 8,
  riskGeoJSON,
  riskOpacity = 0.9,
}: any) {
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
    mapRef.current = m;

    return () => {
      m.remove();
      mapRef.current = null;
    };
    // initialCenter/Zoom ile yeniden kurmak istemiyorsak deps boş kalabilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Risk verisini renklendir
  const colored: RiskFC = useMemo(() => {
    if (!riskGeoJSON) return { type: "FeatureCollection", features: [] };
    const features = riskGeoJSON.features.map((f: any) => ({
      ...f,
      properties: {
        ...(f.properties ?? {}),
        color: colorForRisk(f.properties?.risk ?? 0),
      },
    }));
    return { type: "FeatureCollection", features };
  }, [riskGeoJSON]);

  // 3) Source/layer ekle-güncelle
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    const sourceId = "risk-src";
    const layerId = "risk-layer";

    const addOrUpdate = () => {
      // source
      if (!m.getSource(sourceId)) {
        m.addSource(sourceId, { type: "geojson", data: colored });
      } else {
        (m.getSource(sourceId) as GeoJSONSource).setData(colored);
      }

      // layer
      if (!m.getLayer(layerId)) {
        m.addLayer({
          id: layerId,
          type: "circle",
          source: sourceId,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2, 12, 6],
            "circle-opacity": riskOpacity,
            "circle-color": ["case", ["has", "color"], ["get", "color"], "#888"],
          },
        });
      } else {
        m.setPaintProperty(layerId, "circle-opacity", riskOpacity);
      }
    };

    if (m.isStyleLoaded()) addOrUpdate();
    else m.once("load", addOrUpdate);
  }, [colored, riskOpacity]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
