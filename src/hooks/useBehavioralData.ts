import { useState, useCallback, useRef, useEffect } from 'react';
import { KeyEvent, MouseEvent, BehavioralData } from '../services/BehavioralAuthService';
import { Platform } from 'react-native';

export const useBehavioralData = () => {
  const [keyEvents, setKeyEvents] = useState<KeyEvent[]>([]);
  const [mouseEvents, setMouseEvents] = useState<MouseEvent[]>([]);
  const [currentInputBox, setCurrentInputBox] = useState<string>('');
  const [textChanged, setTextChanged] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const movementIdRef = useRef(1);
  const previousEpochRef = useRef(Date.now());
  const lastMousePositionRef = useRef<{ x: number; y: number } | null>(null);
  const mouseMovementTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mouse movement tracking for web
  useEffect(() => {
    if (Platform.OS !== 'web' || !isRecording) return;

    let mouseMoveHandler: ((e: Event) => void) | null = null;
    let mouseUpHandler: ((e: Event) => void) | null = null;

    if (isRecording) {
      mouseMoveHandler = (e: Event) => {
        const domMouseEvent = e as any; // Cast to access clientX/clientY
        if (!isRecording) return;

        const currentTime = Date.now();
        const currentPos = { x: domMouseEvent.clientX, y: domMouseEvent.clientY };
        
        // Check if enough time has passed to create a new movement segment
        if (currentTime - previousEpochRef.current >= 300) {
          movementIdRef.current += 1;
          previousEpochRef.current = currentTime;
        }

        // Record mouse movement event
        const timestamp = new Date().toISOString();
        const epoch = currentTime.toString();
        
        const behavioralMouseEvent: MouseEvent = {
          Event: 'move',
          Coordinates: [currentPos.x, currentPos.y],
          Timestamp: timestamp,
          Epoch: epoch,
          'Movement ID': movementIdRef.current
        };

        setMouseEvents(prev => [...prev, behavioralMouseEvent]);
        lastMousePositionRef.current = currentPos;

        // Clear existing timeout and set new one for movement end detection
        if (mouseMovementTimeoutRef.current) {
          clearTimeout(mouseMovementTimeoutRef.current);
        }
        
        mouseMovementTimeoutRef.current = setTimeout(() => {
          // If no mouse movement for 1 second, increment movement ID for next potential movement
          if (isRecording) {
            movementIdRef.current += 1;
          }
        }, 1000);
      };

      mouseUpHandler = (e: Event) => {
        const domMouseEvent = e as any; // Cast to access clientX/clientY
        if (!isRecording) return;

        const currentPos = { x: domMouseEvent.clientX, y: domMouseEvent.clientY };
        const timestamp = new Date().toISOString();
        const epoch = Date.now().toString();
        
        // Record mouse release event
        const behavioralMouseEvent: MouseEvent = {
          Event: 'release',
          Coordinates: [currentPos.x, currentPos.y],
          Timestamp: timestamp,
          Epoch: epoch,
          'Movement ID': movementIdRef.current
        };

        setMouseEvents(prev => [...prev, behavioralMouseEvent]);
        lastMousePositionRef.current = null;
      };

      // Add event listeners
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
    }

    return () => {
      if (mouseMoveHandler) {
        document.removeEventListener('mousemove', mouseMoveHandler);
      }
      if (mouseUpHandler) {
        document.removeEventListener('mouseup', mouseUpHandler);
      }
      if (mouseMovementTimeoutRef.current) {
        clearTimeout(mouseMovementTimeoutRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = useCallback(() => {
    setKeyEvents([]);
    setMouseEvents([]);
    setCurrentInputBox('');
    setTextChanged(false);
    setIsRecording(true);
    setSessionStartTime(Date.now());
    movementIdRef.current = 1;
    previousEpochRef.current = Date.now();
    lastMousePositionRef.current = null;
    
    // Clear any existing timeouts
    if (mouseMovementTimeoutRef.current) {
      clearTimeout(mouseMovementTimeoutRef.current);
    }
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (mouseMovementTimeoutRef.current) {
      clearTimeout(mouseMovementTimeoutRef.current);
    }
  }, []);

  const recordKeyEvent = useCallback((key: string, event: 'pressed' | 'released') => {
    if (!isRecording) return;

    const timestamp = new Date().toISOString();
    const epoch = Date.now().toString();
    
    const keyEvent: KeyEvent = {
      Key: key,
      Event: event,
      'Input Box': currentInputBox,
      'Text Changed': textChanged,
      Timestamp: timestamp,
      Epoch: epoch
    };

    setKeyEvents(prev => [...prev, keyEvent]);
  }, [isRecording, currentInputBox, textChanged]);

  const recordMouseEvent = useCallback((event: string, coordinates: { x: number; y: number }) => {
    if (!isRecording) return;

    const timestamp = new Date().toISOString();
    const epoch = Date.now();
    
    // For movement events, check if enough time has passed to increment movement ID
    let movementId = movementIdRef.current;
    if (event === 'move' && (epoch - previousEpochRef.current) >= 300) {
      movementIdRef.current += 1;
      movementId = movementIdRef.current;
      previousEpochRef.current = epoch;
    }

    const mouseEvent: MouseEvent = {
      Event: event,
      Coordinates: [coordinates.x, coordinates.y],
      Timestamp: timestamp,
      Epoch: epoch.toString(),
      'Movement ID': movementId
    };

    setMouseEvents(prev => [...prev, mouseEvent]);
  }, [isRecording]);

  const setInputBox = useCallback((inputBox: string) => {
    setCurrentInputBox(inputBox);
  }, []);

  const updateTextChanged = useCallback((changed: boolean) => {
    setTextChanged(changed);
  }, []);

  const resetData = useCallback(() => {
    setKeyEvents([]);
    setMouseEvents([]);
    setCurrentInputBox('');
    setTextChanged(false);
    movementIdRef.current = 1;
    previousEpochRef.current = Date.now();
    lastMousePositionRef.current = null;
    
    if (mouseMovementTimeoutRef.current) {
      clearTimeout(mouseMovementTimeoutRef.current);
    }
  }, []);

  const getCurrentData = useCallback((): BehavioralData => {
    return {
      key_events: keyEvents,
      mouse_events: mouseEvents
    };
  }, [keyEvents, mouseEvents]);

  const getRealTimeRiskScore = useCallback((): number => {
    // Enhanced risk assessment based on data quality and movement patterns
    if (keyEvents.length < 5) return 0.8; // High risk - insufficient data
    
    // Consider movement data quality for web platforms
    if (Platform.OS === 'web') {
      const movementEvents = mouseEvents.filter(e => e.Event === 'move');
      if (movementEvents.length < 10) return 0.7; // Medium-high risk - insufficient movement data
      if (movementEvents.length < 20) return 0.6; // Medium risk
    }
    
    if (keyEvents.length < 10) return 0.6; // Medium risk
    return 0.2; // Low risk - sufficient data
  }, [keyEvents.length, mouseEvents.length]);

  return {
    startRecording,
    stopRecording,
    recordKeyEvent,
    recordMouseEvent,
    setInputBox,
    updateTextChanged,
    resetData,
    getCurrentData,
    getRealTimeRiskScore,
    isRecording
  };
};
