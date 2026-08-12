# Frontend and Backend Documentation: Car Recommendation Pipeline

## 1. Introduction

The car recommendation pipeline includes a **frontend** (React application in `~/projects/cars_recommandation_pipeline/nextride`) and a **backend** (Node.js/Express API in `~/projects/cars_recommandation_pipeline/backend`). The frontend provides a user interface for browsing cars, searching, predicting prices, managing profiles, viewing visualizations, and displaying personalized recommendations. The backend serves as the API, handling authentication, car data, searches, predictions, and recommendations, using Apache Cassandra (`cars_keyspace`), a Python recommendation script, and a Flask-based ML service for price predictions. Both components integrate with the big data pipeline (artifact ID `760ec190-f3c4-42b4-9d19-2269cb28f413`) for car listings, synthetic user data, and predictions.

**Key Features**:

- **Frontend**: User authentication, car search, price prediction, visualizations, car listing creation, recommendation display.
- **Backend**: RESTful API for authentication, car management, search, predictions, recommendations, with Cassandra, Python script, and ML service integration.
- **Integration**: Frontend calls backend API at `http://localhost:5000`; backend queries `cars_keyspace`, runs `combined_recommendations.py`, and calls `ml_service.py` at `http://localhost:5001/predict`.

This documentation covers setup, structure, API integration, execution, and troubleshooting.

## 2. Environment Setup

### 2.1 Prerequisites

- **Operating System**: Ubuntu.
- **Node.js**: Version 18.x or later.
- **Conda**: Environment `cenv` (Python 3.10) for backend scripts and ML service.
- **Cassandra**: Version 4.1.3 in `~/cassandra` with `cars_keyspace`.
- **ML Service**: Running at `http://localhost:5001/predict`.
- **Big Data Pipeline**: Populated `cleaned_cars` and synthetic data.

### 2.2 Install Node.js

```bash
sudo apt-get update
sudo apt-get install -y curl
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

### 2.3 Install Conda Environment (Backend and ML Service)

```bash
conda activate cenv
pip install cassandra-driver==3.29.2 scikit-learn==1.5.2 scipy==1.14.1 tensorflow==2.17.0 flask==3.0.3
pip show cassandra-driver tensorflow flask
```

### 2.4 Frontend Setup

1. **Navigate to Frontend Directory**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/nextride
    ```
    
2. **Install Dependencies**:
    
    ```bash
    npm install
    ```
    
    Installs:
    
    - `react`, `react-dom`, `react-router-dom`
    - `axios`, `react-icons`, `@mui/material`
    - `bootstrap`
    - Testing utilities (`@testing-library/react`)
3. **Configure .env**:
    
    ```bash
    echo "REACT_APP_API_URL=http://localhost:5000" > .env
    ```
    
4. **Verify**:
    
    ```bash
    ls node_modules
    cat .env
    ```
    

### 2.5 Backend Setup

1. **Navigate to Backend Directory**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/backend
    ```
    
2. **Install Dependencies**:
    
    ```bash
    npm install
    ```
    
    Installs:
    
    - `express`, `cassandra-driver`, `jsonwebtoken`, `multer`, `cors`
    - `axios` (for ML service)
    - `bcryptjs`, `dotenv`
3. **Configure .env**:
    
    ```bash
    nano .env
    ```
    
    Add:
    
    ```
    PORT=5000
    CASSANDRA_CONTACT_POINT=localhost
    CASSANDRA_LOCAL_DATACENTER=datacenter1
    CASSANDRA_KEYSPACE=cars_keyspace
    ML_SERVICE_URL=http://localhost:5001/predict
    JWT_SECRET=6fe82de7e68594254e7e01f1960668925cb54b4ea60ac612ea9f403615842986
    ```
    
4. **Verify**:
    
    ```bash
    ls node_modules
    cat .env
    ```
    

### 2.6 ML Service Setup

1. **Navigate to Prediction Directory**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/prediction
    ```
    
2. **Ensure Artifacts**:
    
    ```bash
    ls improved_final_model.h5 feature_scaler.pkl target_scaler.pkl categorical_mappings.pkl
    ```
    
3. **Run ML Service**:
    
    ```bash
    conda activate cenv
    python ml_service.py
    ```
    
4. **Verify**:
    
    ```bash
    curl http://localhost:5001/predict
    ```
    

## 3. Frontend Structure

### 3.1 Directory Structure

- **`build/`**: Production build output.
- **`node_modules/`**: npm dependencies.
- **`public/`**: Static assets (`index.html`, favicon).
- **`src/`**:
    - **`components/`**: `Navbar.js`, `Hero.js`, `VehicleSection.js`, `BrandDistribution.js`, `CarBubbleChart.js`.
    - **`pages/`**: `AddCarPage.js`, `CarDetailsPage.js`, `PredictionPage.js`, `SearchPage.js`, `VisualizationPage.js`, `auth/LoginPage.js`, `UserProfilePage.js`.
    - **`context/`**: `AuthContext.js` (authentication).
    - **`assets/images/`**: `bg.jpg`, `bg2.png`, `icon-1.png`.
    - `App.js`: Main app with routing.
    - `App.css`, `index.css`: Styling.
    - `index.js`: Renders `App.js`.
