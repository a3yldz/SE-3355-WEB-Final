import React, { useEffect, useMemo, useRef } from "react";
import maplibregl, { Map, GeoJSONSource, LngLatBoundsLike } from "maplibre-gl";
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
  // backend ileride eklerse sorun olmasın:
  [k: string]: any;
};

type RiskFC = FeatureCollection<Point, RiskProps>;

type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number };

type Props = {
  initialCenter: [number, number];
  initialZoom?: number;
  riskGeoJSON?: RiskFC;
  riskOpacity?: number;
  onRiskCellPress?: (p: any) => void;
  onViewportChange?: (bbox: {minLon:number;minLat:number;maxLon:number;maxLat:number}) => void;
  
};

export default function WebMap({
  initialCenter,
  initialZoom = 8,
  riskGeoJSON,
  riskOpacity = 0.9,
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
      // cleanup
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
      // renk prop'u yoksa hesaptan ver; varsa dokunma
      const clr = props.color ?? colorForRisk(Number(props.risk ?? 0));
      return {
        ...f,
        properties: { ...props, color: clr },
      };
    });
    return { type: "FeatureCollection", features };
  }, [riskGeoJSON]);

  // 3) Source/layer ekle-güncelle + click handler
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
            "circle-opacity": riskOpacity, // üstten kontrol
            "circle-color": ["case", ["has", "color"], ["get", "color"], "#888"],
          },
        });

        m.on("click", layerId, (e) => {
  const f = e.features?.[0] as any;
  if (f?.properties && onRiskCellPress) {
    const p = f.properties;
    const num = (v:any)=> (typeof v==="string"? Number(v): v);
    onRiskCellPress({
      ...p,
      risk: num(p.risk),
      temp: num(p.temp),
      rh:   num(p.rh),
      wind: num(p.wind),
      wind_dir: num(p.wind_dir),
    });
  }
});


        // interactivity
        m.on("mouseenter", layerId, () => {
          m.getCanvas().style.cursor = "pointer";
        });
        m.on("mouseleave", layerId, () => {
          m.getCanvas().style.cursor = "";
        });
        m.on("click", layerId, (e) => {
          if (!onRiskCellPress) return;
          const f = e.features?.[0] as any;
          const props = (f?.properties ?? {}) as RiskProps;
          // GeoJSON properties JSON-string olabilir; parse edelim (MapLibre bazen öyle geçer)
          const coerceNumber = (v: any) => (typeof v === "string" ? Number(v) : v);
          onRiskCellPress({
            ...props,
            risk: coerceNumber(props.risk),
            temp: coerceNumber(props.temp),
            rh: coerceNumber(props.rh),
            wind: coerceNumber(props.wind),
          });
        });
      } else {
        // sadece paint ve data güncelle
        (m.getSource(sourceId) as GeoJSONSource).setData(colored);
        m.setPaintProperty(layerId, "circle-opacity", riskOpacity);
      }
    };

    if (m.isStyleLoaded()) addOrUpdate();
    else m.once("load", addOrUpdate);
  }, [colored, riskOpacity, onRiskCellPress]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
