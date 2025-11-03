import base64
import requests

PROXY_TOKEN = "mySuperSecretToken987"
ATHLETE_ID = "i410575"   # ohne i !
url = f"https://intervals-icu-proxy.vercel.app/api/icu/athlete/{ATHLETE_ID}/activities?oldest=2025-09-01"

headers = {
    "Authorization": f"Bearer {PROXY_TOKEN}",
    "Accept": "application/json"
}

print("➡️ GET", url)
response = requests.get(url, headers=headers, timeout=10)

print("Status:", response.status_code)
print("Antwort (gekürzt):")
print(response.text[:500])
