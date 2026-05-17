import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdBanner } from "./ads/AdBanner";
import { getSupabaseClient } from "../lib/supabase/client";
import {
  createSupabaseGrowthRecord,
  listSupabaseGrowthRecords,
} from "../lib/storage/supabaseRepository";
import { AppUser, BabyProfile, CreateGrowthRecordInput, GrowthRecord } from "../types";

interface GrowthScreenProps {
  baby: BabyProfile;
  user: AppUser;
}

function storageKey(babyId: string) {
  return `infant-time-growth-${babyId}`;
}

function readGrowthRecords(babyId: string): GrowthRecord[] {
  const saved = window.localStorage.getItem(storageKey(babyId));
  if (!saved) {
    return [];
  }

  return (JSON.parse(saved) as GrowthRecord[]).sort(
    (left, right) => new Date(left.measuredAt).getTime() - new Date(right.measuredAt).getTime(),
  );
}

function writeGrowthRecords(babyId: string, records: GrowthRecord[]) {
  window.localStorage.setItem(storageKey(babyId), JSON.stringify(records));
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function sortGrowthRecords(records: GrowthRecord[]): GrowthRecord[] {
  return [...records].sort(
    (left, right) => new Date(left.measuredAt).getTime() - new Date(right.measuredAt).getTime(),
  );
}

export function GrowthScreen({ baby, user }: GrowthScreenProps) {
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [measuredAt, setMeasuredAt] = useState(todayDate());
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [headCm, setHeadCm] = useState("");
  const [note, setNote] = useState("");
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadRecords() {
      setIsLoadingRecords(true);
      setErrorMessage(null);

      try {
        const client = getSupabaseClient();
        const nextRecords =
          client && !user.isLocal
            ? await listSupabaseGrowthRecords(client, baby.id)
            : readGrowthRecords(baby.id);

        if (!isCancelled) {
          setRecords(sortGrowthRecords(nextRecords));
        }
      } catch (error) {
        if (!isCancelled) {
          setRecords([]);
          setErrorMessage(error instanceof Error ? error.message : "성장 기록을 불러오지 못했습니다.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingRecords(false);
        }
      }
    }

    void loadRecords();
    setMeasuredAt(todayDate());
    setWeightKg("");
    setHeightCm("");
    setHeadCm("");
    setNote("");

    return () => {
      isCancelled = true;
    };
  }, [baby.id, user.isLocal]);

  const latest = records.at(-1) ?? null;
  const previous = records.at(-2) ?? null;
  const chartData = useMemo(
    () =>
      records.map((record) => ({
        date: record.measuredAt.slice(5, 10).replace("-", "/"),
        weightKg: record.weightKg ?? null,
        heightCm: record.heightCm ?? null,
        headCm: record.headCm ?? null,
      })),
    [records],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingRecord(true);
    setErrorMessage(null);

    const input: CreateGrowthRecordInput = {
      babyId: baby.id,
      measuredAt: `${measuredAt}T00:00:00.000Z`,
      weightKg: weightKg ? Number(weightKg) : null,
      heightCm: heightCm ? Number(heightCm) : null,
      headCm: headCm ? Number(headCm) : null,
      note: note.trim() || null,
    };

    try {
      const client = getSupabaseClient();
      const next =
        client && !user.isLocal
          ? await createSupabaseGrowthRecord(client, input)
          : {
              ...input,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            };
      const nextRecords = sortGrowthRecords([...records, next]);

      setRecords(nextRecords);
      if (!client || user.isLocal) {
        writeGrowthRecords(baby.id, nextRecords);
      }

      setWeightKg("");
      setHeightCm("");
      setHeadCm("");
      setNote("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "성장 기록을 저장하지 못했습니다.");
    } finally {
      setIsSavingRecord(false);
    }
  }

  return (
    <section className="screen-stack">
      <section className="panel growth-hero">
        <div>
          <p className="eyebrow">성장 기록</p>
          <h2>{baby.name} 성장 흐름</h2>
        </div>
        <div className="growth-latest-grid">
          <div>
            <span>몸무게</span>
            <strong>{latest?.weightKg ? `${latest.weightKg}kg` : "-"}</strong>
            <small>{latest?.weightKg && previous?.weightKg ? `최근 +${(latest.weightKg - previous.weightKg).toFixed(1)}kg` : "기록 대기"}</small>
          </div>
          <div>
            <span>키</span>
            <strong>{latest?.heightCm ? `${latest.heightCm}cm` : "-"}</strong>
            <small>{latest?.heightCm && previous?.heightCm ? `최근 +${(latest.heightCm - previous.heightCm).toFixed(1)}cm` : "기록 대기"}</small>
          </div>
          <div>
            <span>머리둘레</span>
            <strong>{latest?.headCm ? `${latest.headCm}cm` : "-"}</strong>
            <small>{latest?.headCm && previous?.headCm ? `최근 +${(latest.headCm - previous.headCm).toFixed(1)}cm` : "기록 대기"}</small>
          </div>
        </div>
      </section>

      <AdBanner placement="growth-bottom" />

      <section className="panel growth-chart-panel">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">차트</p>
            <h2>최근 성장 변화</h2>
          </div>
        </div>
        {errorMessage ? <p className="error-copy">{errorMessage}</p> : null}
        {isLoadingRecords ? (
          <p className="empty-copy">성장 기록을 불러오는 중입니다.</p>
        ) : chartData.length >= 2 ? (
          <div className="growth-chart">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf0f3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend
                  align="right"
                  wrapperStyle={{ fontSize: 11, fontWeight: 700, color: "#6b7280" }}
                  iconSize={8}
                />
                <Line type="monotone" dataKey="weightKg" name="몸무게 kg" stroke="#3182f6" strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="heightCm" name="키 cm" stroke="#16a34a" strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="headCm" name="머리둘레 cm" stroke="#ff7aa2" strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="empty-copy">성장 기록이 2개 이상이면 변화 차트를 볼 수 있습니다.</p>
        )}
      </section>

      <section className="panel">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">입력</p>
            <h2>성장 기록 추가</h2>
          </div>
        </div>
        <form className="entry-form growth-entry-form" onSubmit={handleSubmit}>
          <label className="field growth-date-field">
            <span>측정일</span>
            <input
              className="growth-date-input"
              type="date"
              value={measuredAt}
              onChange={(event) => setMeasuredAt(event.target.value)}
            />
          </label>
          <div className="growth-input-grid">
            <label className="field">
              <span>몸무게 kg</span>
              <input type="number" step="0.1" min="0" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} />
            </label>
            <label className="field">
              <span>키 cm</span>
              <input type="number" step="0.1" min="0" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} />
            </label>
            <label className="field">
              <span>머리둘레 cm</span>
              <input type="number" step="0.1" min="0" value={headCm} onChange={(event) => setHeadCm(event.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>메모</span>
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="선택 입력" />
          </label>
          <button className="primary-button" type="submit" disabled={isSavingRecord}>
            {isSavingRecord ? "저장 중" : "성장 기록 저장"}
          </button>
        </form>
      </section>
    </section>
  );
}
