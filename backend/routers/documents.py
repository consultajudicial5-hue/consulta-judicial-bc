"""
Documents router: upload and analyze legal documents (PDF or TXT).
"""

import io
from fastapi import APIRouter, HTTPException, UploadFile, File

from analyzer import analizar_acuerdo

router = APIRouter(prefix="/api/documents", tags=["documents"])

LEGAL_ELEMENTS = [
    ("demandante", "Nombre e identificación del demandante"),
    ("demandado", "Nombre e identificación del demandado"),
    ("prestaciones", "Listado de prestaciones reclamadas"),
    ("fundamentación", "Fundamentación legal (artículos aplicables)"),
    ("motivación", "Motivación y razonamiento jurídico"),
    ("petición", "Petición o punto petitorio claro"),
]


def extract_text_from_pdf(content: bytes) -> str:
    """Extracts text from a PDF file using pdfminer."""
    from pdfminer.high_level import extract_text_to_fp
    from pdfminer.layout import LAParams

    output = io.StringIO()
    extract_text_to_fp(io.BytesIO(content), output, laparams=LAParams())
    return output.getvalue()


def extract_text_from_txt(content: bytes) -> str:
    """Decodes TXT file content."""
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace")


def review_document(text: str) -> dict:
    """
    Reviews a legal document for missing required elements.
    Returns faltantes and sugerencias.
    """
    text_lower = text.lower()
    faltantes = []
    sugerencias = []

    for keyword, description in LEGAL_ELEMENTS:
        if keyword not in text_lower:
            faltantes.append(description)

    if len(text.split()) < 100:
        sugerencias.append("El documento parece muy breve. Verifique que esté completo.")

    if not any(c.isdigit() for c in text):
        sugerencias.append("No se detectaron referencias numéricas (artículos, fechas, cantidades).")

    if "considerando" not in text_lower and "resultando" not in text_lower:
        sugerencias.append(
            "Considere incluir secciones de RESULTANDO y CONSIDERANDO para mayor claridad procesal."
        )

    if "por lo tanto" not in text_lower and "en consecuencia" not in text_lower:
        sugerencias.append("Asegúrese de incluir una sección de conclusiones o resolutivos clara.")

    return {"faltantes": faltantes, "sugerencias": sugerencias}


@router.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    """
    Accepts a PDF or TXT file, extracts text, and returns AI analysis
    plus a legal document review.
    """
    filename = file.filename or ""
    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    # Extract text based on file type
    if filename.lower().endswith(".pdf"):
        try:
            text = extract_text_from_pdf(content)
        except Exception as e:
            raise HTTPException(
                status_code=422, detail=f"No se pudo procesar el PDF: {str(e)}"
            )
    elif filename.lower().endswith(".txt"):
        text = extract_text_from_txt(content)
    else:
        # Try PDF first, then plain text
        try:
            text = extract_text_from_pdf(content)
        except Exception:
            text = extract_text_from_txt(content)

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="No se pudo extraer texto del documento. Verifique que el archivo sea legible.",
        )

    analisis = analizar_acuerdo(text)
    revision_redaccion = review_document(text)

    return {
        "nombre_archivo": filename,
        "caracteres_extraidos": len(text),
        "analisis": analisis,
        "revision_redaccion": revision_redaccion,
    }
