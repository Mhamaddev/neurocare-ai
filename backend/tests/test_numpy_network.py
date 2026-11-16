"""The NumPy forward pass used by the hosted demo, and the checks that guard its weights."""
import hashlib
import io
import json
import math
import os

import numpy as np
import pytest

from app.core.config import get_settings
from app.ml.inference import Predictor
from app.ml.numpy_network import MANIFEST_FILE, WEIGHTS_FILE, DenseNetwork
from tests.fixtures import PAYLOAD

HIDDEN = (np.array([[1.0, -1.0], [2.0, 0.5]]), np.array([0.5, -0.25]))
OUTPUT = (np.array([[1.5], [-2.0]]), np.array([0.1]))


def test_forward_pass_matches_a_hand_calculation():
    network = DenseNetwork([HIDDEN, OUTPUT], [0.1])
    # inputs (1, 2): hidden sums are 1*1 + 2*2 + 0.5 = 5.5 and 1*-1 + 2*0.5 - 0.25 = -0.25, which ReLU turns into 0.
    expected = 1 / (1 + math.exp(-(5.5 * 1.5 + 0 * -2.0 + 0.1)))
    assert network([[1.0, 2.0]])[0, 0] == pytest.approx(expected, rel=1e-6)
    assert (network.inputs, network.hidden_units, network.dropout_rates) == (2, [2], [0.1])


def test_rejects_layers_that_do_not_chain_or_do_not_end_in_one_output():
    with pytest.raises(ValueError, match="chain"):
        DenseNetwork([HIDDEN, (np.ones((3, 1)), np.zeros(1))], [])
    with pytest.raises(ValueError, match="one output"):
        DenseNetwork([HIDDEN], [])
    with pytest.raises(ValueError, match="finite"):
        DenseNetwork([HIDDEN, (np.array([[np.nan], [1.0]]), np.zeros(1))], [])


def write_export(directory, model_sha256="a" * 64):
    buffer = io.BytesIO()
    np.savez(buffer, kernel_0=HIDDEN[0], bias_0=HIDDEN[1], kernel_1=OUTPUT[0], bias_1=OUTPUT[1])
    (directory / WEIGHTS_FILE).write_bytes(buffer.getvalue())
    manifest = {"model_sha256": model_sha256, "weights_sha256": hashlib.sha256(buffer.getvalue()).hexdigest(),
                "layers": 2, "dropout_rates": [0.1]}
    (directory / MANIFEST_FILE).write_text(json.dumps(manifest), encoding="utf-8")


def test_exported_weights_load_only_for_their_own_model_and_only_untouched(tmp_path):
    write_export(tmp_path)
    assert DenseNetwork.load(tmp_path, "a" * 64).hidden_units == [2]
    with pytest.raises(ValueError, match="different model"):
        DenseNetwork.load(tmp_path, "b" * 64)
    with open(tmp_path / WEIGHTS_FILE, "ab") as handle:
        handle.write(b"tampered")
    with pytest.raises(ValueError, match="checksum"):
        DenseNetwork.load(tmp_path, "a" * 64)


def test_numpy_and_tensorflow_predictors_agree_on_the_configured_model(monkeypatch):
    if os.environ.get("RUN_MODEL_TESTS") != "1":
        pytest.skip("Set RUN_MODEL_TESTS=1 with a locally trained CDC model")
    directory = get_settings().model_dir
    monkeypatch.setenv("INFERENCE_BACKEND", "numpy")
    light = Predictor(directory)
    monkeypatch.setenv("INFERENCE_BACKEND", "auto")
    full = Predictor(directory)
    assert (light.backend, full.backend) == ("numpy", "tensorflow")
    assert light.architecture == full.architecture
    profiles = [PAYLOAD, {**PAYLOAD, "BMI": 41, "HighBP": 1, "GenHlth": 5, "Age": 12}]
    for profile in profiles:
        assert light.predict(profile)[0] == full.predict(profile)[0]
        assert light.predict(profile)[1] == pytest.approx(full.predict(profile)[1], abs=1e-6)
        for ours, theirs in zip(light.explain(profile)[1], full.explain(profile)[1]):
            assert ours["effect"] == pytest.approx(theirs["effect"], abs=1e-6)
