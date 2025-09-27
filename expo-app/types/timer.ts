/**
 * タイマー関連の型定義
 */

// タイマーの状態を表す型
export type TimerStatus = "idle" | "running" | "completed";

// セッション情報の型
export interface TimerSession {
  id: string;
  startTime: Date;
  duration: number; // 秒単位
  isActive: boolean;
}

// タイマーの設定オプション
export interface TimerOptions {
  duration?: number; // デフォルト: 10分
  autoStart?: boolean; // デフォルト: true
  persistSession?: boolean; // デフォルト: true
}

// AsyncStorage関連の型
export interface TimerStorageData {
  startTime: string; // ISO string
  sessionId: string;
  duration: number;
}

// タイマーイベントの型
export type TimerEvent =
  | { type: "start"; timestamp: number; sessionId: string }
  | { type: "pause"; timestamp: number }
  | { type: "resume"; timestamp: number }
  | { type: "complete"; timestamp: number }
  | { type: "reset"; timestamp: number };

// エラー関連の型
export class TimerError extends Error {
  constructor(
    message: string,
    public code: "STORAGE_ERROR" | "SESSION_ERROR" | "INVALID_STATE",
  ) {
    super(message);
    this.name = "TimerError";
  }
}

// useTimerフックのオプション型
export interface UseTimerOptions extends TimerOptions {
  onComplete?: () => void;
  onTick?: (remainingTime: number) => void;
  onError?: (error: TimerError) => void;
}
