# Cassandra Command Guide

This repository contains a comprehensive guide to essential Apache Cassandra database commands for developers and database administrators.

## Table of Contents

- [Introduction](https://claude.ai/chat/6094979d-63d2-4751-ae0e-16beeb65f9c8#introduction)
- [Basic Commands](https://claude.ai/chat/6094979d-63d2-4751-ae0e-16beeb65f9c8#basic-commands)
    - [Keyspace Operations](https://claude.ai/chat/6094979d-63d2-4751-ae0e-16beeb65f9c8#keyspace-operations)
    - [Table Operations](https://claude.ai/chat/6094979d-63d2-4751-ae0e-16beeb65f9c8#table-operations)
    - [Data Manipulation](https://claude.ai/chat/6094979d-63d2-4751-ae0e-16beeb65f9c8#data-manipulation)
    - [Schema Information](https://claude.ai/chat/6094979d-63d2-4751-ae0e-16beeb65f9c8#schema-information)
- [Data Export](https://claude.ai/chat/6094979d-63d2-4751-ae0e-16beeb65f9c8#data-export)
- [Usage Examples](https://claude.ai/chat/6094979d-63d2-4751-ae0e-16beeb65f9c8#usage-examples)
- [Best Practices](https://claude.ai/chat/6094979d-63d2-4751-ae0e-16beeb65f9c8#best-practices)

## Introduction

Apache Cassandra is a highly scalable, distributed NoSQL database designed to handle large amounts of data across multiple servers. This guide provides a collection of commonly used Cassandra CQL (Cassandra Query Language) commands to help you interact with your Cassandra databases effectively.

## Basic Commands

### Keyspace Operations

Create a keyspace:

```sql
CREATE KEYSPACE IF NOT EXISTS keyspace_name 
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 3};
```

Use a keyspace:

```sql
USE keyspace_name;
```

Drop a keyspace:

```sql
DROP KEYSPACE keyspace_name;
```

### Table Operations

Create a table:

```sql
CREATE TABLE IF NOT EXISTS table_name (
    column1 datatype PRIMARY KEY,
    column2 datatype,
    column3 datatype
);
```

Alter a table (add column):

```sql
ALTER TABLE table_name ADD new_column datatype;
```

Drop a table:

```sql
DROP TABLE table_name;
```

Truncate a table (remove all data but keep structure):

```sql
TRUNCATE table_name;
```

### Data Manipulation

Insert data:

```sql
INSERT INTO table_name (column1, column2, column3) 
VALUES (value1, value2, value3);
```

Select data:

```sql
SELECT * FROM table_name;
```

Limit results:

```sql
SELECT * FROM table_name LIMIT 10;
```

Count rows:

```sql
SELECT COUNT(*) FROM table_name;
```

Update data:

```sql
UPDATE table_name SET column1 = value1 WHERE column2 = value2;
```

Delete data:

```sql
DELETE FROM table_name WHERE column1 = value1;
```

### Schema Information

List all keyspaces:

```sql
DESCRIBE KEYSPACES;
```

List all tables in current keyspace:

```sql
DESCRIBE TABLES;
```

Describe a specific table:

```sql
DESCRIBE table_name;
```

## Data Export

Export data to CSV:

```sql
COPY cars_keyspace.table_name TO 'file_path.csv' WITH HEADER = TRUE;
```

Example:

```sql
COPY cars_keyspace.cleaned_cars TO 'cleaned_data.csv' WITH HEADER = TRUE;
```


## Usage Examples

Here's an example workflow to create a keyspace, create a table, insert data, and export to CSV:

```sql
-- Create and use a keyspace
CREATE KEYSPACE demo_keyspace WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};
USE demo_keyspace;

-- Create a table
CREATE TABLE users (
    user_id uuid PRIMARY KEY,
    username text,
    email text,
    created_at timestamp
);

-- Insert some data
INSERT INTO users (user_id, username, email, created_at) 
VALUES (uuid(), 'john_doe', 'john@example.com', toTimestamp(now()));
INSERT INTO users (user_id, username, email, created_at) 
VALUES (uuid(), 'jane_smith', 'jane@example.com', toTimestamp(now()));

-- Export to CSV
COPY demo_keyspace.users TO '/tmp/users_export.csv' WITH HEADER = TRUE;
```

## Best Practices

1. Always specify `IF NOT EXISTS` when creating keyspaces and tables to prevent errors.
2. Use appropriate replication strategies based on your deployment (SimpleStrategy for development, NetworkTopologyStrategy for production).
3. Be cautious with `TRUNCATE` and `DROP` commands as they can result in data loss.
4. For large datasets, consider using batch processing or tools like Apache Spark for exporting data instead of the COPY command.
5. Always backup your data before performing major operations.
6. Use prepared statements when working with applications to improve performance and security.

---

For more information, refer to the official [Apache Cassandra Documentation](https://cassandra.apache.org/doc/latest/).



