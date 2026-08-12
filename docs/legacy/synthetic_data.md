# Synthetic Data Generation Documentation for `cars_keyspace`

## Overview

This documentation details the synthetic data generation process for the `cars_keyspace` Cassandra database, which models user interactions in a car marketplace. The database includes six tables: `users`, `user_preferences`, `car_views_by_user`, `user_searches`, `favorite_cars_by_user`, and `user_similarities`. The goal is to create a realistic, coherent dataset for testing, developing recommendation systems, and analyzing user behavior. Each table’s schema, data generation logic, Python implementation, and design rationale are described, with a focus on the cosine similarity algorithm for user similarities. The document also covers data consistency, performance optimization, error handling, scalability, and practical applications.

The process uses Python with the `cassandra-driver` and `Faker` libraries to generate data, leveraging `cleaned_cars` for car attributes and ensuring consistency across tables. This documentation is intended for developers, data engineers, and analysts working with the `cars_keyspace` database.


---

## Prerequisites

To run the synthetic data generation scripts, ensure the following:

- **Cassandra**: Version 4.1.8, accessible at `localhost` (adjust `CASSANDRA_HOST` as needed).
- **Python Libraries**: Install `cassandra-driver`, `faker`, and `uuid` via pip:
    
    ```bash
    pip install cassandra-driver faker
    ```
    
- **Database Setup**: The `cars_keyspace` schema must be created with the `cleaned_cars` table populated with car data (e.g., `brand`, `model`, `sector`).
- **Configuration**: Update `CASSANDRA_HOST` and `CASSANDRA_KEYSPACE` in scripts to match your environment.

Scripts assume a `datacenter1` data center for `DCAwareRoundRobinPolicy`. Adjust the load balancing policy if using a different Cassandra topology.

---

## Table: `users`

### Objective

The `users` table stores core user information, serving as the primary reference for user identities across the database. It includes unique identifiers, contact details, demographics, and account creation timestamps.

### Schema

```sql
CREATE TABLE cars_keyspace.users (
    user_id uuid PRIMARY KEY,
    username text,
    email text,
    age int,
    location text,
    created_at timestamp
);
```

### Data Generation

The script generates synthetic users using the `Faker` library for realistic data, ensuring each user is unique and contextually relevant to the car marketplace.

- **user_id**: A universally unique identifier generated with `uuid4()`.
- **username**: A realistic username from `Faker.user_name()` (e.g., `john_doe123`).
- **email**: A plausible email address from `Faker.email()` (e.g., `john.doe@example.com`).
- **age**: A random integer in [18, 65], uniformly distributed to represent adult car buyers.
- **location**: A random `sector` from `cleaned_cars`, filtered to exclude invalid values (e.g., `"NaN"`). Defaults to a predefined list (Casablanca, Rabat, Marrakech, Fes, Tanger, Agadir, Oujda) if no valid sectors are found.
- **created_at**: The current UTC timestamp (`datetime.now(UTC)`).

Each user insertion triggers a corresponding entry in `user_preferences` with only the `user_id` populated, ensuring referential integrity.

### Implementation

The script connects to Cassandra using the `cassandra-driver` library, configured with `protocol_version=5` and `DCAwareRoundRobinPolicy` for efficient load balancing. It queries `cleaned_cars` for unique sectors and uses `SimpleStatement` for optimized query execution.

```python
import logging
from uuid import uuid4
from faker import Faker
from datetime import datetime, UTC
from cassandra.cluster import Cluster
from cassandra.policies import DCAwareRoundRobinPolicy
from cassandra.query import SimpleStatement

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
fake = Faker()

# Connect to Cassandra
cluster = Cluster(['localhost'], protocol_version=5, load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='datacenter1'))
session = cluster.connect('cars_keyspace')

# Fetch sectors
rows = session.execute(SimpleStatement("SELECT sector FROM cleaned_cars"))
cities = list(set(row.sector for row in rows if row.sector and row.sector != '"NaN"' and row.sector != 'NaN'))
if not cities:
    logger.warning("No valid sectors found. Using default cities.")
    cities = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tanger', 'Agadir', 'Oujda']

# Generate user
user = {
    'user_id': uuid4(),
    'username': fake.user_name(),
    'email': fake.email(),
    'age': random.randint(18, 65),
    'location': random.choice(cities),
    'created_at': datetime.now(UTC)
}

# Insert user
query = """
    INSERT INTO users (user_id, username, email, age, location, created_at)
    VALUES (%s, %s, %s, %s, %s, %s)
"""
session.execute(query, (user['user_id'], user['username'], user['email'], user['age'], user['location'], user['created_at']))

# Insert into user_preferences
query = "INSERT INTO user_preferences (user_id) VALUES (%s)"
session.execute(query, (user['user_id'],))
logger.info(f"Inserted user {user['user_id']} and user_preferences entry")
```

