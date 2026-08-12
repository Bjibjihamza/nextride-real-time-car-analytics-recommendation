# Recreating the `cars_keyspace` Database in Cassandra

This document provides a step-by-step guide to recreate the `cars_keyspace` keyspace in Apache Cassandra from scratch, including the creation of the keyspace, all tables, and their respective indexes. The commands are provided in CQL (Cassandra Query Language) and should be executed in the `cqlsh` shell.

## Prerequisites

- Apache Cassandra installed and running.
- Access to the `cqlsh` shell.
- Administrative privileges to create and drop keyspaces.

## Step 1: Drop Existing Keyspace (If Necessary)

If the `cars_keyspace` keyspace already exists, it must be dropped to start from scratch. **Warning**: This will delete all data in the keyspace.

```cql
DROP KEYSPACE IF EXISTS cars_keyspace;
```

## Step 2: Create the Keyspace

Create the `cars_keyspace` keyspace with the specified replication strategy and settings.

```cql
CREATE KEYSPACE cars_keyspace 
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'} 
AND durable_writes = true;
```

### Explanation

- **Replication Strategy**: `SimpleStrategy` is used for single-datacenter clusters.
- **Replication Factor**: Set to `1` for simplicity (use `3` or higher in production for fault tolerance).
- **Durable Writes**: Ensures writes are persistent.

## Step 3: Create Tables and Indexes

The following sections provide the CQL commands to create each table and its associated indexes.

### Table: `car_views_by_user`

Tracks car views by users, partitioned by `user_id` and `view_date`.

```cql
CREATE TABLE cars_keyspace.car_views_by_user (
    user_id text,
    view_date date,
    view_timestamp timestamp,
    car_id text,
    view_duration_seconds int,
    view_source text,
    PRIMARY KEY ((user_id, view_date), view_timestamp, car_id)
) WITH CLUSTERING ORDER BY (view_timestamp DESC, car_id ASC)
    AND additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';
```

#### Index

```cql
CREATE INDEX car_views_by_user_user_id_idx ON cars_keyspace.car_views_by_user (user_id);
```

### Table: `cleaned_cars`

Stores detailed information about cars, with `id` as the primary key.

```cql
CREATE TABLE cars_keyspace.cleaned_cars (
    id uuid PRIMARY KEY,
    brand text,
    condition text,
    creator text,
    door_count int,
    equipment text,
    first_owner text,
    fiscal_power int,
    fuel_type text,
    image_folder text,
    mileage int,
    model text,
    origin text,
    price int,
    publication_date text,
    sector text,
    seller_city text,
    source text,
    title text,
    transmission text,
    year int
) WITH additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';
```

#### Indexes

```cql
CREATE INDEX cleaned_cars_brand_idx ON cars_keyspace.cleaned_cars (brand);
CREATE INDEX cleaned_cars_publication_date ON cars_keyspace.cleaned_cars (publication_date);
```

### Table: `favorite_cars_by_user`

Tracks users' favorite cars, partitioned by `user_id` and `added_date`.

```cql
CREATE TABLE cars_keyspace.favorite_cars_by_user (
    user_id uuid,
    added_date date,
    added_timestamp timestamp,
    car_id uuid,
    PRIMARY KEY ((user_id, added_date), added_timestamp, car_id)
) WITH CLUSTERING ORDER BY (added_timestamp DESC, car_id ASC)
    AND additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';
```

#### Index

```cql
CREATE INDEX favorite_cars_by_user_user_id_idx ON cars_keyspace.favorite_cars_by_user (user_id);
```

### Table: `user_preferences`

Stores user preferences for car searches, with `user_id` as the primary key.

```cql
CREATE TABLE cars_keyspace.user_preferences (
    user_id uuid PRIMARY KEY,
    budget_max int,
    budget_min int,
    last_updated timestamp,
    mileage_max int,
    mileage_min int,
    preferred_brands set<text>,
    preferred_door_count set<int>,
    preferred_fuel_types set<text>,
    preferred_transmissions set<text>,
    preferred_years set<int>
) WITH additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';
```

### Table: `user_recommendations`

Stores car recommendations for users, partitioned by `user_id`.

```cql
CREATE TABLE cars_keyspace.user_recommendations (
    user_id uuid,
    car_id uuid,
    created_at timestamp,
    rank int,
    recommendation_reason text,
    recommendation_score float,
    PRIMARY KEY (user_id, car_id)
) WITH CLUSTERING ORDER BY (car_id ASC)
    AND additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';
```

### Table: `user_searches`

Tracks user search history, partitioned by `user_id` and `search_date`.

```cql
CREATE TABLE cars_keyspace.user_searches (
    user_id uuid,
    search_date date,
    search_timestamp timestamp,
    result_count int,
    search_query text,
    filters map<text, text>,
    PRIMARY KEY ((user_id, search_date), search_timestamp)
) WITH CLUSTERING ORDER BY (search_timestamp DESC)
    AND additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';
```

#### Index

```cql
CREATE INDEX user_searches_user_id_idx ON cars_keyspace.user_searches (user_id);
```

### Table: `user_similarities`

Stores similarity scores between users, partitioned by `target_user_id`.

```cql
CREATE TABLE cars_keyspace.user_similarities (
    target_user_id uuid,
    reference_user_id uuid,
    last_updated timestamp,
    similarity_score float,
    PRIMARY KEY (target_user_id, reference_user_id)
) WITH CLUSTERING ORDER BY (reference_user_id ASC)
    AND additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';
```

### Table: `users`

Stores user information, with `user_id` as the primary key.

```cql
CREATE TABLE cars_keyspace.users (
    user_id uuid PRIMARY KEY,
    age int,
    created_at timestamp,
    email text,
    location text,
    password text,
    username text
) WITH additional_write_policy = '99p'
    AND bloom_filter_fp_chance = 0.01
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'NONE'}
    AND cdc = false
    AND comment = ''
    AND compaction = {'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}
    AND compression = {'chunk_length_in_kb': '16', 'class': 'org.apache.cassandra.io.compress.LZ4Compressor'}
    AND memtable = 'default'
    AND crc_check_chance = 1.0
    AND default_time_to_live = 0
    AND extensions = {}
    AND gc_grace_seconds = 864000
    AND max_index_interval = 2048
    AND memtable_flush_period_in_ms = 0
    AND min_index_interval = 128
    AND read_repair = 'BLOCKING'
    AND speculative_retry = '99p';
```

## Step 4: Verify the Creation

After executing all commands, verify the keyspace and table creation by running:

```cql
DESCRIBE KEYSPACE cars_keyspace;
```

This will display the complete structure of the keyspace, including all tables and indexes.

## Additional Notes

### Production Considerations

- **Replication Strategy**: Use `NetworkTopologyStrategy` for multi-datacenter clusters.
- **Replication Factor**: Increase to `3` or higher for fault tolerance.
- **Testing**: Test the setup in a development environment before applying to production.

### Automation

To execute these commands efficiently, save them in a `.cql` file (e.g., `create_cars_keyspace.cql`) and run:

```bash
cqlsh -f create_cars_keyspace.cql
```

### Backup

Before dropping the keyspace, create a backup using `nodetool snapshot` if existing data needs to be preserved.

### Performance Tuning

- Adjust parameters like `bloom_filter_fp_chance`, `compaction`, and `compression` based on workload (e.g., read-heavy vs. write-heavy).
- Monitor and optimize index usage, as secondary indexes can impact performance.

## Conclusion

By following these steps, the `cars_keyspace` database will be recreated with all tables and indexes as specified. For further assistance or optimization, refer to the Cassandra documentation or contact the database administrator.