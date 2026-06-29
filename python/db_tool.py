import sys
import os
import sqlite3
import json

def get_db_connection():
    if getattr(sys, 'frozen', False):
        base_dir = os.path.dirname(os.path.dirname(sys.executable))
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, "database", "master_db.sqlite")
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database not found at {db_path}")
    return sqlite3.connect(db_path)

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"status": "error", "message": "Eksik parametre. Kullanım: db_tool.py <action> <query> [paramsJSON]"}))
        return

    action = sys.argv[1]
    query = sys.argv[2]
    params_str = sys.argv[3] if len(sys.argv) > 3 else "[]"
    
    try:
        params = json.loads(params_str)
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Parametre ayrıştırma hatası: {str(e)}"}))
        return

    if action == "execute":
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(query, params)
            
            # Select sorgusu ise verileri dön
            if cur.description:
                columns = [col[0] for col in cur.description]
                rows = cur.fetchall()
                results = []
                for row in rows:
                    results.append(dict(zip(columns, row)))
                conn.close()
                print(json.dumps({"status": "success", "data": results}))
            else:
                conn.commit()
                changes = conn.total_changes
                conn.close()
                print(json.dumps({"status": "success", "changes": changes}))
        except Exception as e:
            print(json.dumps({"status": "error", "message": str(e)}))

if __name__ == "__main__":
    main()