### Rationale

- **Realism**: `Faker` generates credible usernames and emails, enhancing dataset authenticity.
- **Uniqueness**: UUIDs ensure no collisions, critical for a primary key.
- **Geographic Consistency**: Using `cleaned_cars.sector` aligns user locations with car data, with a fallback for robustness.
- **Referential Integrity**: Immediate `user_preferences` insertion prepares the database for preference updates.

### Example

```python
user = {
    'user_id': '550e8400-e29b-41d4-a716-446655440000',
    'username': 'alice_smith45',
    'email': 'alice.smith@example.com',
    'age': 28,
    'location': 'Marrakech',
    'created_at': '2025-04-25T12:34:56Z'
}
```

### Error Handling

- **Connection Failures**: Logs errors and raises exceptions if Cassandra is unreachable.
- **Missing Sectors**: Falls back to a default city list and logs a warning.
- **Insertion Failures**: Retries queries up to 3 times before logging an error and raising an exception.

---

## Table: `user_preferences`

### Objective

The `user_preferences` table stores user-specific car preferences (e.g., brands, fuel types, budget ranges) to support personalized recommendations and filtering.

### Schema

```sql
CREATE TABLE cars_keyspace.user_preferences (
    user_id uuid PRIMARY KEY,
    preferred_brands set<text>,
    preferred_fuel_types set<text>,
    preferred_transmissions set<text>,
    budget_min int,
    budget_max int,
    preferred_door_count set<int>,
    mileage_min int,
    mileage_max int,
    preferred_years set<int>,
    last_updated timestamp
);
```

### Data Generation

Preferences are updated for existing `user_id` entries in `user_preferences`, initially populated by the `users` script. Data is sourced from `cleaned_cars` for brands and fixed lists for other attributes to ensure realism and consistency.

- **user_id**: Retrieved from `user_preferences`.
- **preferred_brands**: 1–3 brands randomly sampled from `cleaned_cars.brand`, excluding invalid values (e.g., `"NaN"`). Defaults to [Toyota, BMW, Mercedes, Volkswagen, Hyundai, Ford, Dacia] if no valid brands exist.
- **preferred_fuel_types**: 1–2 types from [hybride, essence, diesel].
- **preferred_transmissions**: 1 type from [manuelle, automatique].
- **budget_min**: Random integer in [20,000, 100,000].
- **budget_max**: Random integer in [budget_min + 10,000, 500,000].
- **preferred_door_count**: 1–2 values from [3, 5, 7].
- **mileage_min**: Random integer in [0, 100,000].
- **mileage_max**: Random integer in [mileage_min + 10,000, 300,000].
- **preferred_years**: Set of 2 years; min in [2000, 2020], max in [min + 1, 2025].
- **last_updated**: Current UTC timestamp.

### Implementation

The script uses `UPDATE` queries to modify existing rows, ensuring no new `user_id`s are created. It filters `cleaned_cars.brand` for valid entries and uses random sampling to create diverse preferences. The Cassandra `set` type ensures unique values within collections.

```python
rows = session.execute(SimpleStatement("SELECT brand FROM cleaned_cars"))
brands = list(set(row.brand.strip() for row in rows if row.brand and row.brand != '"NaN"' and row.brand != 'NaN'))
if not brands:
    brands = ['Toyota', 'BMW', 'Mercedes', 'Volkswagen', 'Hyundai', 'Ford', 'Dacia']

rows = session.execute(SimpleStatement("SELECT user_id FROM user_preferences"))
user_ids = [row.user_id for row in rows]

for user_id in user_ids:
    budget_min = random.randint(20000, 100000)
    mileage_min = random.randint(0, 100000)
    year_min = random.randint(2000, 2020)
    preference = {
        'user_id': user_id,
        'preferred_brands': set(random.sample(brands, k=random.randint(1, min(3, len(brands))))),
        'preferred_fuel_types': set(random.sample(['hybride', 'essence', 'diesel'], k=random.randint(1, 2))),
        'preferred_transmissions': set(random.sample(['manuelle', 'automatique'], k=1)),
        'budget_min': budget_min,
        'budget_max': random.randint(budget_min + 10000, 500000),
        'preferred_door_count': set(random.sample([3, 5, 7], k=random.randint(1, 2))),
        'mileage_min': mileage_min,
        'mileage_max': random.randint(mileage_min + 10000, 300000),
        'preferred_years': {year_min, random.randint(year_min + 1, 2025)},
        'last_updated': datetime.now(UTC)
    }
    query = """
        UPDATE user_preferences
        SET preferred_brands = %s, preferred_fuel_types = %s, preferred_transmissions = %s,
            budget_min = %s, budget_max = %s, preferred_door_count = %s,
            mileage_min = %s, mileage_max = %s, preferred_years = %s, last_updated = %s
        WHERE user_id = %s
    """
    session.execute(query, (
        preference['preferred_brands'], preference['preferred_fuel_types'], preference['preferred_transmissions'],
        preference['budget_min'], preference['budget_max'], preference['preferred_door_count'],
        preference['mileage_min'], preference['mileage_max'], preference['preferred_years'],
        preference['last_updated'], preference['user_id']
    ))
```

