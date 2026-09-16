import type { CheckRun, ResolutionNote } from "./types";

const RUN_PREFIX = "delivery-check:run:";
const RESOLUTION_PREFIX = "delivery-check:resolutions:";

type Listener = () => void;

const listeners = new Set<Listener>();
const runCache = new Map<string, { raw: string | null; value: CheckRun | null }>();
const noteCache = new Map<string, { raw: string | null; value: ResolutionNote[] }>();

const EMPTY_NOTES: ResolutionNote[] = [];

function storage(): Storage | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function newRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function saveRun(run: CheckRun): void {
  const store = storage();
  if (!store) return;
  store.setItem(`${RUN_PREFIX}${run.id}`, JSON.stringify(run));
  emit();
}

export function getRunSnapshot(id: string): CheckRun | null {
  const store = storage();
  const raw = store ? store.getItem(`${RUN_PREFIX}${id}`) : null;
  const cached = runCache.get(id);
  if (cached && cached.raw === raw) return cached.value;
  let value: CheckRun | null = null;
  if (raw) {
    try {
      value = JSON.parse(raw) as CheckRun;
    } catch {
      value = null;
    }
  }
  runCache.set(id, { raw, value });
  return value;
}

export function getServerRunSnapshot(): CheckRun | null {
  return null;
}

export function saveResolutions(runId: string, notes: ResolutionNote[]): void {
  const store = storage();
  if (!store) return;
  store.setItem(`${RESOLUTION_PREFIX}${runId}`, JSON.stringify(notes));
  emit();
}

export function getResolutionsSnapshot(runId: string): ResolutionNote[] {
  const store = storage();
  const raw = store ? store.getItem(`${RESOLUTION_PREFIX}${runId}`) : null;
  const cached = noteCache.get(runId);
  if (cached && cached.raw === raw) return cached.value;
  let value: ResolutionNote[] = EMPTY_NOTES;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ResolutionNote[];
      value = Array.isArray(parsed) ? parsed : EMPTY_NOTES;
    } catch {
      value = EMPTY_NOTES;
    }
  }
  noteCache.set(runId, { raw, value });
  return value;
}

export function getServerResolutionsSnapshot(): ResolutionNote[] {
  return EMPTY_NOTES;
}
