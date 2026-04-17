"""
Rule-based NLP analyzer for judicial acuerdos.
Detects legal terms and produces risk assessment and action recommendations.
"""

import re

RULES = [
    {
        "keywords": ["emplazamiento", "emplazar"],
        "riesgo": "alto",
        "diagnostico": (
            "Se ha ordenado un emplazamiento en su contra, lo que indica el inicio "
            "formal de un juicio. Debe contestar la demanda dentro del plazo legal."
        ),
        "acciones": [
            "Contestar demanda en plazo legal (9 días hábiles)",
            "Contratar abogado inmediatamente",
            "Revisar prestaciones demandadas",
        ],
    },
    {
        "keywords": ["embargo", "trabar embargo", "bienes embargados"],
        "riesgo": "alto",
        "diagnostico": (
            "Se ha decretado un embargo sobre bienes. Esto representa una medida "
            "cautelar o ejecutiva que afecta su patrimonio y requiere atención urgente."
        ),
        "acciones": [
            "Interponer incidente de oposición al embargo",
            "Ofrecer bienes alternativos al embargo",
            "Revisar cuantía del embargo y su legalidad",
        ],
    },
    {
        "keywords": ["requerimiento", "requiere", "apercibirá", "apercibimiento"],
        "riesgo": "medio",
        "diagnostico": (
            "El juzgado ha emitido un requerimiento que exige una acción específica "
            "dentro de un plazo determinado. El incumplimiento puede generar sanciones."
        ),
        "acciones": [
            "Cumplir el requerimiento judicial en el plazo indicado",
            "Acudir al juzgado para desahogar la diligencia requerida",
        ],
    },
    {
        "keywords": ["contestación", "contestación de demanda", "contestar"],
        "riesgo": "medio",
        "diagnostico": (
            "El acuerdo está relacionado con la etapa de contestación de demanda. "
            "Es necesario preparar una defensa adecuada e identificar las excepciones aplicables."
        ),
        "acciones": [
            "Preparar contestación de demanda con asesoría legal",
            "Identificar excepciones y defensas aplicables",
            "Adjuntar pruebas documentales pertinentes",
        ],
    },
    {
        "keywords": ["sentencia", "fallo", "resolución definitiva"],
        "riesgo": "alto",
        "diagnostico": (
            "Se ha dictado una sentencia o resolución definitiva en el expediente. "
            "Debe revisarse el fallo completo para determinar si es favorable o adverso "
            "y evaluar los recursos procedentes."
        ),
        "acciones": [
            "Revisar la sentencia completa de manera inmediata",
            "Evaluar interponer recurso de apelación (plazo: 15 días naturales)",
            "Consultar abogado para definir estrategia de impugnación",
        ],
    },
    {
        "keywords": ["apelación", "apela", "recurso de apelación", "segunda instancia"],
        "riesgo": "medio",
        "diagnostico": (
            "Existe actividad relacionada con un recurso de apelación. "
            "Es importante actuar dentro de los plazos legales para no perder el derecho a apelar."
        ),
        "acciones": [
            "Interponer o responder al recurso en tiempo (15 días naturales)",
            "Preparar los agravios o contestación de agravios",
            "Verificar competencia del tribunal de alzada",
        ],
    },
    {
        "keywords": ["amparo", "juicio de amparo", "suspensión del acto"],
        "riesgo": "alto",
        "diagnostico": (
            "El acuerdo involucra un juicio de amparo o solicitud de suspensión. "
            "Este es el mecanismo constitucional de defensa más importante y sus plazos son estrictos."
        ),
        "acciones": [
            "Tramitar el amparo dentro de los 15 días hábiles siguientes al acto reclamado",
            "Identificar con precisión el acto reclamado y las garantías violadas",
            "Presentar demanda ante el Tribunal Colegiado o Juzgado de Distrito competente",
        ],
    },
    {
        "keywords": ["remate", "subasta", "adjudicación", "postura legal"],
        "riesgo": "alto",
        "diagnostico": (
            "Se ha programado o realizado un remate o subasta judicial de bienes. "
            "Esto implica la posible pérdida definitiva de los bienes afectados."
        ),
        "acciones": [
            "Revisar el avalúo pericial de los bienes a rematar",
            "Evaluar posición para participar en la licitación o interponer tercería",
            "Consultar plazos para oponerse al remate",
        ],
    },
    {
        "keywords": ["notificación", "notificar", "se notifica", "notifíquese"],
        "riesgo": "bajo",
        "diagnostico": (
            "El acuerdo ordena una notificación a las partes. "
            "Es importante acusar recibo y calcular correctamente los plazos procesales a partir de ella."
        ),
        "acciones": [
            "Acusar recibo formal de la notificación",
            "Calcular los plazos procesales a partir de la fecha de notificación",
        ],
    },
    {
        "keywords": ["audiencia", "diligencia", "señala audiencia", "comparecencia"],
        "riesgo": "medio",
        "diagnostico": (
            "Se ha señalado una audiencia o diligencia judicial. "
            "La asistencia es obligatoria y la incomparecencia puede tener consecuencias procesales graves."
        ),
        "acciones": [
            "Confirmar fecha, hora y sala de la audiencia",
            "Preparar documentos y pruebas para la audiencia",
            "Notificar a testigos o peritos si es necesario",
        ],
    },
    {
        "keywords": ["pruebas", "ofrecimiento de pruebas", "admisión de pruebas", "desahogo"],
        "riesgo": "medio",
        "diagnostico": (
            "El expediente se encuentra en la etapa probatoria. "
            "Es fundamental ofrecer y desahogar correctamente las pruebas para fortalecer su posición."
        ),
        "acciones": [
            "Revisar qué pruebas han sido admitidas y cuáles rechazadas",
            "Preparar el desahogo de las pruebas admitidas",
            "Evaluar interponer recurso contra admisión o rechazo de pruebas",
        ],
    },
]

