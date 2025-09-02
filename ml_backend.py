#!/usr/bin/env python3
"""
Behavioral Authentication ML Backend Service
Advanced machine learning backend for behavioral biometrics and fraud detection
"""

import os
import json
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import logging

# ML Libraries
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers, models
    from sklearn.ensemble import RandomForestClassifier, IsolationForest
    from sklearn.preprocessing import StandardScaler, MinMaxScaler
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
    from sklearn.decomposition import PCA
    import joblib
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("Warning: ML libraries not available. Install with: pip install tensorflow scikit-learn joblib")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BehavioralBiometricsML:
    """
    Advanced ML service for behavioral biometrics analysis
    """
    
    def __init__(self, model_dir: str = "models"):
        self.model_dir = model_dir
        self.scaler = None
        self.pca = None
        self.model = None
        self.isolation_forest = None
        self.feature_names = None
        
        # Create model directory if it doesn't exist
        os.makedirs(model_dir, exist_ok=True)
        
        # Initialize models
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize ML models"""
        if not ML_AVAILABLE:
            logger.warning("ML libraries not available. Models will not be initialized.")
            return
            
        try:
            # Load existing models if available
            self._load_models()
        except Exception as e:
            logger.info(f"No existing models found, creating new ones: {e}")
            self._create_models()
    
    def _create_models(self):
        """Create new ML models"""
        if not ML_AVAILABLE:
            return
            
        # Feature scaler
        self.scaler = StandardScaler()
        
        # PCA for dimensionality reduction
        self.pca = PCA(n_components=0.95)  # Keep 95% variance
        
        # Neural network model
        self.model = self._build_neural_network()
        
        # Isolation Forest for anomaly detection
        self.isolation_forest = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
    
    def _build_neural_network(self) -> keras.Model:
        """Build neural network architecture"""
        model = keras.Sequential([
            layers.Dense(256, activation='relu', input_shape=(None,), name='input_layer'),
            layers.Dropout(0.3),
            layers.Dense(128, activation='relu', name='hidden_1'),
            layers.Dropout(0.2),
            layers.Dense(64, activation='relu', name='hidden_2'),
            layers.Dropout(0.2),
            layers.Dense(32, activation='relu', name='hidden_3'),
            layers.Dense(1, activation='sigmoid', name='output_layer')
        ])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy', 'precision', 'recall']
        )
        
        return model
    
    def _load_models(self):
        """Load existing trained models"""
        if not ML_AVAILABLE:
            return
            
        try:
            # Load scaler
            if os.path.exists(f"{self.model_dir}/scaler.pkl"):
                self.scaler = joblib.load(f"{self.model_dir}/scaler.pkl")
            
            # Load PCA
            if os.path.exists(f"{self.model_dir}/pca.pkl"):
                self.pca = joblib.load(f"{self.model_dir}/pca.pkl")
            
            # Load neural network
            if os.path.exists(f"{self.model_dir}/neural_network.h5"):
                self.model = keras.models.load_model(f"{self.model_dir}/neural_network.h5")
            
            # Load isolation forest
            if os.path.exists(f"{self.model_dir}/isolation_forest.pkl"):
                self.isolation_forest = joblib.load(f"{self.model_dir}/isolation_forest.pkl")
            
            # Load feature names
            if os.path.exists(f"{self.model_dir}/feature_names.json"):
                with open(f"{self.model_dir}/feature_names.json", 'r') as f:
                    self.feature_names = json.load(f)
                    
            logger.info("Models loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            self._create_models()
    
    def _save_models(self):
        """Save trained models"""
        if not ML_AVAILABLE:
            return
            
        try:
            # Save scaler
            if self.scaler:
                joblib.dump(self.scaler, f"{self.model_dir}/scaler.pkl")
            
            # Save PCA
            if self.pca:
                joblib.dump(self.pca, f"{self.model_dir}/pca.pkl")
            
            # Save neural network
            if self.model:
                self.model.save(f"{self.model_dir}/neural_network.h5")
            
            # Save isolation forest
            if self.isolation_forest:
                joblib.dump(self.isolation_forest, f"{self.model_dir}/isolation_forest.pkl")
            
            # Save feature names
            if self.feature_names:
                with open(f"{self.model_dir}/feature_names.json", 'w') as f:
                    json.dump(self.feature_names, f)
                    
            logger.info("Models saved successfully")
            
        except Exception as e:
            logger.error(f"Error saving models: {e}")
    
    def extract_features(self, behavioral_data: Dict) -> np.ndarray:
        """
        Extract comprehensive features from behavioral data
        
        Args:
            behavioral_data: Dictionary containing behavioral data
            
        Returns:
            Feature vector as numpy array
        """
        try:
            features = []
            
            # Key press timing features
            if 'keyEvents' in behavioral_data:
                key_events = behavioral_data['keyEvents']
                if len(key_events) > 1:
                    # Dwell time features
                    dwell_times = []
                    for i in range(len(key_events) - 1):
                        if key_events[i]['event'] == 'pressed' and key_events[i+1]['event'] == 'released':
                            dwell_time = key_events[i+1]['epoch'] - key_events[i]['epoch']
                            dwell_times.append(dwell_time)
                    
                    if dwell_times:
                        features.extend([
                            np.mean(dwell_times),
                            np.std(dwell_times),
                            np.min(dwell_times),
                            np.max(dwell_times),
                            np.percentile(dwell_times, 25),
                            np.percentile(dwell_times, 75)
                        ])
                    else:
                        features.extend([0, 0, 0, 0, 0, 0])
                    
                    # Flight time features
                    flight_times = []
                    for i in range(len(key_events) - 1):
                        if key_events[i]['event'] == 'released' and key_events[i+1]['event'] == 'pressed':
                            flight_time = key_events[i+1]['epoch'] - key_events[i]['epoch']
                            flight_times.append(flight_time)
                    
                    if flight_times:
                        features.extend([
                            np.mean(flight_times),
                            np.std(flight_times),
                            np.min(flight_times),
                            np.max(flight_times)
                        ])
                    else:
                        features.extend([0, 0, 0, 0])
                    
                    # Typing rhythm features
                    key_press_times = [event['epoch'] for event in key_events if event['event'] == 'pressed']
                    if len(key_press_times) > 1:
                        intervals = np.diff(key_press_times)
                        features.extend([
                            np.mean(intervals),
                            np.std(intervals),
                            np.min(intervals),
                            np.max(intervals)
                        ])
                    else:
                        features.extend([0, 0, 0, 0])
                else:
                    features.extend([0] * 18)  # 18 key-related features
            else:
                features.extend([0] * 18)
            
            # Touch pattern features
            if 'touchEvents' in behavioral_data:
                touch_events = behavioral_data['touchEvents']
                if len(touch_events) > 1:
                    # Touch movement patterns
                    movements = []
                    for i in range(len(touch_events) - 1):
                        if touch_events[i]['event'] == 'touch' and touch_events[i+1]['event'] == 'release':
                            dx = touch_events[i+1]['coordinates']['x'] - touch_events[i]['coordinates']['x']
                            dy = touch_events[i+1]['coordinates']['y'] - touch_events[i]['coordinates']['y']
                            distance = np.sqrt(dx**2 + dy**2)
                            movements.append(distance)
                    
                    if movements:
                        features.extend([
                            np.mean(movements),
                            np.std(movements),
                            np.min(movements),
                            np.max(movements)
                        ])
                    else:
                        features.extend([0, 0, 0, 0])
                else:
                    features.extend([0] * 4)
            else:
                features.extend([0] * 4)
            
            # Sensor data features
            if 'sensorData' in behavioral_data:
                sensor_data = behavioral_data['sensorData']
                if len(sensor_data) > 1:
                    # Accelerometer features
                    acc_x = [s['accelerometer']['x'] for s in sensor_data]
                    acc_y = [s['accelerometer']['y'] for s in sensor_data]
                    acc_z = [s['accelerometer']['z'] for s in sensor_data]
                    
                    features.extend([
                        np.mean(acc_x), np.std(acc_x), np.min(acc_x), np.max(acc_x),
                        np.mean(acc_y), np.std(acc_y), np.min(acc_y), np.max(acc_y),
                        np.mean(acc_z), np.std(acc_z), np.min(acc_z), np.max(acc_z)
                    ])
                    
                    # Gyroscope features
                    if 'gyroscope' in sensor_data[0]:
                        gyro_x = [s['gyroscope']['x'] for s in sensor_data]
                        gyro_y = [s['gyroscope']['y'] for s in sensor_data]
                        gyro_z = [s['gyroscope']['z'] for s in sensor_data]
                        
                        features.extend([
                            np.mean(gyro_x), np.std(gyro_x), np.min(gyro_x), np.max(gyro_x),
                            np.mean(gyro_y), np.std(gyro_y), np.min(gyro_y), np.max(gyro_y),
                            np.mean(gyro_z), np.std(gyro_z), np.min(gyro_z), np.max(gyro_z)
                        ])
                    else:
                        features.extend([0] * 12)
                    
                    # Magnetometer features
                    if 'magnetometer' in sensor_data[0]:
                        mag_x = [s['magnetometer']['x'] for s in sensor_data]
                        mag_y = [s['magnetometer']['y'] for s in sensor_data]
                        mag_z = [s['magnetometer']['z'] for s in sensor_data]
                        
                        features.extend([
                            np.mean(mag_x), np.std(mag_x), np.min(mag_x), np.max(mag_x),
                            np.mean(mag_y), np.std(mag_y), np.min(mag_y), np.max(mag_y),
                            np.mean(mag_z), np.std(mag_z), np.min(mag_z), np.max(mag_z)
                        ])
                    else:
                        features.extend([0] * 12)
                else:
                    features.extend([0] * 36)  # 36 sensor-related features
            else:
                features.extend([0] * 36)
            
            # Session features
            features.extend([
                behavioral_data.get('sessionDuration', 0),
                behavioral_data.get('typingSpeed', 0),
                behavioral_data.get('falseEnters', 0)
            ])
            
            # Convert to numpy array and handle NaN values
            features = np.array(features, dtype=np.float64)
            features = np.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0)
            
            return features
            
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            # Return zero features if extraction fails
            return np.zeros(73)  # Total number of features
    
    def train_model(self, training_data: List[Dict], labels: List[int]) -> Dict:
        """
        Train the behavioral authentication model
        
        Args:
            training_data: List of behavioral data dictionaries
            labels: List of labels (1 for legitimate, 0 for fraudulent)
            
        Returns:
            Training results dictionary
        """
        if not ML_AVAILABLE:
            return {"error": "ML libraries not available"}
        
        try:
            logger.info("Starting model training...")
            
            # Extract features
            features = []
            for data in training_data:
                feature_vector = self.extract_features(data)
                features.append(feature_vector)
            
            features = np.array(features)
            labels = np.array(labels)
            
            # Store feature names for later use
            self.feature_names = [f"feature_{i}" for i in range(features.shape[1])]
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                features, labels, test_size=0.2, random_state=42, stratify=labels
            )
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Apply PCA
            X_train_pca = self.pca.fit_transform(X_train_scaled)
            X_test_pca = self.pca.transform(X_test_scaled)
            
            logger.info(f"Feature dimensions: Original={features.shape[1]}, PCA={X_train_pca.shape[1]}")
            
            # Train neural network
            history = self.model.fit(
                X_train_pca, y_train,
                epochs=100,
                batch_size=32,
                validation_data=(X_test_pca, y_test),
                callbacks=[
                    keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True),
                    keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=5)
                ],
                verbose=1
            )
            
            # Train isolation forest for anomaly detection
            self.isolation_forest.fit(X_train_pca)
            
            # Evaluate model
            y_pred = self.model.predict(X_test_pca)
            y_pred_binary = (y_pred > 0.5).astype(int)
            
            accuracy = accuracy_score(y_test, y_pred_binary)
            
            # Generate detailed report
            report = classification_report(y_test, y_pred_binary, output_dict=True)
            conf_matrix = confusion_matrix(y_test, y_pred_binary)
            
            # Save models
            self._save_models()
            
            results = {
                "success": True,
                "accuracy": accuracy,
                "classification_report": report,
                "confusion_matrix": conf_matrix.tolist(),
                "training_history": {
                    "loss": [float(x) for x in history.history['loss']],
                    "accuracy": [float(x) for x in history.history['accuracy']],
                    "val_loss": [float(x) for x in history.history['val_loss']],
                    "val_accuracy": [float(x) for x in history.history['val_accuracy']]
                },
                "feature_importance": self._get_feature_importance(),
                "model_info": {
                    "total_features": features.shape[1],
                    "pca_features": X_train_pca.shape[1],
                    "training_samples": len(training_data),
                    "legitimate_samples": sum(labels),
                    "fraudulent_samples": len(labels) - sum(labels)
                }
            }
            
            logger.info(f"Model training completed. Accuracy: {accuracy:.4f}")
            return results
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            return {"error": str(e)}
    
    def predict(self, behavioral_data: Dict) -> Dict:
        """
        Make prediction on new behavioral data
        
        Args:
            behavioral_data: Behavioral data dictionary
            
        Returns:
            Prediction results dictionary
        """
        if not ML_AVAILABLE or self.model is None:
            return {"error": "Model not available"}
        
        try:
            # Extract features
            features = self.extract_features(behavioral_data)
            features = features.reshape(1, -1)
            
            # Scale features
            features_scaled = self.scaler.transform(features)
            
            # Apply PCA
            features_pca = self.pca.transform(features_scaled)
            
            # Make prediction
            prediction_prob = self.model.predict(features_pca)[0][0]
            prediction = 1 if prediction_prob > 0.5 else 0
            
            # Calculate confidence
            confidence = abs(prediction_prob - 0.5) * 2
            
            # Anomaly detection
            anomaly_score = self.isolation_forest.decision_function(features_pca)[0]
            is_anomaly = self.isolation_forest.predict(features_pca)[0] == -1
            
            # Risk assessment
            risk_score = self._calculate_risk_score(features_pca[0], prediction_prob, anomaly_score)
            
            results = {
                "prediction": int(prediction),
                "prediction_probability": float(prediction_prob),
                "confidence": float(confidence),
                "is_anomaly": bool(is_anomaly),
                "anomaly_score": float(anomaly_score),
                "risk_score": float(risk_score),
                "risk_level": self._get_risk_level(risk_score),
                "timestamp": datetime.now().isoformat()
            }
            
            return results
            
        except Exception as e:
            logger.error(f"Error making prediction: {e}")
            return {"error": str(e)}
    
    def _calculate_risk_score(self, features: np.ndarray, prediction_prob: float, anomaly_score: float) -> float:
        """Calculate comprehensive risk score"""
        risk_score = 0.0
        
        # Prediction confidence risk
        if prediction_prob < 0.3 or prediction_prob > 0.7:
            risk_score += 0.3
        
        # Anomaly risk
        if anomaly_score < -0.5:  # High anomaly
            risk_score += 0.4
        
        # Feature variance risk
        feature_variance = np.var(features)
        if feature_variance > 10:  # High variance indicates unusual patterns
            risk_score += 0.3
        
        return min(risk_score, 1.0)
    
    def _get_risk_level(self, risk_score: float) -> str:
        """Get risk level description"""
        if risk_score < 0.3:
            return "Low"
        elif risk_score < 0.7:
            return "Medium"
        else:
            return "High"
    
    def _get_feature_importance(self) -> Dict:
        """Get feature importance information"""
        if not ML_AVAILABLE or self.model is None:
            return {}
        
        try:
            # For neural networks, we can use the weights of the first layer
            first_layer_weights = self.model.layers[0].get_weights()[0]
            feature_importance = np.mean(np.abs(first_layer_weights), axis=1)
            
            # Map to feature names
            importance_dict = {}
            for i, importance in enumerate(feature_importance):
                feature_name = self.feature_names[i] if self.feature_names else f"feature_{i}"
                importance_dict[feature_name] = float(importance)
            
            # Sort by importance
            sorted_importance = dict(sorted(importance_dict.items(), key=lambda x: x[1], reverse=True))
            
            return sorted_importance
            
        except Exception as e:
            logger.error(f"Error getting feature importance: {e}")
            return {}
    
    def get_model_info(self) -> Dict:
        """Get information about the current model"""
        if not ML_AVAILABLE:
            return {"error": "ML libraries not available"}
        
        info = {
            "model_loaded": self.model is not None,
            "scaler_loaded": self.scaler is not None,
            "pca_loaded": self.pca is not None,
            "isolation_forest_loaded": self.isolation_forest is not None,
            "feature_names": self.feature_names,
            "model_directory": self.model_dir
        }
        
        if self.model:
            info["model_summary"] = []
            self.model.summary(print_fn=lambda x: info["model_summary"].append(x))
        
        return info
    
    def reset_model(self):
        """Reset all models"""
        self.scaler = None
        self.pca = None
        self.model = None
        self.isolation_forest = None
        self.feature_names = None
        
        # Remove saved model files
        try:
            for file in os.listdir(self.model_dir):
                file_path = os.path.join(self.model_dir, file)
                if os.path.isfile(file_path):
                    os.remove(file_path)
            logger.info("Models reset successfully")
        except Exception as e:
            logger.error(f"Error resetting models: {e}")

# Example usage and testing
if __name__ == "__main__":
    # Initialize the ML service
    ml_service = BehavioralBiometricsML()
    
    # Example behavioral data
    sample_data = {
        "keyEvents": [
            {"key": "a", "event": "pressed", "epoch": 1000, "inputBox": "name"},
            {"key": "a", "event": "released", "epoch": 1200, "inputBox": "name"},
            {"key": "b", "event": "pressed", "epoch": 1500, "inputBox": "name"},
            {"key": "b", "event": "released", "epoch": 1700, "inputBox": "name"}
        ],
        "touchEvents": [
            {"event": "touch", "coordinates": {"x": 100, "y": 200}, "epoch": 1000},
            {"event": "release", "coordinates": {"x": 150, "y": 250}, "epoch": 1200}
        ],
        "sensorData": [
            {"accelerometer": {"x": 0.1, "y": 0.2, "z": 9.8}, "timestamp": 1000},
            {"accelerometer": {"x": 0.2, "y": 0.1, "z": 9.7}, "timestamp": 1100}
        ],
        "sessionDuration": 5000,
        "typingSpeed": 0.8,
        "falseEnters": 0
    }
    
    # Test feature extraction
    features = ml_service.extract_features(sample_data)
    print(f"Extracted {len(features)} features")
    
    # Test model info
    model_info = ml_service.get_model_info()
    print("Model info:", json.dumps(model_info, indent=2))
    
    print("ML Backend Service initialized successfully!")
