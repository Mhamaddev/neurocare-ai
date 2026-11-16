# NeuroCare AI

NeuroCare is a university artificial-neural-network (ANN) project. A small Keras network
classifies the diabetes label in the CDC's 2021 BRFSS health survey from 21 survey
answers, and a website lets you try it, see why it answered as it did, and judge how
good it really is.

**It is an educational prototype, not a diagnostic, screening or risk tool.** Use
fictional answers only.

## What you can do with it

- **Run a prediction.** Fill in a guided 21-field form (or start from an example
  profile) and get the network's score and label. Each submission is saved in PostgreSQL.
- **See what moved the score.** Every result ranks how much each answer raised or
  lowered the score.
- **Ask "what if?".** Change any answer on the result page and the network rescores
  immediately, without saving.
- **Compare the network with simpler models.** The model page shows the network beside
  logistic regression and an always-negative rule, with ROC and precision-recall curves
  and a slider that moves the classification cutoff.

The interface animates its data as you scroll: numbers count up, charts draw in and the
network diagram shows signals crossing its layers. All motion is switched off for
visitors who ask their system to reduce motion. The presentation credit (supervisor and
student names) is set in `frontend/src/lib/credits.ts`.

## Quick start with Docker

This needs only Docker (Docker Desktop or OrbStack); no Python, Node or PostgreSQL.

1. Copy `.env.example` to `.env`. Set `SECRET_KEY` to at least 32 random characters and
   `DB_PASSWORD` to any password you choose (it becomes the local database password).
2. Start everything:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
   ```

3. Open <http://localhost:5173>. The first start downloads dependencies and takes a few
   minutes; follow it with `docker compose -f docker-compose.yml -f docker-compose.local.yml logs -f backend`.

Stop with the same command ending in `down`. The API is at <http://localhost:8000>
(interactive docs at `/docs`).

## Running without Docker

Requirements: Python 3.11, Node.js 22 or newer, and PostgreSQL 18 (or `make db` to run
only the database in Docker). Create `.env` as above, then:

| Step | macOS / Linux | Windows (PowerShell) |
| --- | --- | --- |
| Install dependencies | `make install` | `.\scripts\dev.ps1 install` |
| Create the tables | `make migrate` | `.\scripts\dev.ps1 migrate` |
| Start the API (port 8000) | `make backend` | `.\scripts\dev.ps1 backend` |
| Start the website (port 5173) | `make frontend` | `.\scripts\dev.ps1 frontend` |

The Windows helpers were written for one specific machine; the
[original setup guide](docs/archive/README-original-windows-setup.md) documents them,
including using an existing PostgreSQL service.

## Configuration

The API reads the root `.env`. Restart it after changing values.

| Variable | Meaning |
| --- | --- |
| `SECRET_KEY` | At least 32 random characters. Reserved; there is no login system. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection. |
| `DATABASE_URL` | Optional full connection URL; overrides the `DB_*` values. |
| `FRONTEND_URL` | The website's origin, allowed by CORS. Default `http://localhost:5173`. |
| `MODEL_DIR` | Trained model directory, relative to the project root. Empty disables predictions. |
| `VITE_API_URL` | Optional, in `frontend/.env`: the API's public URL when it is on another origin. |

## The model

| | |
| --- | --- |
| Data | CDC BRFSS 2021, 222,600 complete records, 14.7% with the diabetes label |
| Inputs | 21 coded survey answers, scaled with training-set means and deviations |
| Network | Two hidden layers (64 and 32 units, ReLU, dropout 0.1), one sigmoid output |
| Split | 141,834 train / 40,390 validation / 40,376 test; identical profiles kept together |
| Cutoff | 0.132, chosen on validation data to keep recall above 83% |

Results on the test partition:

| Model | Accuracy | Recall | Precision | ROC AUC |
| --- | --- | --- | --- | --- |
| Neural network | 67.0% | 82.8% | 29.8% | 0.813 |
| Logistic regression | 66.0% | 82.9% | 29.1% | 0.805 |
| Always "no" | 84.5% | 0% | n/a | 0.500 |

Read these honestly: the cutoff deliberately trades accuracy for recall, about seven in
ten positive flags are wrong, and the network is only slightly better than logistic
regression. The [recall policy report](docs/recall-policy-results.md) explains the choice.

The configured model lives in `artifacts/20261029T043159Z-bd9e866c`. Training scripts are
in `backend/app/ml/` and never run from the API. After training a new model, generate
its chart data from `backend/` with `python -m app.ml.curves ../artifacts/<version>`.

## API

| Method and path | Purpose |
| --- | --- |
| `GET /api/health`, `GET /api/health/db` | API and database checks |
| `GET /api/v1/model` | Model version, metrics, architecture and dataset details |
| `GET /api/v1/model/contract` | The 21 input fields and their allowed values |
| `GET /api/v1/model/curves` | Test-partition threshold sweeps for the charts |
| `POST /api/v1/predictions` | Score a profile, explain it and save it (30 per minute per client) |
| `POST /api/v1/predictions/preview` | Score and explain without saving (240 per minute per client) |

Saved predictions cannot be read back through the API; there is no public history.

## Project layout

| Path | Contents |
| --- | --- |
| `frontend/src/` | React 19 site: pages, components, hooks, helpers and styles |
| `backend/app/api/`, `schemas/`, `services/`, `repositories/` | FastAPI routes, validation and persistence |
| `backend/app/ml/` | Data contract, training, threshold selection, inference, curve generation |
| `backend/alembic/` | Database migrations |
| `artifacts/` | Trained model versions |
| `docs/` | Current reports; `docs/archive/` holds the project's earlier phase reports |

## Checks

| Check | Command |
| --- | --- |
| Backend tests | `cd backend && python -m pytest -q` |
| Backend lint | `ruff check backend` |
| Frontend tests | `npm test --prefix frontend` |
| Frontend lint and build | `npm run lint --prefix frontend && npm run build --prefix frontend` |

Set `RUN_MODEL_TESTS=1` to include tests that load the real model, and `RUN_DB_TESTS=1`
for tests that need the migrated database. The same checks run in GitHub Actions
(`.github/workflows/ci.yml`).

## Documentation

- [Architecture](docs/architecture.md)
- [Current model and cutoff policy](docs/recall-policy-results.md)
- [Academic report](docs/academic-report/project-report.md) (written before the
  explanation, what-if and comparison features were added)
- [Design specification](docs/design-spec.md)
- [Archive of earlier phase reports](docs/archive/)

## Limitations

The data is self-reported, unweighted and from one country and year; nearly half of the
raw survey records were excluded as incomplete. The score is not a calibrated personal
probability, and the per-answer effects describe the model's behaviour, not causes.
Nothing here is clinically validated.
