from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[3]

print(PROJECT_ROOT)

if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))