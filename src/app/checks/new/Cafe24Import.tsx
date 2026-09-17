"use client";

import { useState } from "react";

export function Cafe24Import({ onApply }: { onApply: (csv: string) => void }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const load = async () => {
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/cafe24/products", { cache: "no-store" });
      if (response.status === 401) {
        setState("error");
        setMessage("Cafe24에 연결되어 있지 않습니다. Cafe24 관리자 [앱]에서 이 앱을 실행해 연결하세요.");
        return;
      }
      const json = (await response.json()) as { message?: string; mallId?: string; count?: number; catalogCsv?: string };
      if (!response.ok || !json.catalogCsv) {
        setState("error");
        setMessage(json.message ?? `오류 (HTTP ${response.status})`);
        return;
      }
      onApply(json.catalogCsv);
      setState("done");
      setMessage(`${json.mallId} 상품 ${json.count}개를 불러왔습니다.`);
    } catch {
      setState("error");
      setMessage("네트워크 오류가 발생했습니다.");
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Cafe24에서 불러오기</h2>
      <p className="mt-1 text-xs text-slate-500">
        Cafe24 관리자 [앱]에서 이 앱을 실행하면 연결됩니다. 상품 조회만 하며(최소 권한{" "}
        <code>mall.read_product</code>), 조회한 목록은 브라우저로만 전달됩니다.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="cafe24-load"
          onClick={load}
          disabled={state === "loading"}
          className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {state === "loading" ? "불러오는 중…" : "Cafe24 상품 불러오기"}
        </button>
        {message && (
          <span
            data-testid="cafe24-message"
            className={`text-xs ${state === "error" ? "text-red-700" : "text-green-700"}`}
          >
            {message}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        스마트스토어·쿠팡 등 다른 몰은 아래 export 업로드를 사용하세요.
      </p>
    </section>
  );
}