### Rationale

- **Diversity**: Random sampling within realistic ranges creates varied user profiles.
- **Alignment**: Sourcing brands from `cleaned_cars` ensures preferences match available cars.
- **Simplicity**: Fixed lists for fuel types and transmissions reduce complexity while covering common options.
- **Consistency**: The `UPDATE` approach preserves the initial `user_id` population from the `users` script.

### Example

```python
preference = {
    'user_id': '550e8400-e29b-41d4-a716-446655440000',
    'preferred_brands': {'Toyota', 'BMW'},
    'preferred_fuel_types': {'essence', 'hybride'},
    'preferred_transmissions': {'automatique'},
    'budget_min': 50000,
    'budget_max': 200000,
    'preferred_door_count': {5},
    'mileage_min': 20000,
    'mileage_max': 150000,
    'preferred_years': {2015, 2020},
    'last_updated': '2025-04-25T12:34:56Z'
}
```

### Error Handling

- **Missing Brands**: Defaults to a predefined brand list and logs a warning.
- **Empty User IDs**: Raises a `ValueError` if no `user_id`s are found in `user_preferences`.
- **Query Failures**: Retries up to 3 times, logging errors and raising exceptions if unsuccessful.

---

## Table: `car_views_by_user`

### Objective

The `car_views_by_user` table tracks user interactions with car listings, capturing view timestamps, durations, and sources to analyze engagement patterns.

### Schema

```sql
CREATE TABLE car_views_by_user (
    user_id text,
    view_date date,
    view_timestamp timestamp,
    car_id text,
    view_duration_seconds int,
    view_source text,
    PRIMARY KEY ((user_id, view_date), view_timestamp, car_id)
) WITH CLUSTERING ORDER BY (view_timestamp DESC);
```

### Data Generation

Views are generated for users in `user_preferences`, with 1–5 views per user to simulate realistic browsing behavior.

- **user_id**: Retrieved from `user_preferences`.
- **view_date**: Random date within the last 30 days.
- **view_timestamp**: Combines `view_date` with a random UTC time (hour, minute, second).
- **car_id**: Selected from `cleaned_cars` where `brand` matches `preferred_brands`; falls back to a random `car_id` if no matches exist.
- **view_duration_seconds**: Random integer in [5, 300] (5 seconds to 5 minutes).
- **view_source**: Random choice from ['SEARCH', 'RECOMMENDATION', 'BROWSE', 'ADVERTISEMENT'].

### Implementation

The script queries `user_preferences` for `user_id` and `preferred_brands`, then fetches matching `car_id`s from `cleaned_cars` using an `IN` clause with `fetch_size=1000` for pagination. A fallback to all `car_id`s ensures generation proceeds even with sparse preferences.

```python
def get_car_ids_for_brands(preferred_brands):
    query = SimpleStatement("SELECT id FROM cleaned_cars WHERE brand IN %s", fetch_size=1000)
    rows = session.execute(query, [tuple(preferred_brands)])
    car_ids = [row.id for row in rows]
    if not car_ids:
        logger.warning(f"No cars found for brands {preferred_brands}. Using fallback.")
        return all_car_ids
    return car_ids

rows = session.execute(SimpleStatement("SELECT user_id, preferred_brands FROM user_preferences"))
user_preferences = {row.user_id: row.preferred_brands for row in rows if row.preferred_brands}
rows = session.execute(SimpleStatement("SELECT id FROM cleaned_cars"))
all_car_ids = [row.id for row in rows]

for user_id, preferred_brands in user_preferences.items():
    num_views = random.randint(1, 5)
    for _ in range(num_views):
        days_ago = random.randint(0, 30)
        view_date = (datetime.now(UTC) - timedelta(days=days_ago)).date()
        view_timestamp = datetime.combine(view_date, datetime.min.time()).replace(
            hour=random.randint(0, 23), minute=random.randint(0, 59), second=random.randint(0, 59), tzinfo=UTC
        )
        car_view = {
            'user_id': str(user_id),
            'view_date': view_date,
            'view_timestamp': view_timestamp,
            'car_id': random.choice(get_car_ids_for_brands(preferred_brands)),
            'view_duration_seconds': random.randint(5, 300),
            'view_source': random.choice(['SEARCH', 'RECOMMENDATION', 'BROWSE', 'ADVERTISEMENT'])
        }
        query = """
            INSERT INTO car_views_by_user (user_id, view_date, view_timestamp, car_id, view_duration_seconds, view_source)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        session.execute(query, (
            car_view['user_id'], car_view['view_date'], car_view['view_timestamp'],
            car_view['car_id'], car_view['view_duration_seconds'], car_view['view_source']
        ))
```

