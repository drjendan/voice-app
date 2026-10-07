from __future__ import annotations

from pydantic import BaseModel, Field


class AnalysisResponse(BaseModel):
    duration_seconds: float
    sample_rate_hz: int
    channels: int
    bit_depth: int
    peak_dbfs: float
    rms_dbfs: float
    crest_factor_db: float
    clipping_ratio: float
    dc_offset: float
    zero_crossing_rate: float
    quality_score: float
    training_readiness: bool


class PocRestorationMetadata(BaseModel):
    strength: float = Field(ge=0.0, le=1.0)
    input_analysis: AnalysisResponse
    output_analysis: AnalysisResponse
    processor: str = "milestone2-dsp-poc-v1"
