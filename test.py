#!/usr/bin/env python3
import requests
import base64
import json

# ------------------------------------------------------------
# 🔧 Konfiguration – bitte anpassen:
ATHLETE_ID = "i410575"                  # <- ohne "i" davor!
API_KEY = "3314sysdjt3ni1p8342di5393"  # <- direkten Key hier eintragen
# ------------------------------------------------------------

# Auth Header erstellen (Basic Auth wie in Doku)
auth_string = f"API_KEY:{API_KEY}"
auth_b64 = base64.b64encode(auth_string.encode()).decode()
headers = {
    "Authorization": f"Basic {auth_b64}",
    "Accept": "application/json"
}

# URL (absteigend sortiert, 60 Tage Rückblick)
url = f"https://intervals.icu/api/v1/athlete/{ATHLETE_ID}/activities?oldest=2025-09-01"

print("➡️ GET", url)
response = requests.get(url, headers=headers)

print("Status:", response.status_code)
print("Antwort (gekürzt):")
print(response.text[:600])