### Rationale

- **Relevance**: Prioritizing `preferred_brands` ensures views align with user interests.
- **Robustness**: The fallback to all `car_id`s handles cases where preferences are sparse or brands are missing.
- **Realism**: Random durations and sources simulate varied user engagement patterns.
- **Performance**: Partitioning by `user_id` and `view_date`, with clustering by `view_timestamp DESC`, optimizes retrieval of recent views.

### Example

```python
car_view = {
    'user_id': '550e8400-e29b-41d4-a716-446655440000',
    'view_date': '2025-04-01',
    'view_timestamp': '2025-04-01T14:30:45Z',
    'car_id': 'uuid_car_toyota',
    'view_duration_seconds': 120,
    'view_source': 'SEARCH'
}
```

### Error Handling

- **No Preferences**: Skips users with missing `preferred_brands`, logging a warning.
- **No Cars**: Raises a `ValueError` if `cleaned_cars` is empty.
- **Insertion Errors**: Retries up to 3 times, logging failures and raising exceptions.

---

## Table: `user_searches`

### Objective

The `user_searches` table captures user search activities, including queries, filters, and result counts, to model search behavior and infer preferences.

### Schema

```sql
CREATE TABLE cars_keyspace.user_searches (
    user_id uuid,
    search_date date,
    search_timestamp timestamp,
    search_query text,
    filters map<text, text>,
    result_count int,
    PRIMARY KEY ((user_id, search_date), search_timestamp)
) WITH CLUSTERING ORDER BY (search_timestamp DESC);
```

### Data Generation

Searches are generated for approximately 50% of users in `users`, selected randomly, with one search per user per script run to simulate active searchers.

- **user_id**: Random sample of 50% of `users.user_id`.
- **search_date**: Random date within the last 30 days.
- **search_timestamp**: Random UTC time on `search_date` (hour, minute, second).
- **search_query**: 1–5 keywords (brand, model, sector, year, condition) from `cleaned_cars`, aligned with filters if applicable. Defaults include models like Corolla, X5, and conditions like `used` or `new`.
- **filters**: Map with 1–5 key-value pairs (e.g., `brand: Toyota`, `budget_max: 200000`), sourced from `cleaned_cars`, `user_preferences`, or fixed lists (e.g., transmissions: [manuelle, automatique]).
- **result_count**: Random integer in [0, 50], representing search result counts.

### Implementation

The script fetches `user_id`s from `users`, `preferred_brands` from `user_preferences`, and attributes (brands, models, sectors) from `cleaned_cars`. It ensures query and filter consistency, using defaults for robustness.

```python
rows = session.execute(SimpleStatement("SELECT user_id FROM users"))
all_user_ids = [row.user_id for row in rows]
user_ids = random.sample(all_user_ids, k=max(1, len(all_user_ids) // 2))

rows = session.execute(SimpleStatement("SELECT user_id, preferred_brands FROM user_preferences"))
user_preferences = {row.user_id: row.preferred_brands for row in rows if row.preferred_brands}

rows = session.execute(SimpleStatement("SELECT brand, model, sector FROM cleaned_cars WHERE brand IS NOT NULL"))
brands = list(set(row.brand.strip() for row in rows if row.brand and row.brand != 'NaN' and row.brand != '"NaN"'))
models = list(set(row.model.strip() for row in rows if row.model and row.model != 'NaN'))
sectors = list(set(row.sector.strip() for row in rows if row.sector and row.sector != 'NaN'))
if not brands:
    brands = ['Toyota', 'BMW', 'Mercedes', 'Volkswagen', 'Hyundai', 'Ford', 'Dacia']

for user_id in user_ids:
    preferred_brands = user_preferences.get(user_id, set())
    available_brands = list(preferred_brands) + brands if preferred_brands else brands
    days_ago = random.randint(0, 30)
    search_date = (datetime.now(UTC) - timedelta(days=days_ago)).date()
    search_timestamp = datetime.combine(search_date, datetime.min.time()).replace(
        hour=random.randint(0, 23), minute=random.randint(0, 59), second=random.randint(0, 59), tzinfo=UTC
    )
    filters = {}
    possible_filters = [
        ('brand', random.choice(available_brands)),
        ('budget_max', str(random.randint(50000, 500000))),
        ('door_count', random.choice(['3', '5', '7'])),
        ('mileage_max', str(random.randint(50000, 300000))),
        ('transmission', random.choice(['manuelle', 'automatique']))
    ]
    filters = dict(random.sample(possible_filters, k=random.randint(1, len(possible_filters))))
    query_components = [filters.get('brand', random.choice(available_brands)), random.choice(models)]
    search = {
        'user_id': user_id,
        'search_date': search_date,
        'search_timestamp': search_timestamp,
        'search_query': ' '.join(query_components).strip(),
        'filters': filters,
        'result_count': random.randint(0, 50)
    }
    query = """
        INSERT INTO user_searches (user_id, search_date, search_timestamp, search_query, filters, result_count)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    session.execute(query, (
        search['user_id'], search['search_date'], search['search_timestamp'],
        search['search_query'], search['filters'], search['result_count']
    ))
```

