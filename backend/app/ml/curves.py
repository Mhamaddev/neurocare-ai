"""Offline CLI: save test-partition threshold sweeps for an existing artifact.

Reads the artifact's own cohort, split indices and frozen model; nothing is retrained
except the logistic-regression baseline, which is refitted exactly as in training.
The run aborts unless the recomputed ANN test metrics match the saved metadata, so
the curves always describe the same evaluation the site already reports.

Usage (from backend/):  python -m app.ml.curves ../artifacts/<version>
"""
import argparse
import json
from pathlib import Path

import numpy as np

from app.ml.data import read_dataset
from app.ml.evaluation import binary_metrics
from app.ml.inference import Predictor

POINTS = 200


def sweep(labels, scores, extra_thresholds=()):
    """[threshold, true positives, false positives] at score quantiles, ascending."""
    quantiles = np.quantile(scores, np.linspace(0, 1, POINTS + 1))
    thresholds = np.unique(np.concatenate((quantiles, np.asarray(extra_thresholds, dtype=float))))
    thresholds = thresholds[(thresholds > 0) & (thresholds < 1)]
    order = np.argsort(scores, kind="stable")
    starts = np.searchsorted(scores[order], thresholds, side="left")
    prefix = np.concatenate(([0], np.cumsum(labels[order])))
    true_positive = int(labels.sum()) - prefix[starts]
    flagged = len(labels) - starts
    return [[float(t), int(tp), int(n - tp)] for t, tp, n in zip(thresholds, true_positive, flagged)]


def build(directory: Path) -> dict:
    from sklearn.linear_model import LogisticRegression

    predictor = Predictor(directory)
    metadata = predictor.metadata
    rows, labels = read_dataset(directory / metadata.get("dataset_file", "training_cohort.csv"))
    with np.load(directory / "split_indices.npz", allow_pickle=False) as saved:
        splits = {name: saved[name] for name in ("train", "validation", "test")}
    y = np.asarray(labels)
    x = np.asarray(predictor.preprocessing.transform(rows), dtype="float32")
    test, train = splits["test"], splits["train"]
    ann_scores = predictor.model.predict(x[test], batch_size=4096, verbose=0).reshape(-1).astype(float)
    measured = binary_metrics(y[test], ann_scores, predictor.threshold)
    saved_metrics = metadata["test_metrics"]
    if measured["confusion_matrix"] != saved_metrics["confusion_matrix"] or abs(measured["roc_auc"] - saved_metrics["roc_auc"]) > 1e-6:
        raise SystemExit("Recomputed ANN test metrics differ from the saved metadata; curves not written.")
    baseline = LogisticRegression(max_iter=500, random_state=metadata.get("seed", 42)).fit(x[train], y[train])
    baseline_scores = baseline.predict_proba(x[test])[:, 1]
    baseline_threshold = metadata["baseline_metrics"]["logistic_regression_threshold"]
    baseline_measured = binary_metrics(y[test], baseline_scores, baseline_threshold)
    saved_baseline = metadata["baseline_metrics"]["logistic_regression"]
    return {
        "version": predictor.version, "split": "test", "rows": int(len(test)),
        "positives": int(y[test].sum()), "negatives": int(len(test) - y[test].sum()),
        "format": "sweep rows are [threshold, true_positives, false_positives]; a record is flagged when score >= threshold",
        "models": {
            "ann": {"label": "Neural network", "threshold": predictor.threshold,
                    "roc_auc": measured["roc_auc"], "average_precision": measured["average_precision"],
                    "sweep": sweep(y[test], ann_scores, [predictor.threshold])},
            "logistic_regression": {
                "label": "Logistic regression", "threshold": baseline_threshold,
                "roc_auc": baseline_measured["roc_auc"], "average_precision": baseline_measured["average_precision"],
                "matches_saved_baseline": baseline_measured["confusion_matrix"] == saved_baseline["confusion_matrix"],
                "sweep": sweep(y[test], baseline_scores, [baseline_threshold])},
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Write curves.json beside an existing model artifact")
    parser.add_argument("directory", type=Path)
    directory = parser.parse_args().directory.resolve()
    curves = build(directory)
    (directory / "curves.json").write_text(json.dumps(curves, allow_nan=False), encoding="utf-8")
    for name, model in curves["models"].items():
        print(f"{name}: ROC AUC {model['roc_auc']:.4f}, {len(model['sweep'])} sweep points")
    print("Baseline refit matches saved metadata:", curves["models"]["logistic_regression"]["matches_saved_baseline"])


if __name__ == "__main__":
    main()
