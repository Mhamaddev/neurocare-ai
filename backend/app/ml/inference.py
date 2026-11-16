import hashlib
import json
import math
import os
from functools import lru_cache
from pathlib import Path

from app.ml.data import FEATURES, SUPPORTED_CONTRACTS, Preprocessor
from app.ml.numpy_network import DenseNetwork


class ModelUnavailable(Exception):
    pass


class Predictor:
    def __init__(self, directory: Path):
        metadata = json.loads((directory / "metadata.json").read_text(encoding="utf-8"))
        if metadata["format_version"] not in (2, 3) or metadata.get("contract_id") not in SUPPORTED_CONTRACTS or metadata["features"] != list(FEATURES):
            raise ValueError("Unsupported model contract")
        self.threshold = metadata["threshold"]
        if isinstance(self.threshold, bool) or not isinstance(self.threshold, (int, float)) or not math.isfinite(self.threshold) or not 0 < self.threshold < 1:
            raise ValueError("Invalid decision threshold")
        self.version = metadata["version"]
        self.metadata = metadata
        if not isinstance(self.version, str) or not 1 <= len(self.version) <= 100:
            raise ValueError("Invalid model version")
        model_file = directory / "model.keras"
        if hashlib.sha256(model_file.read_bytes()).hexdigest() != metadata["model_sha256"]:
            raise ValueError("Model checksum mismatch")
        self.preprocessing = Preprocessor.from_dict(metadata["preprocessing"])
        # TensorFlow when it is installed; otherwise the exported weights run in NumPy
        # (small hosts). INFERENCE_BACKEND=numpy forces the NumPy path.
        tf = None
        if os.environ.get("INFERENCE_BACKEND", "auto") != "numpy":
            try:
                import tensorflow as tf
            except ImportError:
                tf = None
        if tf is None:
            network = DenseNetwork.load(directory, metadata["model_sha256"])
            if network.inputs != len(FEATURES):
                raise ValueError("Invalid model dimensions")
            self.model, self.backend, self._forward = None, "numpy", network
            self.architecture = {"hidden_units": network.hidden_units, "dropout_rates": network.dropout_rates}
            return
        self.model = tf.keras.models.load_model(model_file, compile=False, safe_mode=True)
        if self.model.input_shape != (None, len(FEATURES)) or self.model.output_shape != (None, 1):
            raise ValueError("Invalid model dimensions")
        dense = [layer for layer in self.model.layers if isinstance(layer, tf.keras.layers.Dense)]
        self.architecture = {
            "hidden_units": [layer.units for layer in dense[:-1]],
            "dropout_rates": [float(layer.rate) for layer in self.model.layers if isinstance(layer, tf.keras.layers.Dropout)],
        }
        self.backend = "tensorflow"
        self._forward = lambda values: self.model(values, training=False).numpy()

    def _scores(self, transformed) -> list[float]:
        scores = [float(value) for value in self._forward(transformed)[:, 0]]
        if any(not math.isfinite(score) or not 0 <= score <= 1 for score in scores):
            raise ModelUnavailable("Invalid model output")
        return scores

    def predict(self, features: dict[str, float]) -> tuple[int, float, str]:
        import numpy as np

        values = [[features[name] for name in FEATURES]]
        transformed = np.asarray(self.preprocessing.transform(values), dtype="float32")
        probability = self._scores(transformed)[0]
        return int(probability >= self.threshold), probability, self.version

    def explain(self, features: dict[str, float]) -> tuple[float, list[dict]]:
        """Score plus one-at-a-time occlusion effects, in score units.

        Each effect is score(profile) - score(profile with that one answer replaced
        by its training-set mean, i.e. zero after scaling). Effects describe this
        model's behaviour only: they are not additive, causal or clinical.
        """
        import numpy as np

        values = [[features[name] for name in FEATURES]]
        row = np.asarray(self.preprocessing.transform(values), dtype="float32")[0]
        batch = np.tile(row, (len(FEATURES) + 1, 1))
        for index in range(len(FEATURES)):
            batch[index + 1, index] = 0.0
        scores = self._scores(batch)
        effects = [{"name": name, "effect": scores[0] - scores[index + 1]}
                   for index, name in enumerate(FEATURES)]
        return scores[0], effects


@lru_cache(maxsize=1)
def load_predictor(directory: Path | None) -> Predictor:
    if directory is None:
        raise ModelUnavailable("No model configured")
    if not directory.is_absolute():
        raise ModelUnavailable("MODEL_DIR must be absolute")
    try:
        return Predictor(directory)
    except Exception as exc:
        raise ModelUnavailable("Could not load configured model") from exc