### Rationale

- **Variety**: Random sampling of 50% of users creates a realistic subset of active searchers.
- **Coherence**: Aligning `search_query` with `filters` mimics real user behavior.
- **Flexibility**: The `map<text, text>` type supports diverse filter combinations.
- **Performance**: Partitioning by `user_id` and `search_date` optimizes query performance for time-based retrieval.

### Example

```python
search = {
    'user_id': '550e8400-e29b-41d4-a716-446655440000',
    'search_date': '2025-04-10',
    'search_timestamp': '2025-04-10T09:15:20Z',
    'search_query': 'Toyota Corolla used',
    'filters': {'brand': 'Toyota', 'budget_max': '150000', 'transmission': 'automatique'},
    'result_count': 42
}
```

### Error Handling

- **No Users**: Raises a `ValueError` if `users` is empty.
- **Missing Attributes**: Uses default brands, models, and sectors if `cleaned_cars` data is invalid.
- **Query Failures**: Retries up to 3 times, logging errors.

---

## Table: `favorite_cars_by_user`

### Objective

The `favorite_cars_by_user` table records cars marked as favorites, indicating strong user interest for recommendation and engagement analysis.

### Schema

```sql
CREATE TABLE cars_keyspace.favorite_cars_by_user (
    user_id uuid,
    added_date date,
    added_timestamp timestamp,
    car_id uuid,
    PRIMARY KEY ((user_id, added_date), added_timestamp, car_id)
);
```

### Data Generation

Favorites are generated for 50% of users, with 1–3 favorite cars per user, selected based on a scoring system that evaluates alignment with preferences, views, and searches.

- **user_id**: Random 50% sample from `users`.
- **added_date**: Random date within the last 30 days.
- **added_timestamp**: Random UTC time on `added_date`.
- **car_id**: 1–3 `car_id`s from `cleaned_cars`, scored by:
    - **Preferences**: +50 for `preferred_brands`, +20 for `preferred_fuel_types`, +20 for `preferred_transmissions`, +30 for budget range, +15 for `preferred_door_count`, +15 for mileage range, +20 for `preferred_years`.
    - **Views**: Up to +50 based on `view_duration_seconds / 10`.
    - **Searches**: +30 for brand match, +10 for budget, door count, mileage, or transmission matches.

### Implementation

The script collects data from `user_preferences`, `car_views_by_user`, `user_searches`, and `cleaned_cars`. It computes scores for each car, sorts by score, and selects the top 1–3. Invalid car data (e.g., missing brand) is filtered out.

```python
rows = session.execute(SimpleStatement("SELECT user_id FROM users"))
user_ids = random.sample([row.user_id for row in rows], k=max(1, len(all_user_ids) // 2))

rows = session.execute(SimpleStatement("SELECT user_id, preferred_brands, ... FROM user_preferences"))
user_preferences = {row.user_id: {...} for row in rows}
rows = session.execute(SimpleStatement("SELECT user_id, car_id, view_duration_seconds FROM car_views_by_user"))
user_views = {row.user_id: [(row.car_id, row.view_duration_seconds)] for row in rows}
rows = session.execute(SimpleStatement("SELECT user_id, filters FROM user_searches"))
user_searches = {row.user_id: [row.filters] for row in rows}
rows = session.execute(SimpleStatement("SELECT id, brand, ... FROM cleaned_cars"))
cars = [{...} for row in rows if row.id and row.brand and row.brand != 'NaN']

for user_id in user_ids:
    prefs = user_preferences.get(user_id, {...})
    viewed_cars = user_views.get(str(user_id), [])
    search_filters = user_searches.get(user_id, [])
    scored_cars = []
    for car in cars:
        score = 0
        if car['brand'] in prefs['preferred_brands']:
            score += 50
        if prefs['budget_min'] <= car['price'] <= prefs['budget_max']:
            score += 30
        for view_car_id, duration in viewed_cars:
            if str(car['id']) == view_car_id:
                score += min(duration // 10, 50)
        for filters in search_filters:
            if 'brand' in filters and filters['brand'] == car['brand']:
                score += 30
        if score > 0:
            scored_cars.append((car['id'], score))
    scored_cars.sort(key=lambda x: x[1], reverse=True)
    favorite_car_ids = [car_id for car_id, _ in scored_cars[:random.randint(1, min(3, len(scored_cars)))]]
    for car_id in favorite_car_ids:
        days_ago = random.randint(0, 30)
        added_date = (datetime.now(UTC) - timedelta(days=days_ago)).date()
        added_timestamp = datetime.combine(added_date, datetime.min.time()).replace(
            hour=random.randint(0, 23), minute=random.randint(0, 59), second=random.randint(0, 59), tzinfo=UTC
        )
        query = """
            INSERT INTO favorite_cars_by_user (user_id, added_date, added_timestamp, car_id)
            VALUES (%s, %s, %s, %s)
        """
        session.execute(query, (user_id, added_date, added_timestamp, car_id))
```

