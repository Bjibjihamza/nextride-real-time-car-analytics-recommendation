# Quick Setup Guide for `cars_keyspace` Database

This guide explains how to set up the `cars_keyspace` database in Cassandra using the files in `~/projects/cars_recommandation_pipeline/documentaions/database`.

## Files

- `create_cars_keyspace.cql`: Creates the database structure.
- `import_data.py`: Imports data from CSV files.
- CSV files:
    - `car_views_by_user.csv`
    - `cleaned_cars.csv`
    - `favorite_cars_by_user.csv`
    - `user_preferences.csv`
    - `user_searches.csv`
    - `user_similarities.csv`
    - `users.csv`

## Steps

1. **Create Database Structure**
    
    - Run:
        
        ```bash
        cqlsh -f create_cars_keyspace.cql
        ```
        
    - This creates the `cars_keyspace` keyspace and 8 tables (`car_views_by_user`, `cleaned_cars`, etc.).
    - Verify in `cqlsh`:
        
        ```sql
        DESCRIBE KEYSPACE cars_keyspace;
        ```
        
        Should list 8 tables.
2. **Check `import_data.py`**
    
    - Open: `nano import_data.py`
    - Ensure:
        
        ```python
        CSV_DIR = '/home/hamzabji/projects/cars_recommandation_pipeline/documentaions/database/'
        CASSANDRA_HOST = ['127.0.0.1']
        ```
        
    - Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).
    - Verify CSV files:
        
        ```bash
        ls *.csv
        ```
        
        Should see: `car_views_by_user.csv`, `cleaned_cars.csv`, `favorite_cars_by_user.csv`, `user_preferences.csv`, `user_searches.csv`, `user_similarities.csv`, `users.csv`.
3. **Import Data**
    
    - Run:
        
        ```bash
        python import_data.py
        ```
        
    - Expected output:
        
        ```
        Imported 47 rows into car_views_by_user.
        Imported 35 rows into cleaned_cars.
        Imported 35 rows into favorite_cars_by_user.
        Imported 8 rows into user_preferences.
        Imported 8 rows into user_searches.
        Imported 14 rows into user_similarities.
        Imported 8 rows into users.
        ```
        
        Note: `user_recommendations` is skipped (no CSV).
4. **Verify Data**
    
    - In `cqlsh`:
        
        ```sql
        SELECT COUNT(*) FROM cars_keyspace.car_views_by_user;  -- 47
        SELECT COUNT(*) FROM cars_keyspace.cleaned_cars;      -- 35
        SELECT COUNT(*) FROM cars_keyspace.favorite_cars_by_user; -- 35
        SELECT COUNT(*) FROM cars_keyspace.user_preferences;  -- 8
        SELECT COUNT(*) FROM cars_keyspace.user_recommendations; -- 0
        SELECT COUNT(*) FROM cars_keyspace.user_searches;     -- 8
        SELECT COUNT(*) FROM cars_keyspace.user_similarities; -- 14
        SELECT COUNT(*) FROM cars_keyspace.users;             -- 8
        ```
        
    - Spot-check:
        
        ```sql
        SELECT * FROM cars_keyspace.cleaned_cars LIMIT 5;
        ```
        

## Troubleshooting

- **CQL Script Fails**:
    - Ensure Cassandra is running: `nodetool status`.
    - Try: `cqlsh localhost 9042 -f create_cars_keyspace.cql`.
- **Python Script Errors**:
    - **File not found**: Check `CSV_DIR` and CSV files (`ls *.csv`).
    - **Connection error**: Verify `CASSANDRA_HOST` and Cassandra status.
    - **Type error**: Check CSV data (e.g., `head cleaned_cars.csv` for valid UUIDs).
- **No Rows Imported**:
    - Check CSV sizes: `wc -l *.csv`.
    - Ensure CSV headers match `import_data.py` columns.
- **Errors**: Share error message or CSV snippet for help.

## Notes

- `user_recommendations.csv` is missing (empty table, OK to skip).
- Ensure `cassandra-driver` and `pandas` are installed:
    
    ```bash
    pip install cassandra-driver pandas
    ```
    
- Refer to this file for guidance during setup.