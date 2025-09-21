// app/hooks/useSmokeDetectMock.ts
import { useMutation } from "@tanstack/react-query";
import { BASE_URL } from "../utils/config";

export function useSmokeDetectMock() {
  return useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      console.log('📸 Fotoğraf yükleniyor:', file.name, file.size, 'bytes');
      
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('🌐 Backend\'e istek gönderiliyor:', `${BASE_URL}/smoke/detect`);
      
      const response = await fetch(`${BASE_URL}/smoke/detect`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('📡 Backend yanıtı:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend hatası:', errorText);
        throw new Error(`HTTP error! status: ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Backend sonucu:', result);
      
      return {
        score_smoke: result.risk_score / 100, // 0-1 arası normalize et
        confidence: result.confidence,
        detections: result.detections,
        detection_count: result.detection_count,
        gradcam_url: "https://picsum.photos/600/400" // Placeholder
      };
    },
  });
}