### Rationale

- **Relevance**: The scoring system prioritizes cars matching user preferences and interactions.
- **Realism**: Limiting to 1–3 favorites per user reflects typical behavior.
- **Performance**: Filtering out low-scoring cars and partitioning by `user_id` and `added_date` optimizes storage and retrieval.
- **Temporal Analysis**: Clustering by `added_timestamp` supports queries for recent favorites.

### Example

```python
favorite = {
    'user_id': '550e8400-e29b-41d4-a716-446655440000',
    'added_date': '2025-04-05',
    'added_timestamp': '2025-04-05T16:20:10Z',
    'car_id': 'uuid_car_bmw'
}
```

### Error Handling

- **No Cars**: Raises a `ValueError` if `cleaned_cars` is empty.
- **No Favorites**: Logs a warning if no suitable cars are found for a user.
- **Query Failures**: Retries up to 3 times, logging errors.

---

## Table: `user_similarities`

### Objective

The `user_similarities` table identifies similar users to enable recommendations, particularly for users with sparse data, using cosine similarity to compare feature vectors.

### Schema

```sql
CREATE TABLE cars_keyspace.user_similarities (
    target_user_id uuid,
    reference_user_id uuid,
    similarity_score float,
    last_updated timestamp,
    PRIMARY KEY (target_user_id, reference_user_id)
);
```

### Data Generation

Similarities are computed between users with sparse data (`target_user_id`, data richness score < 5) and those with rich data (`reference_user_id`, score ≥ 5). Only pairs with a cosine similarity score ≥ 0.1 are stored.

- **target_user_id**: Users with a data richness score < 5, based on the count of interactions (searches, views, favorites) and non-empty preference fields.
- **reference_user_id**: Users with a score ≥ 5.
- **similarity_score**: Cosine similarity between feature vectors:  
    [  
    \text{similarity}(A, B) = \frac{A \cdot B}{|A| |B|}, \quad A \cdot B = \sum_i A_i B_i, \quad |A| = \sqrt{\sum_i A_i^2}  
    ]
- **last_updated**: Current UTC timestamp.

**Feature Vectors**:

- **Preferences**: Binary indicators for brands, fuel types, transmissions, door counts, and years (e.g., `brand_Toyota=1.0` if preferred). Budget and mileage are normalized:  
    [  
    \text{budget} = \frac{\text{budget_max} - \text{budget_min}}{1000000}, \quad \text{mileage} = \frac{\text{mileage_max} - \text{mileage_min}}{500000}  
    ]
- **Searches**: Brand frequencies weighted by `result_count / 50`.
- **Views/Favorites**: Brand weights; views weighted by `view_duration_seconds / 300`, favorites by a fixed weight of 2.0.

### Implementation

The script assesses data richness, builds feature vectors, computes cosine similarity, and stores significant pairs. Data is fetched from `users`, `user_preferences`, `user_searches`, `car_views_by_user`, `favorite_cars_by_user`, and `cleaned_cars`.

