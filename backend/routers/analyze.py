"""
Analyze router: AI rule-based analysis of judicial acuerdo text.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from analyzer import analizar_acuerdo

router = APIRouter(prefix="/api", tags=["analyze"])


class AnalyzeRequest(BaseModel):
    texto: str


@router.post("/analyze")
async def analyze_text(body: AnalyzeRequest):
    """Analyzes a judicial acuerdo text and returns risk assessment and recommendations."""
    result = analizar_acuerdo(body.texto)
    return result
