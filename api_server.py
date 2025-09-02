#!/usr/bin/env python3
"""
Flask API Server for Behavioral Authentication ML Service
Provides REST endpoints for model training, prediction, and management
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging
from datetime import datetime
import os
from ml_backend import BehavioralBiometricsML

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize ML service
ml_service = BehavioralBiometricsML()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Behavioral Authentication ML API"
    })

@app.route('/api/model/info', methods=['GET'])
def get_model_info():
    """Get information about the current model"""
    try:
        info = ml_service.get_model_info()
        return jsonify({
            "success": True,
            "data": info,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting model info: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/model/train', methods=['POST'])
def train_model():
    """Train the behavioral authentication model"""
    try:
        data = request.get_json()
        
        if not data or 'training_data' not in data or 'labels' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required fields: training_data and labels",
                "timestamp": datetime.now().isoformat()
            }), 400
        
        training_data = data['training_data']
        labels = data['labels']
        
        # Validate data
        if len(training_data) != len(labels):
            return jsonify({
                "success": False,
                "error": "Training data and labels must have the same length",
                "timestamp": datetime.now().isoformat()
            }), 400
        
        if len(training_data) < 6:
            return jsonify({
                "success": False,
                "error": "Need at least 6 training samples (3 legitimate + 3 fraudulent)",
                "timestamp": datetime.now().isoformat()
            }), 400
        
        # Train model
        logger.info(f"Starting model training with {len(training_data)} samples")
        results = ml_service.train_model(training_data, labels)
        
        if "error" in results:
            return jsonify({
                "success": False,
                "error": results["error"],
                "timestamp": datetime.now().isoformat()
            }), 500
        
        return jsonify({
            "success": True,
            "data": results,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error training model: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/model/predict', methods=['POST'])
def predict():
    """Make prediction on new behavioral data"""
    try:
        data = request.get_json()
        
        if not data or 'behavioral_data' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required field: behavioral_data",
                "timestamp": datetime.now().isoformat()
            }), 400
        
        behavioral_data = data['behavioral_data']
        
        # Make prediction
        results = ml_service.predict(behavioral_data)
        
        if "error" in results:
            return jsonify({
                "success": False,
                "error": results["error"],
                "timestamp": datetime.now().isoformat()
            }), 500
        
        return jsonify({
            "success": True,
            "data": results,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error making prediction: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/model/reset', methods=['POST'])
def reset_model():
    """Reset the trained model"""
    try:
        ml_service.reset_model()
        
        return jsonify({
            "success": True,
            "message": "Model reset successfully",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error resetting model: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/features/extract', methods=['POST'])
def extract_features():
    """Extract features from behavioral data"""
    try:
        data = request.get_json()
        
        if not data or 'behavioral_data' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required field: behavioral_data",
                "timestamp": datetime.now().isoformat()
            }), 400
        
        behavioral_data = data['behavioral_data']
        
        # Extract features
        features = ml_service.extract_features(behavioral_data)
        
        return jsonify({
            "success": True,
            "data": {
                "features": features.tolist(),
                "feature_count": len(features),
                "feature_names": ml_service.feature_names or [f"feature_{i}" for i in range(len(features))]
            },
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error extracting features: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/analysis/risk-assessment', methods=['POST'])
def risk_assessment():
    """Perform comprehensive risk assessment"""
    try:
        data = request.get_json()
        
        if not data or 'behavioral_data' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required field: behavioral_data",
                "timestamp": datetime.now().isoformat()
            }), 400
        
        behavioral_data = data['behavioral_data']
        
        # Extract features
        features = ml_service.extract_features(behavioral_data)
        
        # Calculate various risk indicators
        risk_indicators = {
            "typing_speed_anomaly": False,
            "sensor_variance_high": False,
            "touch_pattern_irregular": False,
            "session_consistency_low": False
        }
        
        # Analyze typing speed (if available)
        if 'keyEvents' in behavioral_data and len(behavioral_data['keyEvents']) > 1:
            key_events = behavioral_data['keyEvents']
            if len(key_events) >= 2:
                intervals = []
                for i in range(1, len(key_events)):
                    if key_events[i]['event'] == 'pressed' and key_events[i-1]['event'] == 'pressed':
                        interval = key_events[i]['epoch'] - key_events[i-1]['epoch']
                        intervals.append(interval)
                
                if intervals:
                    avg_interval = sum(intervals) / len(intervals)
                    if avg_interval > 5000:  # More than 5 seconds between key presses
                        risk_indicators["typing_speed_anomaly"] = True
        
        # Analyze sensor variance
        if 'sensorData' in behavioral_data and len(behavioral_data['sensorData']) > 1:
            sensor_data = behavioral_data['sensorData']
            acc_x = [s.get('accelerometer', {}).get('x', 0) for s in sensor_data]
            acc_y = [s.get('accelerometer', {}).get('y', 0) for s in sensor_data]
            acc_z = [s.get('accelerometer', {}).get('z', 0) for s in sensor_data]
            
            if acc_x and acc_y and acc_z:
                variance_x = sum((x - sum(acc_x)/len(acc_x))**2 for x in acc_x) / len(acc_x)
                variance_y = sum((y - sum(acc_y)/len(acc_y))**2 for y in acc_y) / len(acc_y)
                variance_z = sum((z - sum(acc_z)/len(acc_z))**2 for z in acc_z) / len(acc_z)
                
                if max(variance_x, variance_y, variance_z) > 15:
                    risk_indicators["sensor_variance_high"] = True
        
        # Analyze touch patterns
        if 'touchEvents' in behavioral_data and len(behavioral_data['touchEvents']) > 1:
            touch_events = behavioral_data['touchEvents']
            movements = []
            for i in range(1, len(touch_events)):
                if touch_events[i]['event'] == 'release' and touch_events[i-1]['event'] == 'touch':
                    dx = touch_events[i]['coordinates']['x'] - touch_events[i-1]['coordinates']['x']
                    dy = touch_events[i]['coordinates']['y'] - touch_events[i-1]['coordinates']['y']
                    distance = (dx**2 + dy**2)**0.5
                    movements.append(distance)
            
            if movements:
                avg_movement = sum(movements) / len(movements)
                if avg_movement > 100:  # Unusually large touch movements
                    risk_indicators["touch_pattern_irregular"] = True
        
        # Overall risk score
        risk_score = sum(risk_indicators.values()) / len(risk_indicators)
        
        return jsonify({
            "success": True,
            "data": {
                "risk_score": risk_score,
                "risk_level": "High" if risk_score > 0.5 else "Medium" if risk_score > 0.2 else "Low",
                "risk_indicators": risk_indicators,
                "feature_vector": features.tolist(),
                "timestamp": datetime.now().isoformat()
            },
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error performing risk assessment: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/data/validate', methods=['POST'])
def validate_data():
    """Validate behavioral data format and completeness"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided",
                "timestamp": datetime.now().isoformat()
            }), 400
        
        validation_results = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "data_quality_score": 0.0
        }
        
        # Check required fields
        required_fields = ['keyEvents', 'touchEvents', 'sensorData']
        for field in required_fields:
            if field not in data:
                validation_results["errors"].append(f"Missing required field: {field}")
                validation_results["is_valid"] = False
        
        # Validate key events
        if 'keyEvents' in data:
            key_events = data['keyEvents']
            if not isinstance(key_events, list):
                validation_results["errors"].append("keyEvents must be a list")
                validation_results["is_valid"] = False
            elif len(key_events) < 2:
                validation_results["warnings"].append("Very few key events detected")
        
        # Validate touch events
        if 'touchEvents' in data:
            touch_events = data['touchEvents']
            if not isinstance(touch_events, list):
                validation_results["errors"].append("touchEvents must be a list")
                validation_results["is_valid"] = False
        
        # Validate sensor data
        if 'sensorData' in data:
            sensor_data = data['sensorData']
            if not isinstance(sensor_data, list):
                validation_results["errors"].append("sensorData must be a list")
                validation_results["is_valid"] = False
            elif len(sensor_data) < 5:
                validation_results["warnings"].append("Limited sensor data available")
        
        # Calculate data quality score
        quality_factors = []
        if 'keyEvents' in data and len(data['keyEvents']) >= 5:
            quality_factors.append(1.0)
        elif 'keyEvents' in data and len(data['keyEvents']) >= 2:
            quality_factors.append(0.5)
        else:
            quality_factors.append(0.0)
        
        if 'sensorData' in data and len(data['sensorData']) >= 10:
            quality_factors.append(1.0)
        elif 'sensorData' in data and len(data['sensorData']) >= 5:
            quality_factors.append(0.5)
        else:
            quality_factors.append(0.0)
        
        if 'touchEvents' in data and len(data['touchEvents']) >= 3:
            quality_factors.append(1.0)
        elif 'touchEvents' in data and len(data['touchEvents']) >= 1:
            quality_factors.append(0.5)
        else:
            quality_factors.append(0.0)
        
        validation_results["data_quality_score"] = sum(quality_factors) / len(quality_factors)
        
        return jsonify({
            "success": True,
            "data": validation_results,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error validating data: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        "success": False,
        "error": "Endpoint not found",
        "timestamp": datetime.now().isoformat()
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        "success": False,
        "error": "Internal server error",
        "timestamp": datetime.now().isoformat()
    }), 500

if __name__ == '__main__':
    # Get port from environment variable or use default
    port = int(os.environ.get('PORT', 5123))
    
    logger.info(f"Starting Behavioral Authentication ML API server on port {port}")
    logger.info("Available endpoints:")
    logger.info("  GET  /health - Health check")
    logger.info("  GET  /api/model/info - Get model information")
    logger.info("  POST /api/model/train - Train model")
    logger.info("  POST /api/model/predict - Make prediction")
    logger.info("  POST /api/model/reset - Reset model")
    logger.info("  POST /api/features/extract - Extract features")
    logger.info("  POST /api/analysis/risk-assessment - Risk assessment")
    logger.info("  POST /api/data/validate - Validate data")
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=port, debug=True)
