#!/bin/sh
# sync-progress.sh — Synchronise Present app data with HABBIT skill progress.json
#
# Usage: ./sync-progress.sh [db.json | export.json]   (défaut : db.json à côté du script)
#   export-file.json : JSON exported from Present app (habits + completions)
#
# This script reads the Present app export and writes /var/minis/skills/habbit/progress.json
# mapping Present habits to HABBIT skill pillars.

SETTINGS_DIR="/var/minis/skills/habbit"
PROGRESS_FILE="$SETTINGS_DIR/progress.json"
EXPORT_FILE="${1:-$(dirname "$0")/db.json}"   # par défaut : db.json (écrit par server.py)

if [ -z "$EXPORT_FILE" ] || [ ! -f "$EXPORT_FILE" ]; then
  echo "Usage: $0 <export-file.json>"
  exit 1
fi

# Mapping: Present habit name -> HABBIT pillar key
map_pillar() {
  case "$1" in
    "Morning Prayer") echo "prayer_morning" ;;
    "Old Testament Reading") echo "reading_ot" ;;
    "New Testament Reading") echo "reading_nt" ;;
    "Scripture Memorization") echo "verse_memorized" ;;
    "Scripture Confession") echo "confession_aloud" ;;
    "Professional Work") echo "work_7_16" ;;
    "Noon Break") echo "pause_13h" ;;
    "Night Bible Study") echo "study_night" ;;
    "Evening Examination") echo "examen_obedient" ;;
    "Writing / Audio") echo "writing_audio" ;;
    *) echo "" ;;
  esac
}

# Read export file
EXPORT_JSON=$(cat "$EXPORT_FILE")

# Build progress.json structure
# We need to extract habits and completions from the export
HABITS_JSON=$(echo "$EXPORT_JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(json.dumps(data.get('habits', [])))
")

COMPLETIONS_JSON=$(echo "$EXPORT_JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(json.dumps(data.get('completions', [])))
")

# Generate progress.json using python3
python3 << PYEOF
import json, sys, os

habits = json.loads('''$HABITS_JSON''')
completions = json.loads('''$COMPLETIONS_JSON''')

# Map habit name to pillar
def map_pillar(name):
    mapping = {
        "Morning Prayer": "prayer_morning",
        "Old Testament Reading": "reading_ot",
        "New Testament Reading": "reading_nt",
        "Scripture Memorization": "verse_memorized",
        "Scripture Confession": "confession_aloud",
        "Professional Work": "work_7_16",
        "Noon Break": "pause_13h",
        "Night Bible Study": "study_night",
        "Evening Examination": "examen_obedient",
        "Writing / Audio": "writing_audio",
        "Prière du matin": "prayer_morning",
        "Lecture — Ancien Testament": "reading_ot",
        "Lecture — Nouveau Testament": "reading_nt",
        "Mémorisation": "verse_memorized",
        "Confession à voix haute": "confession_aloud",
        "Travail professionnel": "work_7_16",
        "Pause de midi": "pause_13h",
        "Étude biblique du soir": "study_night",
        "Examen du soir": "examen_obedient",
        "Écriture / Audio": "writing_audio",
    }
    return mapping.get(name, "")

# Group completions by date
days_map = {}
for c in completions:
    date = c.get("date")
    habit_id = c.get("habitId")
    # Find habit name
    habit_name = ""
    pillar = ""
    for h in habits:
        if h.get("id") == habit_id:
            habit_name = h.get("name", "")
            pillar = h.get("pillar", "")  # clé HABBIT stockée par Present v2
            break
    pillar = pillar or map_pillar(habit_name)
    if not pillar:
        continue
    if date not in days_map:
        days_map[date] = {
            "wake_time": "03:00",
            "pillars": {},
            "never_miss_twice_ok": True,
            "notes": "Synced from Present app",
            "streak_day": 1
        }
        # Default pillar values
        for p in ["prayer_morning","reading_ot","reading_nt","verse_memorized",
                  "confession_aloud","work_7_16","pause_13h","study_night",
                  "examen_obedient","writing_audio"]:
            days_map[date]["pillars"][p] = {"done": False}
    
    # Set pillar details
    if pillar == "prayer_morning":
        days_map[date]["pillars"][pillar] = {"done": True, "minutes": 180}
    elif pillar in ("reading_ot", "reading_nt"):
        days_map[date]["pillars"][pillar] = {"done": True, "chapters": 10}
    elif pillar == "verse_memorized":
        days_map[date]["pillars"][pillar] = {"done": True, "reference": "Synced"}
    elif pillar == "study_night":
        days_map[date]["pillars"][pillar] = {"done": True, "minutes": 30}
    else:
        days_map[date]["pillars"][pillar] = {"done": True}

# Compute streak
dates = sorted(days_map.keys())
streak = 0
best = 0
current = 0
prev = None
for d in dates:
    if prev is not None:
        from datetime import date, timedelta
        d1 = date.fromisoformat(prev)
        d2 = date.fromisoformat(d)
        if (d2 - d1).days == 1:
            current += 1
        else:
            current = 1
    else:
        current = 1
    best = max(best, current)
    prev = d
streak = current

# Check if today is complete
from datetime import date
today = date.today().isoformat()
today_complete = today in days_map and all(
    v.get("done", False) for v in days_map[today].get("pillars", {}).values()
)

# Build days list
days_list = []
for d in dates:
    day_data = days_map[d]
    all_done = all(v.get("done", False) for v in day_data["pillars"].values())
    day_entry = {
        "date": d,
        "wake_time": day_data.get("wake_time", "03:00"),
        "pillars": day_data["pillars"],
        "never_miss_twice_ok": True,
        "notes": day_data.get("notes", ""),
        "streak_day": 1
    }
    days_list.append(day_entry)

progress = {
    "schema_version": 1,
    "skill": "habbit",
    "linked_skill": "strict-teammate",
    "timezone": "Indian/Antananarivo",
    "examen_hour": 21,
    "current_streak": streak,
    "best_streak": best,
    "total_days": len(days_list),
    "complete_days": sum(1 for d in days_list if all(v.get("done", False) for v in d["pillars"].values())),
    "days": days_list
}

out_file = "$PROGRESS_FILE"
os.makedirs(os.path.dirname(out_file), exist_ok=True)
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(progress, f, ensure_ascii=False, indent=2)

print(f"Synced {len(days_list)} days to {out_file}")
print(f"Streak: {streak}, Best: {best}")
PYEOF
