-- Create Keyspace
CREATE KEYSPACE IF NOT EXISTS cars_keyspace 
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'} 
AND durable_writes = true;

-- Create Table: car_views_by_user
CREATE TABLE IF NOT EXISTS cars_keyspace.car_views_by_user (
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

CREATE INDEX IF NOT EXISTS car_views_by_user_user_id_idx ON cars_keyspace.car_views_by_user (user_id);

-- Create Table: cleaned_cars
CREATE TABLE IF NOT EXISTS cars_keyspace.cleaned_cars (
    id uuid,
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
    year int,
    PRIMARY KEY (id)
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

-- Create Table: favorite_cars_by_user
CREATE TABLE IF NOT EXISTS cars_keyspace.favorite_cars_by_user (
    user_id text,
    added_date date,
    added_timestamp timestamp,
    car_id text,
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

CREATE INDEX IF NOT EXISTS favorite_cars_by_user_user_id_idx ON cars_keyspace.favorite_cars_by_user (user_id);

-- Create Table: user_preferences
CREATE TABLE IF NOT EXISTS cars_keyspace.user_preferences (
    user_id text,
    budget_max int,
    budget_min int,
    last_updated timestamp,
    mileage_max int,
    mileage_min int,
    preferred_brands set<text>,
    preferred_door_count set<int>,
    preferred_fuel_types set<text>,
    preferred_transmissions set<text>,
    preferred_years set<int>,
    PRIMARY KEY (user_id)
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

-- Create Table: user_recommendations
CREATE TABLE IF NOT EXISTS cars_keyspace.user_recommendations (
    user_id text,
    recommendation_date date,
    recommendation_timestamp timestamp,
    car_id text,
    rank int,
    recommendation_source text,
    score double,
    PRIMARY KEY ((user_id, recommendation_date), recommendation_timestamp, car_id)
) WITH CLUSTERING ORDER BY (recommendation_timestamp DESC, car_id ASC)
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

CREATE INDEX IF NOT EXISTS user_recommendations_user_id_idx ON cars_keyspace.user_recommendations (user_id);

-- Create Table: user_searches
CREATE TABLE IF NOT EXISTS cars_keyspace.user_searches (
    user_id text,
    search_date date,
    search_timestamp timestamp,
    filters map<text, text>,
    result_count int,
    search_query text,
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

CREATE INDEX IF NOT EXISTS user_searches_user_id_idx ON cars_keyspace.user_searches (user_id);

-- Create Table: user_similarities
CREATE TABLE IF NOT EXISTS cars_keyspace.user_similarities (
    target_user_id text,
    reference_user_id text,
    last_updated timestamp,
    similarity_score double,
    PRIMARY KEY (target_user_id, reference_user_id)
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

-- Create Table: users
CREATE TABLE IF NOT EXISTS cars_keyspace.users (
    user_id text,
    age int,
    created_at timestamp,
    email text,
    location text,
    password text,
    username text,
    PRIMARY KEY (user_id)
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

CREATE INDEX IF NOT EXISTS users_email_idx ON cars_keyspace.users (email);