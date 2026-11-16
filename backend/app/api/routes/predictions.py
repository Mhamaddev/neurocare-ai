from typing import Annotated
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.rate_limit import limit_previews, limit_saved_predictions
from app.db.session import get_db
from app.ml.inference import ModelUnavailable, Predictor, load_predictor
from app.ml.contracts import contract_for_model
from app.schemas.prediction import PredictionInput, PredictionResponse, PreviewResponse
from app.services.predictions import create_prediction, preview_prediction

router = APIRouter(prefix="/api/v1", tags=["Educational predictions"])


def get_predictor() -> Predictor:
    predictor = load_predictor(get_settings().model_dir)
    try:
        contract_for_model(predictor.metadata)
    except ValueError as error:
        raise ModelUnavailable(str(error)) from error
    return predictor


@router.get("/model/contract")
def model_contract():
    directory = get_settings().model_dir
    metadata = None
    if directory is not None:
        try:
            metadata = json.loads((directory / "metadata.json").read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            pass  # A missing model still permits inspection of the default input contract.
    try:
        return contract_for_model(metadata)
    except ValueError as error:
        raise ModelUnavailable(str(error)) from error


@router.get("/model")
def model_details(predictor: Annotated[Predictor, Depends(get_predictor)]):
    details = {key: predictor.metadata[key] for key in (
        "version", "contract_id", "target", "threshold", "split_sizes", "test_metrics",
        "baseline_metrics", "limitations",
    )}
    details["threshold_selection"] = predictor.metadata.get("threshold_selection")
    details["validation_metrics"] = predictor.metadata.get("validation_metrics")
    details["architecture"] = predictor.architecture
    details["training"] = predictor.metadata.get("training")
    details["training_configuration"] = predictor.metadata.get("training_configuration")
    details["dataset"] = contract_for_model(predictor.metadata)["dataset"]
    details["operating_point_notice"] = predictor.metadata.get("operating_point_notice")
    return details


@router.post("/predictions", response_model=PredictionResponse, status_code=201,
             dependencies=[Depends(limit_saved_predictions)])
def predict(
    data: PredictionInput,
    session: Annotated[Session, Depends(get_db)],
    predictor: Annotated[Predictor, Depends(get_predictor)],
) -> PredictionResponse:
    return create_prediction(data, session, predictor)


@router.post("/predictions/preview", response_model=PreviewResponse, dependencies=[Depends(limit_previews)])
def preview(
    data: PredictionInput,
    predictor: Annotated[Predictor, Depends(get_predictor)],
) -> PreviewResponse:
    """What-if scoring: same validation and model, nothing is written to the database."""
    return preview_prediction(data, predictor)


@router.get("/model/curves")
def model_curves(predictor: Annotated[Predictor, Depends(get_predictor)]):
    """Saved test-partition threshold sweeps for the configured model, if generated."""
    try:
        curves = json.loads((get_settings().model_dir / "curves.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, TypeError) as error:
        raise HTTPException(status_code=404, detail="Curve data has not been generated for this model") from error
    if not isinstance(curves, dict) or curves.get("version") != predictor.version:
        raise HTTPException(status_code=404, detail="Curve data does not match the configured model")
    return curves
