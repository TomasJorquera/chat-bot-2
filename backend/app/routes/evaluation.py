from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Union, Optional
from ..models import Message
from ..prompts import PROMPTS
from app.utils.ai_engine import generate_gemini_response

router = APIRouter()

class EvaluationMessage(BaseModel):
    sender: str
    content: str

class EvaluationRequest(BaseModel):
    messages: List[EvaluationMessage]
    character: str

class EvaluationCriteria(BaseModel):
    number: int
    name: str
    description: str
    compliance: str
    analysis: str
    justification: str

class EvaluationResponse(BaseModel):
    criteria: List[EvaluationCriteria]
    total_score: int
    performance_range: str
    conclusion: str

@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_conversation(request: EvaluationRequest):
    try:
        # Formatear la conversación para el prompt
        formatted_conversation = {
            "conversation": [
                {
                    "role": "teacher" if msg.sender == "user" else "character",
                    "text": msg.content
                }
                for msg in request.messages
            ],
            "student_profile": {
                "name": request.character,
                "age": 9 if request.character == "Teo" else 15,
                "grade": "3º Básico" if request.character == "Teo" else "1º Medio"
            }
        }

        # Obtener la evaluación usando Gemini
        evaluation_response = await generate_gemini_response(
            PROMPTS["Evaluator"],
            formatted_conversation
        )

        # Normalizar la respuesta del motor AI al esquema que espera la API
        # El prompt puede devolver dos formatos:
        #  - { "criteria": [...], "total_score": X, "performance_range": "...", "conclusion": "..." }
        #  - { "evaluation": [...], "conclusion": [...] }
        resp = evaluation_response or {}

        criteria_list = []
        total_score = None
        performance_range = None
        conclusion_text = ""

        if isinstance(resp, dict):
            # Caso 1: respuesta ya en campo 'criteria'
            if 'criteria' in resp and isinstance(resp['criteria'], list):
                criteria_list = resp['criteria']
                total_score = resp.get('total_score')
                performance_range = resp.get('performance_range')
                # conclusion puede ser string
                conclusion_text = resp.get('conclusion') or ''

            # Caso 2: el prompt devolvió 'evaluation' y 'conclusion' como listas
            elif 'evaluation' in resp and isinstance(resp['evaluation'], list):
                # Mapear cada item de evaluation a la forma esperada en 'criteria'
                mapped = []
                for idx, it in enumerate(resp['evaluation'], start=1):
                    mapped.append({
                        'number': idx,
                        'name': (it.get('criterio') or it.get('name') or f'Criterio {idx}').replace(f"{idx}. {idx}.", f"{idx}."),
                        'description': it.get('descripcion') or it.get('description') or '',
                        'compliance': it.get('cumplimiento') or it.get('compliance') or 'NO',
                        'analysis': it.get('analisis') or it.get('analysis') or '',
                        'justification': it.get('justificacion') or it.get('justification') or ''
                    })
                criteria_list = mapped

                # Intentar obtener conclusión y puntuación desde resp['conclusion'] si es lista
                concl = resp.get('conclusion')
                if isinstance(concl, list):
                    # Buscar un item con title 'Puntuación Total' o similar
                    score = None
                    parts = []
                    for item in concl:
                        if isinstance(item, dict) and 'title' in item and 'text' in item:
                            parts.append(f"{item.get('title')}: {item.get('text')}")
                            if 'Puntuación' in item.get('title', '') or 'Puntuación Total' in item.get('title', ''):
                                # intentar extraer número X de 11
                                import re
                                m = re.search(r"(\d+)\s+de\s+11", item.get('text',''))
                                if m:
                                    score = int(m.group(1))
                    if score is not None:
                        total_score = score
                    performance_range = resp.get('performance_range')
                    conclusion_text = '\n'.join(parts)
                elif isinstance(concl, str):
                    conclusion_text = concl

        # Si no se obtuvo total_score calcularlo a partir de los criterios
        if total_score is None and isinstance(criteria_list, list) and len(criteria_list) > 0:
            try:
                total_score = sum(1 for c in criteria_list if (c.get('compliance') or c.get('cumplimiento') or '').upper() == 'SÍ')
            except Exception:
                total_score = 0

        # Si performance_range no fue proporcionado, derivarlo
        if performance_range is None:
            if total_score is None:
                performance_range = 'No disponible'
            else:
                performance_range = 'Exitosa' if total_score >= 8 else 'Competente' if total_score >= 5 else 'Aceptable' if total_score >= 3 else 'No alcanza el mínimo'

        # Si conclusion_text está vacío, generar una breve conclusión basada en score
        if not conclusion_text:
            conclusion_text = f"{total_score} de 11 criterios cumplidos - Desempeño {performance_range}"

        # Construir la respuesta final en el formato esperado por el response_model
        final_response = {
            'criteria': criteria_list,
            'total_score': total_score or 0,
            'performance_range': performance_range,
            'conclusion': conclusion_text
        }

        return final_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))