"""NextRide price prediction service (Flask API)."""

import logging
import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from .features import estimate_price

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ml-service")

app = Flask(__name__)
CORS(app)


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object"}), 400

    try:
        predicted = estimate_price(data)
        logger.info("Predicted price for brand=%s year=%s -> %s",
                    data.get("brand"), data.get("year"), predicted)
        return jsonify({"prediction": {"predictedPrice": float(predicted)}})
    except Exception as exc:  # noqa: BLE001
        logger.exception("Prediction failed")
        return jsonify({"error": str(exc)}), 400


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=False)
