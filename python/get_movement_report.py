import os
import sys
import json
import argparse
import datetime
import pandas as pd

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--gln', type=str, default='local')
    parser.add_argument('--days', type=int, default=7)
    args = parser.parse_args()

    gln = args.gln
    days = args.days

    base_dir = os.path.dirname(os.path.abspath(__file__))
    tenant_dir = os.path.join(base_dir, 'tenants', gln)
    parquet_path = os.path.join(tenant_dir, 'raw_data.parquet')

    if not os.path.exists(parquet_path):
        # Fallback to local
        tenant_dir = os.path.join(base_dir, 'tenants', 'local')
        parquet_path = os.path.join(tenant_dir, 'raw_data.parquet')

    if not os.path.exists(parquet_path):
        print(json.dumps([]))
        sys.exit(0)

    try:
        df = pd.read_parquet(parquet_path)
        if df.empty or 'satis_tarihi' not in df.columns or 'satis_adedi' not in df.columns:
            print(json.dumps([]))
            sys.exit(0)

        # Convert satis_tarihi to datetime
        df['satis_tarihi'] = pd.to_datetime(df['satis_tarihi'], errors='coerce')
        df = df.dropna(subset=['satis_tarihi'])

        if df.empty:
            print(json.dumps([]))
            sys.exit(0)

        # Reference date calculation (use max date if data is older than 30 days)
        latest_date = df['satis_tarihi'].max()
        now = datetime.datetime.now()
        if (now - latest_date).days > 30:
            reference_date = latest_date
        else:
            reference_date = now

        start_date = reference_date - datetime.timedelta(days=days)

        # Filter by date range
        filtered_df = df[df['satis_tarihi'] >= start_date]

        if filtered_df.empty:
            print(json.dumps([]))
            sys.exit(0)

        # Group by barcode and sum sales quantity, and get last sale date
        grouped = filtered_df.groupby('barkod').agg({
            'satis_adedi': 'sum',
            'lokal_urun_adi': 'last',
            'satis_tarihi': 'max'
        }).reset_index()

        # Sort by sales quantity descending
        grouped = grouped.sort_values(by='satis_adedi', ascending=False)

        # Convert to list of dicts
        results = []
        for _, row in grouped.iterrows():
            qty = float(row['satis_adedi'])
            if qty > 0:
                results.append({
                    "barcode": str(row['barkod']),
                    "name": str(row['lokal_urun_adi']),
                    "quantity": int(qty) if qty.is_integer() else round(qty, 2),
                    "last_sale_date": str(row['satis_tarihi'])
                })

        print(json.dumps(results, ensure_ascii=False))

    except Exception as e:
        print(json.dumps([]))

if __name__ == "__main__":
    main()
