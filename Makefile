# GridShield AI — Master Automation Makefile

PYTHON = .venv/Scripts/python
PIP = .venv/Scripts/pip
PYTEST = .venv/Scripts/pytest

.PHONY: setup dev train test check demo-test types clean

setup:
	python -m venv .venv
	$(PIP) install -r backend/requirements.txt
	$(PYTHON) scripts/generate_types.py

types:
	$(PYTHON) scripts/generate_types.py

train:
	$(PYTHON) -m backend.app.services.train_models

test:
	$(PYTEST) backend/tests -v

check:
	$(PYTHON) scripts/check.py

demo-test:
	$(PYTHON) scripts/run_demo_test.py

clean:
	rm -rf .pytest_cache reports/*.tmp