DEFAULT_RULE = {
    "riesgo": "bajo",
    "diagnostico": (
        "El acuerdo judicial no contiene términos de alto impacto identificados automáticamente. "
        "Se recomienda revisar el texto completo con su abogado para determinar las acciones apropiadas."
    ),
    "acciones": [
        "Consultar el acuerdo completo con su abogado de confianza",
        "Verificar la próxima fecha de audiencia o diligencia",
        "Mantener seguimiento periódico del expediente",
    ],
}

RIESGO_PRIORITY = {"alto": 3, "medio": 2, "bajo": 1}


def analizar_acuerdo(texto: str) -> dict:
    """
    Analyzes a judicial acuerdo text using rule-based NLP.
    Returns a dict with: diagnostico, riesgo, acciones.
    """
    texto_lower = texto.lower()

    matched_rules = []
    for rule in RULES:
        for keyword in rule["keywords"]:
            if re.search(r"\b" + re.escape(keyword) + r"\b", texto_lower):
                matched_rules.append(rule)
                break

    if not matched_rules:
        return {
            "diagnostico": DEFAULT_RULE["diagnostico"],
            "riesgo": DEFAULT_RULE["riesgo"],
            "acciones": DEFAULT_RULE["acciones"],
        }

    # Pick highest risk rule
    best_rule = max(matched_rules, key=lambda r: RIESGO_PRIORITY[r["riesgo"]])

    # Combine acciones from all matched rules (deduplicated, highest risk first)
    all_acciones = []
    seen_acciones = set()
    for rule in sorted(matched_rules, key=lambda r: RIESGO_PRIORITY[r["riesgo"]], reverse=True):
        for accion in rule["acciones"]:
            if accion not in seen_acciones:
                seen_acciones.add(accion)
                all_acciones.append(accion)

    # Build combined diagnostico if multiple rules matched
    if len(matched_rules) == 1:
        diagnostico = best_rule["diagnostico"]
    else:
        terms_found = []
        for rule in matched_rules:
            terms_found.append(rule["keywords"][0])
        diagnostico = (
            f"El acuerdo contiene múltiples términos procesales relevantes: "
            f"{', '.join(terms_found)}. "
            + best_rule["diagnostico"]
        )

    return {
        "diagnostico": diagnostico,
        "riesgo": best_rule["riesgo"],
        "acciones": all_acciones[:6],  # limit to 6 most important actions
    }
