from sqlalchemy.orm import Session

from app.ml.inference import Predictor
from app.repositories.predictions import save_prediction
from app.schemas.prediction import FeatureEffect, PredictionInput, PredictionResponse, PreviewResponse


def create_prediction(data: PredictionInput, session: Session, predictor: Predictor) -> PredictionResponse:
    features = data.model_dump()
    label, probability, version = predictor.predict(features)
    record = save_prediction(session, features, label, probability, version)
    response = PredictionResponse(
        id=record.id, predicted_class=label, predicted_probability=probability,
        model_version=version, decision_threshold=predictor.threshold,
    )
    # The explanation is a convenience: a saved result is never lost because of it.
    try:
        response.effects = [FeatureEffect(**item) for item in predictor.explain(features)[1]]
    except Exception:
        response.effects = []
    notice = getattr(predictor, "metadata", {}).get("operating_point_notice")
    if isinstance(notice, str) and notice:
        response.notice = f"{response.notice} {notice}"
    return response


def preview_prediction(data: PredictionInput, predictor: Predictor) -> PreviewResponse:
    """Score a profile without saving it; used for what-if exploration."""
    probability, effects = predictor.explain(data.model_dump())
    return PreviewResponse(
        predicted_class=int(probability >= predictor.threshold), predicted_probability=probability,
        decision_threshold=predictor.threshold, effects=effects,
    )