- **`package.json`**: Dependencies.

### 3.2 Dependencies

|Package|Purpose|Used In|
|---|---|---|
|`react`, `react-dom`|Core React libraries|All components|
|`react-router-dom`|Routing|`App.js`, `AddCarPage.js`|
|`axios`|API requests|`CarDetailsPage.js`, `PredictionPage.js`|
|`react-icons`|Icons|`Navbar.js`, `CarDetailsPage.js`|
|`@mui/material`|Notifications (Snackbar, Alert)|`UserProfilePage.js`|
|`bootstrap`|Styling and UI components|All components|

### 3.3 Key Files

- **App.js**: Defines routes (`/`, `/search`, `/profile`, `/predict`).
- **AuthContext.js**: Manages user state and JWT tokens.
- **PredictionPage.js**: Collects car features, sends to `/api/prediction`, displays predicted price.
- **UserProfilePage.js**: Displays recommendations.
- **VehicleSection.js**: Displays featured cars and recommendations.

## 4. Backend Structure

### 4.1 Directory Structure

- **`config/`**: `db.js` (Cassandra client).
- **`controllers/`**: `authController.js`, `carController.js`, `predictionController.js`, `searchController.js`, `userController.js`.
- **`images/`**: Car image storage (`cars/`, `cars/temp`).
- **`middleware/`**: `authMiddleware.js` (JWT verification).
- **`models/`**: `Car.js`, `User.js`, `UserPreference.js`.
- **`routes/`**: `authRoutes.js`, `carRoutes.js`.
- **`scripts/`**: `combined_recommendations.py` (recommendation logic).
- **`prediction/`**: `ml_service.py` (price prediction service), `improved_final_model.h5`, `feature_scaler.pkl`, `target_scaler.pkl`, `categorical_mappings.pkl`.
- **`utils/`**: Helper functions.
- **`server.js`**: Express app setup.
- **`.env`**, **`package.json`**: Configuration and dependencies.

### 4.2 Dependencies

|Package|Purpose|Used In|
|---|---|---|
|`express`|Web framework|`server.js`|
|`cassandra-driver`|Cassandra client|`models/`|
|`jsonwebtoken`|JWT authentication|`authController.js`, `authMiddleware.js`|
|`multer`|File uploads|`carController.js`|
|`cors`|Cross-origin requests|`server.js`|
|`axios`|ML service requests|`predictionController.js`|
|`bcryptjs`|Password hashing|`authController.js`|

### 4.3 Key Files

- **server.js**: Configures Express, mounts routes.
- **db.js**: Connects to Cassandra.
- **predictionController.js**: Calls `http://localhost:5001/predict`, stores results in `car_predictions`.
- **combined_recommendations.py**: Generates recommendations.
- **ml_service.py**: Flask API for price predictions.

## 5. API Integration

The frontend communicates with the backend API at `http://localhost:5000` using `axios`. The backend queries `cars_keyspace`, runs `combined_recommendations.py`, and calls `ml_service.py`.

### 5.1 API Endpoints

|Endpoint|Method|Frontend Page/Component|Purpose|
|---|---|---|---|
|`/api/auth/login`|POST|`LoginPage`|Authenticate user|
|`/api/auth/register`|POST|`SignupPage`|Register user|
|`/api/users`|GET/PUT|`UserProfilePage`|Get/update profile|
|`/api/users/preferences`|GET/PUT|`UserProfilePage`|Get/update preferences|
|`/api/users/favorites`|GET/POST/DELETE|`UserProfilePage`, `CarDetailsPage`|Manage favorites|
|`/api/users/recommendations`|GET|`UserProfilePage`, `VehicleSection`|Get recommendations|
|`/api/search`|POST|`SearchPage`|Search cars|
|`/api/cars/recently-viewed`|GET|`SearchPage`|Recently viewed cars|
|`/api/cars/:id`|GET|`CarDetailsPage`|Get car details|
|`/api/cars/view`|POST|`CarDetailsPage`|Log car view|
|`/api/cars`|POST|`AddCarPage`|Create car listing|
|`/api/prediction`|POST|`PredictionPage`|Predict price (calls ML service)|
|`/api/prediction/history`|GET|`PredictionPage`|Prediction history|
|`/api/cars/brands`|GET|`VisualizationPage`|Brand distribution|
|`/api/cars/bubbles`|GET|`VisualizationPage`|Bubble chart data|
|`/api/cars`, `/api/cars/latest`|GET|`VehicleSection`|Featured cars|

### 5.2 Authentication

