import { useMutation } from "@tanstack/react-query";
import { BASE_URL } from "../utils/config";

export function useSmokeDetectMock() {
  return useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      console.log('📸 Uploading photo:', file.name, file.size, 'bytes');

      const formData = new FormData();
      formData.append('file', file);

      console.log('🌐 Sending request to backend:', `${BASE_URL}/smoke/detect`);

      const response = await fetch(`${BASE_URL}/smoke/detect`, {
        method: 'POST',
        body: formData,
      });

      console.log('📡 Backend response:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Backend result:', result);

      return {
        score_smoke: result.risk_score / 100,
        confidence: result.confidence,
        detections: result.detections,
        detection_count: result.detection_count,
        gradcam_url: "https://picsum.photos/600/400"
      };
    },
  });
}