```python
def data_richness(user_id):
    prefs = user_preferences.get(user_id, {})
    score = sum(1 for field in ['preferred_brands', 'preferred_fuel_types', 'preferred_transmissions', 'preferred_door_count', 'preferred_years'] if prefs.get(field))
    if prefs.get('budget_min') or prefs.get('budget_max'):
        score += 1
    if prefs.get('mileage_min') or prefs.get('mileage_max'):
        score += 1
    score += len(user_searches.get(user_id, [])) + len(user_views.get(str(user_id), [])) + len(user_favorites.get(user_id, []))
    return score

def build_user_vector(user_id):
    vector = {}
    prefs = user_preferences.get(user_id, {})
    for brand in brands:
        vector[f'brand_{brand}'] = 1.0 if brand in prefs.get('preferred_brands', set()) else 0.0
    for fuel in ['hybride', 'essence', 'diesel']:
        vector[f'fuel_{fuel}'] = 1.0 if fuel in prefs.get('preferred_fuel_types', set()) else 0.0
    vector['budget'] = (prefs.get('budget_max', 1000000) - prefs.get('budget_min', 0)) / 1000000.0
    vector['mileage'] = (prefs.get('mileage_max', 500000) - prefs.get('mileage_min', 0)) / 500000.0
    for brand in brands:
        vector[f'search_brand_{brand}'] = sum(s['result_count'] / 50.0 for s in user_searches.get(user_id, []) if brand.lower() in s['search_query'].lower())
        vector[f'view_fav_brand_{brand}'] = sum(duration / 300.0 for car_id, duration in user_views.get(str(user_id), []) if car_brands.get(car_id) == brand)
        vector[f'view_fav_brand_{brand}'] += sum(2.0 for car_id in user_favorites.get(user_id, []) if car_brands.get(car_id) == brand)
    return vector

def cosine_similarity(vector1, vector2):
    dot_product = sum(vector1[k] * vector2[k] for k in set(vector1) & set(vector2))
    norm1 = math.sqrt(sum(v**2 for v in vector1.values()))
    norm2 = math.sqrt(sum(v**2 for v in vector2.values()))
    return dot_product / (norm1 * norm2) if norm1 * norm2 != 0 else 0.0

user_data_scores = {user_id: data_richness(user_id) for user_id in user_ids}
low_data_users = [uid for uid, score in user_data_scores.items() if score < 5]
high_data_users = [uid for uid, score in user_data_scores.items() if score >= 5]
user_vectors = {user_id: build_user_vector(user_id) for user_id in user_ids}

for target_user_id in low_data_users:
    for reference_user_id in high_data_users:
        if target_user_id != reference_user_id:
            score = cosine_similarity(user_vectors[target_user_id], user_vectors[reference_user_id])
            if score >= 0.1:
                query = """
                    INSERT INTO user_similarities (target_user_id, reference_user_id, similarity_score, last_updated)
                    VALUES (%s, %s, %s, %s)
                """
                session.execute(query, (target_user_id, reference_user_id, score, datetime.now(UTC)))
```

### Rationale

- **Sparse Data Handling**: Cosine similarity is robust for sparse vectors, ideal for users with few interactions.
- **Target/Reference Split**: Pairing low-data users with high-data users optimizes recommendation quality.
- **Thresholding**: Storing only scores ≥ 0.1 reduces storage and focuses on meaningful similarities.
- **Feature Richness**: Combining preferences, searches, and views/favorites creates comprehensive user profiles.

### Example

```python
similarity = {
    'target_user_id': 'uuid_low_data_user',
    'reference_user_id': 'uuid_high_data_user',
    'similarity_score': 0.75,
    'last_updated': '2025-04-25T12:34:56Z'
}
```

### Error Handling

- **No Users**: Raises a `ValueError` if `users` is empty.
- **No Cars**: Raises a `ValueError` if `cleaned_cars` lacks valid brands.
- **Similarity Failures**: Logs zero-norm cases and skips insertion.

---

## Technical Considerations

### Data Consistency

- **Referential Integrity**: Ensures `user_id`s are consistent across tables by initializing `user_preferences` with `users` and validating `car_id`s against `cleaned_cars`.
- **Source Alignment**: Brands, sectors, and car attributes are sourced from `cleaned_cars` to maintain coherence.
- **Fallback Mechanisms**: Default lists for brands, sectors, and models handle missing or invalid data.

### Performance Optimization

- **Query Efficiency**: Uses `SimpleStatement` for lightweight queries and partitions data (e.g., `user_id, view_date`) to reduce scan times.
- **Scalability**: Random sampling (e.g., 50% of users for searches/favorites) and similarity thresholds (≥ 0.1) manage large datasets.
- **Complexity**:
    - **Similarity Computation**: (O(n \cdot m \cdot d)), where (n) is the number of `target_user_id`s, (m) is `reference_user_id`s, and (d) is the vector dimension (proportional to brands, fuel types, etc.).
    - **Views/Searches/Favorites**: (O(k \cdot u)), where (k) is the number of actions per user (1–5 for views, 1 for searches, 1–3 for favorites) and (u) is the number of users processed.
- **Batch Processing**: For large datasets, consider batching similarity calculations or using distributed computing (e.g., Spark) to parallelize vector comparisons.

### Error Handling

- **Comprehensive Logging**: Captives successes, warnings (e.g., missing brands), and errors (e.g., query failures) using Python’s `logging` module.
- **Retry Logic**: Retries failed queries up to 3 times with exponential backoff to handle transient issues.
- **Data Validation**: Filters out invalid values (e.g., `"NaN"`, null) during data collection to prevent downstream errors.

### Data Volume

- **Users**: 100–10,000 users, adjustable based on use case.
- **Preferences**: 1 row per user.
- **Views**: 1–5 per user, yielding 100–50,000 rows.
- **Searches**: 1 per 50% of users, yielding 50–5,000 rows.
- **Favorites**: 1–3 per 50% of users, yielding 50–15,000 rows.
- **Similarities**: (O(n \cdot m)) pairs, typically 1,000–100,000 rows after thresholding.

