# Architecture

```
Browser (React, Vite)  ──HTTP──▶  FastAPI  ──▶  PostgreSQL (saved predictions)
                                     │
                                     └──▶  Keras model + metadata (artifacts/<version>/)
```

## Request flow for a prediction

1. The site loads the input contract (`GET /api/v1/model/contract`) and builds the form
   from it, so the form always matches what the model expects.
2. On submit, `POST /api/v1/predictions` validates all 21 answers strictly: whole numbers
   only, within range, no extra fields.
3. The predictor scales the answers with the saved training means and deviations, runs
   the network and compares the score with the saved cutoff.
4. It also computes each answer's effect by rescoring the profile 21 more times, each
   time with one answer replaced by its training-set average.
5. The inputs, score, label and model version are written to PostgreSQL. Only after the
   commit succeeds does the API answer.

`POST /api/v1/predictions/preview` performs steps 2 to 4 only and writes nothing; the
what-if explorer uses it.

## Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Routes | `backend/app/api/routes/` | HTTP, dependencies, rate limits |
| Schemas | `backend/app/schemas/` | Input validation and response shapes |
| Services | `backend/app/services/` | Orchestrate model and persistence |
| Repositories | `backend/app/repositories/` | SQL through SQLAlchemy |
| ML | `backend/app/ml/` | Contract, training, evaluation, inference, curves |

## Model artifacts

Each directory under `artifacts/` is one trained version: `model.keras`, `metadata.json`
(scaling, cutoff, metrics, provenance), the data splits, and `curves.json` for the
charts. The API loads only the directory named by `MODEL_DIR`, verifies the model file's
checksum against the metadata, and refuses models whose cutoff policy has not been
reviewed. Training and curve generation are offline commands and never run inside a
request.

## Safeguards

- Errors return generic messages; SQL text, credentials and submitted values are never echoed.
- CORS allows only the configured site origin.
- Saved predictions have no read endpoint.
- The two model endpoints are rate limited per client address (in memory, per process).
- If the model or database is unavailable the API answers 503; the site never shows
  substitute numbers.

## Database

One table, `predictions`: id, the submitted answers (JSONB), label, score, model version
and timestamp. Alembic owns the schema; the API does not create tables at startup.
