import sys
import os
import json
import argparse
import pandas as pd

# Reconfigure stdout/stderr to use UTF-8 on Windows terminal to prevent Emoji encoding errors
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass
if sys.stderr.encoding != 'utf-8':
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

from nexus_processor import NexusProcessor

def main():
    parser = argparse.ArgumentParser(description="Nexus Local Processor CLI")
    parser.add_argument("gln", help="Pharmacy GLN")
    parser.add_argument("--import-json", help="Path to new raw JSON data to merge and import")
    
    args = parser.parse_args()
    gln = args.gln
    
    print(f"Starting local analysis for GLN: {gln}")
    
    try:
        # Initialize processor
        processor = NexusProcessor(gln)
        
        # Override onaylandi_mi to True for local version so it doesn't block analysis
        processor.onaylandi_mi = True
        
        # We can also fetch the pharmacy name or set a mock UUID if supabase connection fails
        if not processor.eczane_uuid:
            processor.eczane_uuid = f"local_uuid_{gln}"
            
        # 1. Check if we need to import raw JSON data
        if args.import_json:
            json_path = args.import_json
            if os.path.exists(json_path):
                print(f"Reading import data from {json_path}...")
                with open(json_path, 'r', encoding='utf-8') as f:
                    new_data = json.load(f)
                
                if new_data and len(new_data) > 0:
                    df_new = pd.DataFrame(new_data)
                    
                    # Convert numeric columns
                    numeric_cols = ['satis_adedi', 'stok_adet', 'lokal_psf', 'net_tutar', 'indirim']
                    for col in numeric_cols:
                        if col in df_new.columns:
                            df_new[col] = pd.to_numeric(df_new[col], errors='coerce').fillna(0)
                    
                    # Merge with existing parquet file
                    parquet_file = processor.parquet_path
                    if os.path.exists(parquet_file):
                        try:
                            df_old = pd.read_parquet(parquet_file)
                            
                            # Filter out duplicate keys/dates properly to handle updates/deletions in delta
                            if 'satis_tarihi' in df_new.columns and 'satis_tarihi' in df_old.columns:
                                df_new['satis_tarihi'] = df_new['satis_tarihi'].astype(str)
                                df_old['satis_tarihi'] = df_old['satis_tarihi'].astype(str)
                                min_new_date = df_new['satis_tarihi'].min()
                                print(f"Merging: removing records from existing data since {min_new_date} to prevent duplicates/stale data.")
                                df_old = df_old[df_old['satis_tarihi'] < min_new_date]
                                
                            df_final = pd.concat([df_old, df_new])
                            print(f"Merged {len(df_new)} new/updated records with {len(df_old)} existing records.")
                        except Exception as e:
                            print(f"Warning: Old data could not be read, starting fresh: {e}")
                            df_final = df_new
                    else:
                        df_final = df_new
                    
                    os.makedirs(os.path.dirname(parquet_file), exist_ok=True)
                    df_final.to_parquet(parquet_file, index=False)
                    print(f"Successfully saved merged data to {parquet_file}")
                else:
                    print("Warning: Import JSON file is empty.")
            else:
                print(f"Error: Import JSON file not found at {json_path}")
                sys.exit(4)
        
        # 2. Run analysis
        result = processor.run_full_analysis()
        
        if "error" in result:
            print(f"Analysis failed with error: {result['error']}")
            sys.exit(2)
            
        # Ensure tenant directory exists
        if getattr(sys, 'frozen', False):
            base_dir = os.path.dirname(sys.executable)
        else:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            
        tenant_dir = os.path.join(base_dir, "tenants", gln)
        os.makedirs(tenant_dir, exist_ok=True)
        
        # Save output to analysis_cache.json
        cache_path = os.path.join(tenant_dir, "analysis_cache.json")
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False)
            
        print(f"Success: Analysis completed and saved to {cache_path}")
        sys.exit(0)
        
    except Exception as e:
        print(f"Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(3)

if __name__ == "__main__":
    main()