- **Frontend (`AuthContext`)**: Stores JWT token, adds `Authorization: Bearer <token>` header.
- **Backend**: `authController.js` handles login/register; `authMiddleware.js` verifies tokens.

### 5.3 Recommendation Integration

- **Backend**: `/api/users/recommendations` triggers `combined_recommendations.py`, retrieves results from `user_recommendations`.
- **Frontend**: `UserProfilePage.js` or `VehicleSection.js` fetches recommendations, displays `car_id`, `similarity_score`, `recommendation_reason`.

### 5.4 Prediction Integration

- **Backend**: `/api/prediction` accepts car features, calls `http://localhost:5001/predict`, stores results in `car_predictions`.
- **Frontend**: `PredictionPage.js` collects features (e.g., `door_count`, `mileage`, `equipment`), sends to `/api/prediction`, displays `predictedPrice`.
- **ML Service**: `ml_service.py` processes input, returns predicted price using `improved_final_model.h5`.

## 6. Running the Application

### 6.1 Prerequisites

- **Cassandra**:
    
    ```bash
    ~/cassandra/bin/cassandra -R
    ~/cassandra/bin/cqlsh -e "SELECT release_version FROM system.local;"
    ```
    
- **Big Data Pipeline**: Run scraping, Spark, and synthetic data scripts.
- **ML Service**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/prediction
    conda activate cenv
    python ml_service.py
    ```
    

### 6.2 Start Backend

```bash
cd ~/projects/cars_recommandation_pipeline/backend
npm install
node server.js
```

- Verify:
    
    ```bash
    curl http://localhost:5000
    ```
    

### 6.3 Start Frontend

```bash
cd ~/projects/cars_recommandation_pipeline/nextride
npm install
npm start
```

- Opens `http://localhost:3000`.

### 6.4 Run Recommendations

1. **Manually**:
    
    ```bash
    cd ~/projects/cars_recommandation_pipeline/backend/scripts
    conda activate cenv
    python combined_recommendations.py <user_id>
    ```
    
2. **Via API**:
    
    ```bash
    curl -H "Authorization: Bearer <token>" http://localhost:5000/api/users/recommendations
    ```
    

### 6.5 Run Predictions

1. **Via ML Service**:
    
    ```bash
    curl -X POST http://localhost:5001/predict -H "Content-Type: application/json" -d '{"door_count": 4, "fiscal_power": 6, "mileage": 100000, "year": 2015, "publication_date": "11/05/2025 00:00", "equipment": "j doors aluminium, airbags, climatisation", "first_owner": "non", "brand": "toyota", "condition": "bon", "fuel_type": "diesel", "model": "corolla", "origin": "ww au maroc", "sector": "casablanca", "seller_city": "casablanca", "transmission": "manuelle"}'
    ```
    
2. **Via API**:
    
    ```bash
    curl -H "Authorization: Bearer <token>" -X POST http://localhost:5000/api/prediction -H "Content-Type: application/json" -d '{"door_count": 4, "fiscal_power": 6, "mileage": 100000, "year": 2015, "publication_date": "11/05/2025 00:00", "equipment": "jantes aluminium, airbags, climatisation", "first_owner": "non", "brand": "toyota", "condition": "bon", "fuel_type": "diesel", "model": "corolla", "origin": "ww au maroc", "sector": "casablanca", "seller_city": "casablanca", "transmission": "manuelle"}'
    ```
    

### 6.6 Build Frontend for Production

```bash
cd ~/projects/cars_recommandation_pipeline/nextride
npm run build
npx serve -s build
```

## 7. Troubleshooting

- **Frontend CORS Errors**:
    
    - Check `server.js` for CORS.
    - Verify `REACT_APP_API_URL`.
- **Backend Cassandra Errors**:
    
    - Check connection:
        
        ```bash
        netstat -tuln | grep 9042
        ```
        
- **Recommendation Script Errors**:
    
    - Verify dependencies:
        
        ```bash
        pip install scikit-learn==1.5.2 scipy==1.14.1
        ```
        
    - Check data:
        
        ```bash
        cqlsh -e "SELECT COUNT(*) FROM cars_keyspace.user_preferences;"
        ```
        
- **Prediction Errors**:
    
    - Verify ML service:
        
        ```bash
        curl http://localhost:5001/predict
        ```
        
    - Check logs:
        
        ```bash
        tail -f ml_service.log
        ```
        
    - Ensure dependencies:
        
        ```bash
        pip install tensorflow==2.17.0 flask==3.0.3
        ```
        
- **Auth Issues**:
    
    - Test login:
        
        ```bash
        curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}'
        ```
        

## 8. Next Steps

- **Testing**: Add Jest/Mocha tests for frontend and backend.
- **Deployment**: Use Docker or Vercel for production.
- **Enhancements**: Improve `PredictionPage.js` UI for feature input.
- **Monitoring**: Add logging for ML service performance.