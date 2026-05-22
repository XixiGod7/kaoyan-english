import urllib.request
import urllib.parse
import json
import os
import argparse
from Crypto.Cipher import AES

Y = "397e2eb61307109f"
X = "1234567812345678"
base_url = "http://newtest.zoooy111.com/mobile.php"

def decrypt_data(data_hex):
    key = bytes.fromhex(Y) if len(Y) == 32 else Y.encode('utf-8')
    if len(key) != 16:
        key = bytes.fromhex(Y)
    iv = X.encode('utf-8')
    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted = cipher.decrypt(bytes.fromhex(data_hex))
    padding_len = decrypted[-1]
    decrypted = decrypted[:-padding_len]
    return decrypted.decode('utf-8')

def fetch_data(endpoint, params):
    url = base_url + endpoint + "?" + urllib.parse.urlencode(params)
    headers = {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'http://www.zhentibanlv.com/',
        'Origin': 'http://www.zhentibanlv.com'
    }
    req = urllib.request.Request(url, data=b"", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            body = response.read().decode('utf-8')
            res_json = json.loads(body)
            data_hex = res_json.get("data")
            if data_hex and isinstance(data_hex, str):
                return json.loads(decrypt_data(data_hex))
            return res_json
    except Exception as e:
        print(f"Error fetching {endpoint}: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Scrape zhentibanlv.com data")
    parser.add_argument("--token", required=True, help="Session key / token from localStorage")
    args = parser.parse_args()

    token = args.token

    print("Fetching English 1 Catalog (pid=12)...")
    catalog_res = fetch_data("/Datas/index", {
        "from": "toushujushisb",
        "pid": "12",
        "session_key": token
    })

    if not catalog_res or "data" not in catalog_res or "datas" not in catalog_res["data"]:
        print("Failed to fetch catalog. Invalid token or endpoint.")
        print(catalog_res)
        return

    years_data = catalog_res["data"]["datas"]
    print(f"Found {len(years_data)} years of exams.")
    
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "data")
    os.makedirs(out_dir, exist_ok=True)
    
    with open(os.path.join(out_dir, "english1_catalog.json"), "w", encoding="utf-8") as f:
        json.dump(years_data, f, ensure_ascii=False, indent=2)

    all_exams_data = {}
    
    for year_obj in years_data:
        year = year_obj["years"]
        print(f"\\n--- Processing Year: {year} ---")
        all_exams_data[year] = []
        
        for section in year_obj["list"]:
            section_id = section["id"]
            section_title = section["title"]
            print(f"Fetching {year} - {section_title} (ID: {section_id})...")
            
            section_data = fetch_data("/Datas2/backtm_new", {
                "from": "toushujushisb",
                "id": section_id,
                "session_key": token
            })
            
            if section_data and "data" in section_data:
                # The decrypted data is inside "data"
                exam_payload = section_data["data"]
                all_exams_data[year].append({
                    "meta": section,
                    "content": exam_payload
                })
            else:
                print(f"Failed to fetch ID {section_id}")
                
    with open(os.path.join(out_dir, "english1_full_data.json"), "w", encoding="utf-8") as f:
        json.dump(all_exams_data, f, ensure_ascii=False, indent=2)
        
    print("\\nScraping complete! Data saved to public/data/")

if __name__ == "__main__":
    main()
