"""Export a trained Keras model's weights for the NumPy forward pass.

Usage, from backend/:  python -m app.ml.export_weights ../artifacts/<version>
"""
import argparse
import hashlib
import io
import json
from pathlib import Path

import numpy as np

from app.ml.numpy_network import MANIFEST_FILE, WEIGHTS_FILE, DenseNetwork

TOLERANCE = 1e-6


def export(directory: Path) -> dict:
    import tensorflow as tf

    model_file = directory / "model.keras"
    model = tf.keras.models.load_model(model_file, compile=False, safe_mode=True)
    dense = []
    for layer in model.layers:
        if isinstance(layer, tf.keras.layers.Dense):
            dense.append(layer)
        elif not isinstance(layer, (tf.keras.layers.Dropout, tf.keras.layers.InputLayer)):
            raise ValueError(f"Unsupported layer for NumPy inference: {type(layer).__name__}")
    activations = [layer.activation.__name__ for layer in dense]
    if activations != ["relu"] * (len(dense) - 1) + ["sigmoid"]:
        raise ValueError(f"Unsupported activations: {activations}")
    dropout = [float(layer.rate) for layer in model.layers if isinstance(layer, tf.keras.layers.Dropout)]
    network = DenseNetwork([tuple(layer.get_weights()) for layer in dense], dropout)

    sample = np.random.default_rng(42).normal(size=(2048, network.inputs)).astype(np.float32) * 2
    difference = float(np.abs(network(sample) - model(sample, training=False).numpy()).max())
    if difference > TOLERANCE:
        raise ValueError(f"NumPy and Keras outputs differ by {difference}")

    buffer = io.BytesIO()
    arrays = {}
    for index, (kernel, bias) in enumerate(network.layers):
        arrays[f"kernel_{index}"], arrays[f"bias_{index}"] = kernel, bias
    np.savez(buffer, **arrays)
    payload = buffer.getvalue()
    manifest = {
        "model_sha256": hashlib.sha256(model_file.read_bytes()).hexdigest(),
        "weights_sha256": hashlib.sha256(payload).hexdigest(),
        "layers": len(network.layers), "hidden_units": network.hidden_units, "dropout_rates": dropout,
        "activations": activations, "max_abs_difference_from_keras": difference, "checked_rows": len(sample),
    }
    (directory / WEIGHTS_FILE).write_bytes(payload)
    (directory / MANIFEST_FILE).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    print(json.dumps(export(parser.parse_args().directory.resolve()), indent=2))
