FROM apache/spark:3.5.0-python3

USER root

RUN mkdir -p /opt/spark/jobs /opt/spark/checkpoints

COPY pipeline/processors/spark_cleaning.py /opt/spark/jobs/spark_cleaning.py

ENV PYSPARK_PYTHON=/usr/bin/python3
ENV SPARK_NO_DAEMONIZE=true

ENTRYPOINT []
CMD ["/opt/spark/bin/spark-submit", \
     "--master", "local[2]", \
     "--packages", \
     "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0,com.datastax.spark:spark-cassandra-connector_2.12:3.5.1", \
     "--conf", "spark.sql.shuffle.partitions=2", \
     "--conf", "spark.driver.host=spark", \
     "/opt/spark/jobs/spark_cleaning.py"]
