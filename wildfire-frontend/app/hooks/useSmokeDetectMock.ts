// app/hooks/useSmokeDetectMock.ts
import { useMutation } from "@tanstack/react-query";
export function useSmokeDetectMock() {
  return useMutation({
    mutationFn: async (_: { file: File }) => {
      await new Promise((r) => setTimeout(r, 600));
      return { score_smoke: Math.random(), gradcam_url: "https://picsum.photos/600/400" };
    },
  });
}

