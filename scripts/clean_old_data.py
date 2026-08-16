import os
import glob

PUBLIC_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "data"))

# Keep list: 2010-2026 bundles, task files, official index json files
def main():
    print("=== Cleaning Old Data Before Today ===")
    files = glob.glob(os.path.join(PUBLIC_DATA_DIR, "*.json"))
    
    # Old files to remove (e.g. 2000.json - 2009.json, answers.json)
    for f in files:
        fname = os.path.basename(f)
        if fname.startswith("200") or fname == "answers.json" or "_answers.json" in fname:
            print(f"Removing old data file: {fname}")
            try:
                os.remove(f)
            except Exception as e:
                print(f"Failed to remove {fname}: {e}")

    print("=== Old Data Cleanup Complete ===")

if __name__ == "__main__":
    main()
