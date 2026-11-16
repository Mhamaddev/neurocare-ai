"""The saved network's forward pass in plain NumPy, for hosts too small to load TensorFlow.

`python -m app.ml.export_weights` writes the two files read here from the trained Keras
model, and refuses to write them unless this forward pass reproduces the Keras outputs.
"""
import hashlib
import io
import json
from pathlib import Path

import numpy as np

WEIGHTS_FILE = "inference_weights.npz"
MANIFEST_FILE = "inference_weights.json"


class DenseNetwork:
    """Fully connected layers: ReLU after every hidden layer, sigmoid on the single output."""

    def __init__(self, layers: list[tuple[np.ndarray, np.ndarray]], dropout_rates: list[float]):
        if not layers:
            raise ValueError("A network needs at least one layer")
        width = layers[0][0].shape[0]
        for kernel, bias in layers:
            if kernel.ndim != 2 or bias.shape != (kernel.shape[1],) or kernel.shape[0] != width:
                raise ValueError("Layer shapes do not chain")
            if not (np.isfinite(kernel).all() and np.isfinite(bias).all()):
                raise ValueError("Weights must be finite")
            width = kernel.shape[1]
        if width != 1:
            raise ValueError("The network must end in one output unit")
        self.layers = [(kernel.astype(np.float32), bias.astype(np.float32)) for kernel, bias in layers]
        self.inputs = int(layers[0][0].shape[0])
        self.hidden_units = [int(kernel.shape[1]) for kernel, _ in layers[:-1]]
        self.dropout_rates = [float(rate) for rate in dropout_rates]

    def __call__(self, inputs) -> np.ndarray:
        values = np.asarray(inputs, dtype=np.float32)
        for kernel, bias in self.layers[:-1]:
            values = np.maximum(values @ kernel + bias, 0)
        kernel, bias = self.layers[-1]
        with np.errstate(over="ignore"):
            return 1 / (1 + np.exp(-(values @ kernel + bias)))

    @classmethod
    def load(cls, directory: Path, model_sha256: str) -> "DenseNetwork":
        """Load exported weights, accepting them only for the exact Keras file they came from."""
        manifest = json.loads((directory / MANIFEST_FILE).read_text(encoding="utf-8"))
        payload = (directory / WEIGHTS_FILE).read_bytes()
        if manifest.get("model_sha256") != model_sha256:
            raise ValueError("Exported weights belong to a different model file")
        if hashlib.sha256(payload).hexdigest() != manifest.get("weights_sha256"):
            raise ValueError("Exported weights checksum mismatch")
        with np.load(io.BytesIO(payload), allow_pickle=False) as arrays:
            layers = [(arrays[f"kernel_{index}"], arrays[f"bias_{index}"]) for index in range(int(manifest["layers"]))]
        return cls(layers, manifest.get("dropout_rates", []))
