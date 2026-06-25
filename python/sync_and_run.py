import sys
import os
import json
import datetime
import decimal

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

class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, (datetime.date, datetime.datetime)):
            return obj.isoformat()
        return super(CustomEncoder, self).default(obj)

def main():
    print("Initializing Nexus Sync and Run...")
    
    if len(sys.argv) < 2:
        print("Error: GLN argument is required.", file=sys.stderr)
        sys.exit(1)
        
    gln = sys.argv[1]
    full_sync = '--full' in sys.argv
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(base_dir)
    
    settings_path = os.path.join(base_dir, 'tenants', 'settings.json')
    if not os.path.exists(settings_path):
        print(f"Error: settings.json not found at {settings_path}", file=sys.stderr)
        sys.exit(1)
        
    with open(settings_path, 'r', encoding='utf-8') as f:
        settings = json.load(f)
        
    software = settings.get('software')
    if not software:
        print("Error: selected software in settings is empty.", file=sys.stderr)
        sys.exit(1)

    print(f"Running offline sync for GLN: {gln}, Software: {software}, FullSync: {full_sync}")

    conn_path = os.path.join(base_dir, 'configs', 'db_connections.json')
    queries_path = os.path.join(base_dir, 'configs', 'sql_queries.json')
    
    if not os.path.exists(conn_path) or not os.path.exists(queries_path):
        print("Error: Database configuration files are missing.", file=sys.stderr)
        sys.exit(1)
        
    with open(conn_path, 'r', encoding='utf-8') as f:
        connections = json.load(f)
    with open(queries_path, 'r', encoding='utf-8') as f:
        queries = json.load(f)
        
    software_config = connections.get(software) or {}
    software_queries = queries.get(software)
    
    if not software_queries:
        print(f"Error: Queries not found for software '{software}'", file=sys.stderr)
        sys.exit(1)
        
    db_server = settings.get('server_instance') or software_config.get('server_instance')
    db_name = settings.get('database') or software_config.get('database')
    raw_query_val = software_queries.get('fetch_raw_data')
    
    if isinstance(raw_query_val, list):
        raw_query = " ".join(raw_query_val)
    else:
        raw_query = str(raw_query_val)
        
    if not db_server or not db_name or not raw_query:
        print("Error: Incomplete database config or query.", file=sys.stderr)
        sys.exit(1)
        
    if not full_sync:
        raw_query = raw_query.replace("DATEADD(YEAR,-1,GETDATE())", "DATEADD(DAY,-5,GETDATE())")
        print("[Python] Performing delta refresh (last 5 days only)")
    else:
        print("[Python] Performing full database synchronization (last 1 year)")

    # 3. Connect to Database
    print("[STATUS] connecting")
    conn = None
    
    # Try pymssql first (integrated auth)
    try:
        import pymssql
        print(f"Connecting to SQL Server using pymssql (Server: {db_server}, DB: {db_name})...")
        conn = pymssql.connect(
            server=db_server,
            database=db_name,
            timeout=30
        )
        print("Connected successfully via pymssql.")
    except Exception as py_err:
        print(f"pymssql connection failed: {py_err}. Trying pyodbc fallback...")
        try:
            import pyodbc
            conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={db_server};DATABASE={db_name};Trusted_Connection=yes;"
            print(f"Connecting using pyodbc: {conn_str}")
            conn = pyodbc.connect(conn_str, timeout=30)
            print("Connected successfully via pyodbc.")
        except Exception as odbc_err:
            print(f"Error: Database connection failed on both pymssql and pyodbc.", file=sys.stderr)
            print(f"pymssql error: {py_err}", file=sys.stderr)
            print(f"pyodbc error: {odbc_err}", file=sys.stderr)
            sys.exit(1)

    # 4. Fetch Data
    print("[STATUS] fetching")
    cursor = conn.cursor()
    try:
        print("Executing SQL query...")
        cursor.execute(raw_query)
        rows = cursor.fetchall()
        
        columns = [
            "program", "barkod", "lokal_urun_adi", "satis_tipi", "satis_tarihi",
            "satis_adedi", "stok_adet", "lokal_psf", "net_tutar", "indirim",
            "miad_dagilimi", "son_5_alim_dagilimi", "favori_depo"
        ]
        
        raw_data = []
        for row in rows:
            record = {}
            for idx, col in enumerate(columns):
                val = row[idx]
                if isinstance(val, (datetime.datetime, datetime.date)):
                    val = val.isoformat()
                record[col] = val
            raw_data.append(record)
            
        print(f"Query completed successfully. Read {len(raw_data)} records.")
    except Exception as query_err:
        print(f"Error executing database query: {query_err}", file=sys.stderr)
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

    # 5. Save raw data temporarily
    print("[STATUS] processing")
    tenant_dir = os.path.join(base_dir, 'tenants', gln)
    os.makedirs(tenant_dir, exist_ok=True)
    temp_json_path = os.path.join(tenant_dir, 'temp_new_data.json')
    
    with open(temp_json_path, 'w', encoding='utf-8') as f:
        json.dump(raw_data, f, cls=CustomEncoder, ensure_ascii=False)
        
    # 6. Run local analysis processor
    print("Running local analysis processor...")
    from nexus_processor import NexusProcessor
    import pandas as pd
    
    try:
        processor = NexusProcessor(gln)
        processor.onaylandi_mi = True
        if not processor.eczane_uuid:
            processor.eczane_uuid = f"local_uuid_{gln}"
            
        if os.path.exists(temp_json_path):
            with open(temp_json_path, 'r', encoding='utf-8') as f:
                new_data = json.load(f)
                
            if new_data and len(new_data) > 0:
                df_new = pd.DataFrame(new_data)
                
                numeric_cols = ['satis_adedi', 'stok_adet', 'lokal_psf', 'net_tutar', 'indirim']
                for col in numeric_cols:
                    if col in df_new.columns:
                        df_new[col] = pd.to_numeric(df_new[col], errors='coerce').fillna(0)
                        
                parquet_file = processor.parquet_path
                if os.path.exists(parquet_file):
                    try:
                        df_old = pd.read_parquet(parquet_file)
                        
                        if 'satis_tarihi' in df_new.columns and 'satis_tarihi' in df_old.columns:
                            df_new['satis_tarihi'] = df_new['satis_tarihi'].astype(str)
                            df_old['satis_tarihi'] = df_old['satis_tarihi'].astype(str)
                            min_new_date = df_new['satis_tarihi'].min()
                            print(f"Merging: removing records from existing data since {min_new_date} to prevent duplicates.")
                            df_old = df_old[df_old['satis_tarihi'] < min_new_date]
                            
                        df_final = pd.concat([df_old, df_new])
                        print(f"Merged {len(df_new)} new/updated records with {len(df_old)} existing records.")
                    except Exception as merge_err:
                        print(f"Warning: Old data could not be merged: {merge_err}. Starting fresh.")
                        df_final = df_new
                else:
                    df_final = df_new
                    
                df_final.to_parquet(parquet_file, index=False)
                print(f"Saved merged parquet to {parquet_file}")
                
            try:
                os.remove(temp_json_path)
            except:
                pass
                
        # Run processor analysis
        result = processor.run_full_analysis()
        if "error" in result:
            print(f"Analysis failed with error: {result['error']}", file=sys.stderr)
            sys.exit(2)
            
        # Save output cache
        cache_path = os.path.join(tenant_dir, "analysis_cache.json")
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False)
            
        print("[STATUS] completed")
        print("Success: Analysis completed successfully.")
        sys.exit(0)
        
    except Exception as proc_err:
        print(f"Error during analysis processing: {proc_err}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(3)

if __name__ == '__main__':
    main()
