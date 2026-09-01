import { useState } from 'react';
import { fetchApi } from "@/lib/api";

export interface IngestionResult {
  totalParsed: number;
  totalIngested: number;
  layer1Matches: number;
  layer2Matches: number;
  errors: number;
}

export function useIngestionPipeline() {
  const [running, setRunning] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [complete, setComplete] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [stats, setStats] = useState<IngestionResult | null>(null);

  const start = () => {
    setRunning(true);
    setComplete(false);
    setActiveIndex(1);

    setTimeout(() => setActiveIndex(2), 1000);
    setTimeout(() => setActiveIndex(3), 2000);
    setTimeout(() => setActiveIndex(4), 3000);
    setTimeout(() => {
      setActiveIndex(5);
      setRunning(false);
      setComplete(true);
    }, 4000);
  };

  const reset = () => {
    setRunning(false);
    setActiveIndex(0);
    setComplete(false);
    setProgress(0);
    setStats(null);
  };

  const ingestData = async (records: Array<Record<string, any>>) => {
    setRunning(true);
    setComplete(false);
    setActiveIndex(1);
    setProgress(10);

    try {
      setActiveIndex(2);
      let ingestedCount = 0;
      let layer1 = 0;
      let layer2 = 0;

      const total = records.length;
      for (let i = 0; i < total; i++) {
        const row = records[i];

        try {
          const data = await fetchApi<any>('/reports/classify', {
            method: 'POST',
            body: JSON.stringify(row),
          });

          ingestedCount++;
          if (data?.finalResult?.layerUsed?.includes('Layer 1')) {
            layer1++;
          } else {
            layer2++;
          }
        } catch (e) {
          console.error(`Row ${i} ingestion failed`, e);
        }

        const pct = Math.round(((i + 1) / total) * 100);
        setProgress(pct);
        if (pct > 30 && pct < 70) setActiveIndex(3);
        if (pct >= 70) setActiveIndex(4);
      }

      setStats({
        totalParsed: total,
        totalIngested: ingestedCount,
        layer1Matches: layer1,
        layer2Matches: layer2,
        errors: total - ingestedCount,
      });

      setActiveIndex(5);
      setComplete(true);
    } catch (err) {
      console.error('Ingestion pipeline error:', err);
    } finally {
      setRunning(false);
    }
  };

  return {
    running,
    activeIndex,
    complete,
    progress,
    stats,
    start,
    reset,
    ingestData,
  };
}