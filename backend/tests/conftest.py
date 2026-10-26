# Yuva Saarthi — Pytest Fixtures & Test Setup
import os
import pytest

# Ensure demo routes are mounted during test suite runs
os.environ["ENABLE_DEMO_ROUTES"] = "true"
