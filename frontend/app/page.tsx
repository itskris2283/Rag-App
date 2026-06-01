"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Chat from "@/components/Chat";
import { getStats, Stats } from "@/lib/api";

export default function Home() {
  const [stats, setStats] = useState<Stats>({ total_chunks: 0, documents: [] });

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="layout">
      <Sidebar stats={stats} onStatsChange={setStats} />
      <Chat hasDocs={stats.total_chunks > 0} />
    </div>
  );
}