### Scalability Strategies

- **Partitioning**: Consider partitioning `user_similarities` by region or user cohort for very large datasets.
- **Caching**: Cache frequently accessed `cleaned_cars` data in memory to reduce query overhead.
- **Incremental Updates**: For ongoing data generation, update only new or modified users to avoid recomputing similarities for the entire dataset.

---

## Applications

### Recommendation Systems

- **Collaborative Filtering**: Use `user_similarities` to recommend cars to `target_user_id` based on `reference_user_id`’s preferences, views, searches, and favorites.
- **Content-Based Filtering**: Leverage `user_preferences` and `car_views_by_user` to suggest cars matching explicit and implicit user interests.
- **Hybrid Approach**: Combine similarity-based and preference-based recommendations for improved accuracy.

### User Behavior Analysis

- **Trend Analysis**: Analyze `user_searches` and `car_views_by_user` to identify popular brands, price ranges, or regions.
- **Engagement Metrics**: Use `view_duration_seconds` to measure interest intensity and optimize platform features (e.g., search result ranking).
- **Segmentation**: Cluster users by preferences or interaction patterns to tailor marketing strategies.

### System Testing

- **Query Performance**: Test Cassandra query latency and throughput with realistic data volumes.
- **Algorithm Validation**: Evaluate recommendation algorithms using synthetic interactions and similarities.
- **Load Testing**: Simulate high user activity to stress-test the database and application layers.

### Data Privacy

- **Synthetic Data**: Eliminates the need for real user data, ensuring compliance with privacy regulations (e.g., GDPR) while enabling robust testing.

---

## Challenges and Solutions

### Sparse Data

- **Challenge**: New users with few interactions produce sparse feature vectors, complicating similarity calculations.
- **Solution**: Cosine similarity effectively handles sparse vectors, and the `target_user_id`/`reference_user_id` approach leverages data-rich users to infer preferences.

### Data Quality

- **Challenge**: Invalid or missing data in `cleaned_cars` (e.g., `"NaN"` brands) can disrupt generation.
- **Solution**: Filters invalid values and uses default lists (e.g., brands, sectors) to ensure continuity.

### Scalability

- **Challenge**: Similarity computation for large user bases is computationally intensive.
- **Solution**: Applies a 0.1 similarity threshold, random sampling, and suggests future partitioning or distributed computing for scalability.

### Temporal Dynamics

- **Challenge**: Static data doesn’t capture evolving user preferences.
- **Solution**: Generates timestamps within a 30-day window; future enhancements could model preference changes over time.

---

## Extending the System

### Advanced Algorithms

- **Machine Learning**: Implement clustering (e.g., K-means) or neural collaborative filtering to enhance user similarity calculations.
- **Feature Weighting**: Adjust weights in feature vectors (e.g., prioritize brand over mileage) based on empirical analysis of recommendation performance.

### Dynamic Data Generation

- **Real-Time Updates**: Develop streaming scripts to generate data as users interact, simulating live activity.
- **Preference Evolution**: Model changes in preferences based on recent views, searches, or purchases.

### Additional Data Models

- **User Ratings**: Add a `user_ratings` table to capture car ratings, enabling sentiment-based recommendations.
- **Purchase History**: Include a `user_purchases` table to track completed transactions, enriching user profiles.
- **Geographic Granularity**: Incorporate finer location data (e.g., city districts) for localized recommendations.

### Performance Enhancements

- **Distributed Computing**: Use Apache Spark or Dask for parallel similarity calculations on large datasets.
- **Indexing**: Add secondary indexes or materialized views for frequently queried fields (e.g., `brand` in `cleaned_cars`).
- **Compression**: Enable Cassandra’s compression options to reduce storage costs for large datasets.

### Integration with Analytics

- **Dashboards**: Integrate with tools like Apache Superset to visualize user behavior trends (e.g., popular brands by region).
- **A/B Testing**: Use synthetic data to simulate A/B tests for recommendation algorithm variants.

---

## Conclusion

The synthetic data generation process for `cars_keyspace` creates a robust, realistic dataset across six tables, leveraging Python, Cassandra, and the `Faker` library. The use of cosine similarity for `user_similarities` enables effective recommendations, particularly for users with sparse data. The dataset is consistent, scalable, and optimized for performance, making it ideal for recommendation systems, user behavior analysis, system testing, and privacy-compliant development. Future enhancements could include machine learning, real-time updates, and additional data models to further enrich the system.

Developers can extend the scripts by adding new tables, optimizing performance, or integrating with analytics platforms. The provided error handling, logging, and fallback mechanisms ensure robustness, while the modular design supports customization for specific use cases.

For issues or contributions, contact the data engineering tea