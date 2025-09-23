// app/hooks/useRiskNowcasts.ts

import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "../utils/config"; // 1. DEĞİŞİKLİK: BASE_URL'i dinamik olarak alan config dosyasından import et

export type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number };
export type Area = { id: string; name: string; bbox: BBox };

// <<<<<<<<<<<<<<<<<<<<<<<< DEĞİŞİKLİK BURADA >>>>>>>>>>>>>>>>>>>>>>>>
export function useRiskNowcastsByPolygon(
  cityPolygons: any[],
  hourOffset = 0,
  provider = "heuristic",
  version = 1 // 2. DEĞİŞİKLİK: Versiyon parametresini hook'a ekliyoruz
) {
  return useQuery({
    // 3. DEĞİŞİKLİK: queryKey'i yeni parametreyi içerecek şekilde güncelliyoruz
    queryKey: ["risk-nowcast-by-polygon", cityPolygons.map(p => p.properties.name), hourOffset, provider, version],
    
    queryFn: async () => {
      console.log(`Risk verisi çekiliyor: ${cityPolygons.length} poligon için...`);
      
      const promises = cityPolygons.map(async (polygon) => {
        // 4. DEĞİŞİKLİK: Fetch URL'sini yeni versiyon parametresini gönderecek şekilde güncelliyoruz
        const url = `${BASE_URL}/risk/nowcast_by_polygon?hourOffset=${hourOffset}&provider=${provider}&version=${version}`;
        
        console.log(`İstek gönderiliyor: POST ${url}`); // Hata ayıklama için URL'yi logla

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(polygon),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${polygon.properties.name}`);
        }
        const data = await response.json();
        
        data.features.forEach((feature: any) => {
          feature.properties.aoiName = polygon.properties.name;
          feature.properties.aoiId = polygon.properties.name.toLowerCase().replace('İ', 'i');
        });
        
        return data.features;
      });

      const allFeatures = (await Promise.all(promises)).flat();
      
      console.log(`Toplam ${allFeatures.length} risk noktası alındı.`);
      return { type: "FeatureCollection", features: allFeatures };
    },

    enabled: cityPolygons.length > 0,
    staleTime: 60_000,
  });
}