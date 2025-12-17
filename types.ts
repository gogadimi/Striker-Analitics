export interface MetricData {
  value: number;
  target: number;
  status: string;
}

export interface Improvement {
  issue: string;
  drill: string;
  instructions: string[];
}

export interface AnalysisResponse {
  status: 'success' | 'error';
  form_score?: number;
  score_label?: string;
  score_color?: string;
  action_detected?: string;
  key_strengths?: string[];
  areas_for_improvement?: Improvement[];
  technical_data?: {
    torso_angle: MetricData;
    plant_foot_offset: MetricData;
  };
  coaching_tips?: {
    en: string;
    mk: string;
    es: string;
  };
}

export interface VideoState {
  file: File | null;
  previewUrl: string | null;
}

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}