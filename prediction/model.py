import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    # Set environment variables
    os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
    os.environ["JAVA_OPTS"] = "--illegal-access=deny"

    # Import dependencies inside main to avoid loading during DAG parsing
    from pyspark.sql import SparkSession
    import pandas as pd
    import numpy as np
    from tensorflow.keras.models import Sequential, load_model
    from tensorflow.keras.layers import Dense, Dropout, BatchNormalization, LeakyReLU
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.regularizers import l1_l2
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
    from sklearn.preprocessing import RobustScaler, LabelEncoder
    from sklearn.model_selection import KFold
    import tensorflow as tf
    import pickle

    # Set random seeds for reproducibility
    np.random.seed(42)
    tf.random.set_seed(42)

    # Verify GPU availability
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        logger.info(f"GPUs detected: {gpus}")
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
    else:
        logger.info("No GPU detected, using CPU")

    # Initialize Spark
    spark = SparkSession.builder.appName("ImprovedNeuralNetwork").config("spark.driver.memory", "8g").getOrCreate()
    spark.sparkContext.setLogLevel("ERROR")

    try:
        # Load data
        data_path = "/home/hamzabji/projects/cars_recommandation_pipeline/prediction/preprocessed_data.csv"
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Data file not found at: {data_path}")
        df = spark.read.csv(data_path, header=True, inferSchema=True)
        pandas_df = df.toPandas()

        logger.info(f"Total samples: {pandas_df.shape[0]}")
        logger.info(f"Number of features: {pandas_df.shape[1] - 1}")

        # Define feature columns
        FEATURE_COLUMNS = [
            'door_count', 'fiscal_power', 'mileage', 'year',
            'publication_year', 'publication_month', 'publication_day', 'publication_weekday',
            'is_weekend', 'days_since_posted',
            'alloy_wheels', 'airbags', 'air_conditioning', 'navigation_system', 'sunroof',
            'leather_seats', 'parking_sensors', 'rear_camera', 'electric_windows', 'abs',
            'esp', 'cruise_control', 'speed_limiter', 'cd_mp3_bluetooth', 'on_board_computer',
            'central_locking', 'brand', 'condition', 'fuel_type', 'model',
            'origin', 'first_owner', 'sector', 'seller_city', 'transmission'
        ]

        # Ensure all feature columns are present
        missing_cols = [col for col in FEATURE_COLUMNS if col not in pandas_df.columns]
        if missing_cols:
            raise ValueError(f"Missing columns in preprocessed_data.csv: {missing_cols}")

        X = pandas_df[FEATURE_COLUMNS]
        y = pandas_df['price']

        # Initialize label encoders for categorical columns
        label_encoders = {}
        categorical_cols = ['brand', 'condition', 'fuel_type', 'model', 'origin', 'first_owner', 'sector', 'seller_city', 'transmission']
        for col in categorical_cols:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str).str.lower().fillna('unknown'))
            label_encoders[col] = le

        # Save label encoders
        with open('label_encoders.pkl', 'wb') as f:
            pickle.dump(label_encoders, f)
        logger.info("Saved label_encoders.pkl")

        # Scale features and target
        feature_scaler = RobustScaler()
        X_scaled = feature_scaler.fit_transform(X)
        with open('feature_scaler.pkl', 'wb') as f:
            pickle.dump(feature_scaler, f)
        logger.info("Saved feature_scaler.pkl")

        target_scaler = RobustScaler()
        y_scaled = target_scaler.fit_transform(y.values.reshape(-1, 1)).flatten()
        with open('target_scaler.pkl', 'wb') as f:
            pickle.dump(target_scaler, f)
        logger.info("Saved target_scaler.pkl")

        # K-fold cross-validation
        k_folds = 5
        kf = KFold(n_splits=k_folds, shuffle=True, random_state=42)
        r2_scores = []
        rmse_scores = []
        mae_scores = []
        fold_models = []

        def create_improved_model(input_dim):
            model = Sequential([
                Dense(64, kernel_initializer='he_normal', kernel_regularizer=l1_l2(l1=0.0001, l2=0.0005), input_shape=(input_dim,)),
                LeakyReLU(alpha=0.1),
                BatchNormalization(),
                Dropout(0.3),
                Dense(32, kernel_initializer='he_normal', kernel_regularizer=l1_l2(l1=0.0001, l2=0.0005)),
                LeakyReLU(alpha=0.1),
                BatchNormalization(),
                Dropout(0.3),
                Dense(16, kernel_initializer='he_normal', kernel_regularizer=l1_l2(l1=0.0001, l2=0.0005)),
                LeakyReLU(alpha=0.1),
                BatchNormalization(),
                Dropout(0.2),
                Dense(8, kernel_initializer='he_normal', kernel_regularizer=l1_l2(l1=0.0001, l2=0.0005)),
                LeakyReLU(alpha=0.1),
                BatchNormalization(),
                Dropout(0.1),
                Dense(1)
            ])
            optimizer = Adam(learning_rate=0.0005)
            model.compile(optimizer=optimizer, loss='huber')
            return model

        logger.info(f"Training {k_folds} models with cross-validation...")
        for fold, (train_idx, val_idx) in enumerate(kf.split(X_scaled)):
            logger.info(f"\nFold {fold+1}/{k_folds}")
            X_train, X_val = X_scaled[train_idx], X_scaled[val_idx]
            y_train, y_val = y_scaled[train_idx], y_scaled[val_idx]
            model = create_improved_model(X_scaled.shape[1])
            early_stopping = EarlyStopping(monitor='val_loss', patience=30, restore_best_weights=True, verbose=1)
            reduce_lr = ReduceLROnPlateau(monitor='val_loss', factor=0.2, patience=10, min_lr=0.000005, verbose=1)
            model_checkpoint = ModelCheckpoint(f'best_model_fold_{fold+1}.h5', monitor='val_loss', save_best_only=True, verbose=1)
            history = model.fit(X_train, y_train, epochs=700, batch_size=32, validation_data=(X_val, y_val), callbacks=[early_stopping, reduce_lr, model_checkpoint], verbose=1)
            model = load_model(f'best_model_fold_{fold+1}.h5')
            fold_models.append(model)
            y_pred_scaled = model.predict(X_val)
            y_pred = target_scaler.inverse_transform(y_pred_scaled)
            y_true = target_scaler.inverse_transform(y_val.reshape(-1, 1))
            mse = mean_squared_error(y_true, y_pred)
            rmse = np.sqrt(mse)
            mae = mean_absolute_error(y_true, y_pred)
            r2 = r2_score(y_true, y_pred)
            r2_scores.append(r2)
            rmse_scores.append(rmse)
            mae_scores.append(mae)
            logger.info(f"Fold {fold+1} - RMSE: {rmse:.2f}, MAE: {mae:.2f}, R²: {r2:.4f}")

        logger.info("\nCross-validation results:")
        logger.info(f"Average R²: {np.mean(r2_scores):.4f} ± {np.std(r2_scores):.4f}")
        logger.info(f"Average RMSE: {np.mean(rmse_scores):.2f} ± {np.std(rmse_scores):.2f}")
        logger.info(f"Average MAE: {np.mean(mae_scores):.2f} ± {np.std(mae_scores):.2f}")

        def ensemble_predict(models, X_data, weights=None):
            predictions = np.array([model.predict(X_data).flatten() for model in models])
            if weights is None:
                weights = np.ones(len(models)) / len(models)
            weighted_predictions = np.sum(predictions.T * weights, axis=1)
            return weighted_predictions.reshape(-1, 1)

        inverse_rmse = [1/score for score in rmse_scores]
        weights = np.array(inverse_rmse) / sum(inverse_rmse)
        logger.info(f"Ensemble weights based on validation performance: {weights}")

        all_preds = []
        all_actuals = []
        for i, (_, val_idx) in enumerate(kf.split(X_scaled)):
            X_val = X_scaled[val_idx]
            y_val = y_scaled[val_idx]
            y_pred_scaled = ensemble_predict([fold_models[j] for j in range(k_folds) if j != i], X_val, weights=[weights[j] for j in range(k_folds) if j != i])
            y_pred = target_scaler.inverse_transform(y_pred_scaled)
            y_true = target_scaler.inverse_transform(y_val.reshape(-1, 1))
            all_preds.append(y_pred)
            all_actuals.append(y_true)

        all_preds = np.concatenate(all_preds)
        all_actuals = np.concatenate(all_actuals)
        ensemble_mse = mean_squared_error(all_actuals, all_preds)
        ensemble_rmse = np.sqrt(ensemble_mse)
        ensemble_mae = mean_absolute_error(all_actuals, all_preds)
        ensemble_r2 = r2_score(all_actuals, all_preds)

        logger.info("\nWeighted Ensemble model results:")
        logger.info(f"Ensemble RMSE: {ensemble_rmse:.2f}")
        logger.info(f"Ensemble MAE: {ensemble_mae:.2f}")
        logger.info(f"Ensemble R²: {ensemble_r2:.4f}")

        def create_final_model(input_dim):
            model = Sequential([
                Dense(96, kernel_initializer='he_normal', kernel_regularizer=l1_l2(l1=0.0001, l2=0.0003), input_shape=(input_dim,)),
                LeakyReLU(alpha=0.1),
                BatchNormalization(),
                Dropout(0.3),
                Dense(48, kernel_initializer='he_normal', kernel_regularizer=l1_l2(l1=0.0001, l2=0.0003)),
                LeakyReLU(alpha=0.1),
                BatchNormalization(),
                Dropout(0.3),
                Dense(24, kernel_initializer='he_normal', kernel_regularizer=l1_l2(l1=0.0001, l2=0.0003)),
                LeakyReLU(alpha=0.1),
                BatchNormalization(),
                Dropout(0.2),
                Dense(12, kernel_initializer='he_normal', kernel_regularizer=l1_l2(l1=0.0001, l2=0.0003)),
                LeakyReLU(alpha=0.1),
                BatchNormalization(),
                Dropout(0.1),
                Dense(1)
            ])
            optimizer = Adam(learning_rate=0.0005)
            model.compile(optimizer=optimizer, loss='huber')
            return model

        final_model = create_final_model(X_scaled.shape[1])
        early_stopping = EarlyStopping(monitor='val_loss', patience=40, restore_best_weights=True)
        reduce_lr = ReduceLROnPlateau(monitor='val_loss', factor=0.2, patience=15, min_lr=0.000001)
        model_checkpoint = ModelCheckpoint('best_final_model.h5', monitor='val_loss', save_best_only=True)
        val_split = 0.2
        n_val = int(len(X_scaled) * val_split)
        indices = np.random.permutation(len(X_scaled))
        X_train_final = X_scaled[indices[n_val:]]
        y_train_final = y_scaled[indices[n_val:]]
        X_val_final = X_scaled[indices[:n_val]]
        y_val_final = y_scaled[indices[:n_val]]
        final_history = final_model.fit(X_train_final, y_train_final, epochs=700, batch_size=32, validation_data=(X_val_final, y_val_final), callbacks=[early_stopping, reduce_lr, model_checkpoint], verbose=1)
        final_model = load_model('best_final_model.h5')
        y_pred_scaled = final_model.predict(X_val_final)
        y_pred = target_scaler.inverse_transform(y_pred_scaled)
        y_true = target_scaler.inverse_transform(y_val_final.reshape(-1, 1))
        final_mse = mean_squared_error(y_true, y_pred)
        final_rmse = np.sqrt(final_mse)
        final_mae = mean_absolute_error(y_true, y_pred)
        final_r2 = r2_score(y_true, y_pred)

        logger.info("\nFinal model validation results:")
        logger.info(f"Final RMSE: {final_rmse:.2f}")
        logger.info(f"Final MAE: {final_mae:.2f}")
        logger.info(f"Final R²: {final_r2:.4f}")

        final_model.save('improved_final_model.h5')
        logger.info("Final model saved as 'improved_final_model.h5'")

    except Exception as e:
        logger.error(f"Error during model training: {str(e)}")
        raise
    finally:
        spark.stop()
        logger.info("Spark session stopped")

if __name__ == "__main__":
    main()