import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as faceapi from 'face-api.js';
import { Camera, CameraOff, AlertTriangle, Bell } from 'lucide-react';
import Button from '../ui/Button.jsx';

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
const EAR_THRESHOLD = 0.15;
const DROWSY_FRAMES_THRESHOLD = 5;
const NO_FACE_FRAMES_THRESHOLD = 8;
const DETECT_INTERVAL_MS = 100;
const ALERT_COOLDOWN_MS = 2000;

const notifyUser = (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/icon-192.png' });
    } catch (error) {
      console.error('Notification failed', error);
    }
  }
};

const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return;
  try {
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch (error) {
    console.error('Notification permission request failed', error);
  }
};

const playAlertSound = async () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (error) {
    console.error('Alert sound failed', error);
  }
};

const calculateEAR = (eye) => {
  const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
  const vertical1 = dist(eye[1], eye[5]);
  const vertical2 = dist(eye[2], eye[4]);
  const horizontal = dist(eye[0], eye[3]);
  return (vertical1 + vertical2) / (2 * horizontal);
};

export default function FocusGuard({ isRunning, onDrowsy }) {
  const [enabled, setEnabled] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('off');
  const [alertShown, setAlertShown] = useState(false);
  const [debug, setDebug] = useState({ ear: 0, drowsy: 0, noFace: 0 });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const isDetectingRef = useRef(false);
  const drowsyFrameCount = useRef(0);
  const noFaceFrameCount = useRef(0);
  const lastAlertTime = useRef(0);
  const wakeLockRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
    setStatus('off');
    setAlertShown(false);
    setDebug({ ear: 0, drowsy: 0, noFace: 0 });
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('active');
    } catch (error) {
      console.error('Camera access failed', error);
      setStatus('error');
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModels = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    } catch (error) {
      console.error('Failed to load face-api models', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerAlert = useCallback(
    (title, message) => {
      const now = Date.now();
      if (now - lastAlertTime.current < ALERT_COOLDOWN_MS) return;
      lastAlertTime.current = now;

      playAlertSound();
      if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
      notifyUser(title, message);
      setAlertShown(true);
      onDrowsy?.();
      setTimeout(() => setAlertShown(false), 2500);
    },
    [onDrowsy]
  );

  const detect = useCallback(async () => {
    if (isDetectingRef.current || !videoRef.current || !enabled || !isRunning) return;
    isDetectingRef.current = true;

    try {
      const video = videoRef.current;
      if (video.paused || video.ended || video.readyState < 2) return;

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      if (detection) {
        noFaceFrameCount.current = 0;
        const leftEye = detection.landmarks.getLeftEye();
        const rightEye = detection.landmarks.getRightEye();
        const leftEAR = calculateEAR(leftEye);
        const rightEAR = calculateEAR(rightEye);
        const avgEAR = (leftEAR + rightEAR) / 2;

        if (avgEAR < EAR_THRESHOLD) {
          drowsyFrameCount.current += 1;
        } else {
          drowsyFrameCount.current = 0;
        }

        setDebug({ ear: avgEAR.toFixed(3), drowsy: drowsyFrameCount.current, noFace: 0 });

        if (drowsyFrameCount.current > DROWSY_FRAMES_THRESHOLD) {
          triggerAlert('Wake up, buddy!', 'You look sleepy — stay focused 🧸');
        }
      } else {
        noFaceFrameCount.current += 1;
        drowsyFrameCount.current = 0;
        setDebug({ ear: 0, drowsy: 0, noFace: noFaceFrameCount.current });

        if (noFaceFrameCount.current > NO_FACE_FRAMES_THRESHOLD) {
          triggerAlert('Where did you go?', 'Focus Guard cannot see you 🧸');
        }
      }
    } catch (error) {
      console.error('Detection error', error);
    } finally {
      isDetectingRef.current = false;
    }
  }, [enabled, isRunning, triggerAlert]);

  useEffect(() => {
    if (enabled) {
      if (!modelsLoaded) {
        loadModels().then(() => startCamera());
      } else {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [enabled, modelsLoaded, loadModels, startCamera, stopCamera]);

  useEffect(() => {
    if (enabled && isRunning && modelsLoaded) {
      intervalRef.current = setInterval(detect, DETECT_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, isRunning, modelsLoaded, detect]);

  useEffect(() => {
    if (!enabled || !isRunning || !('wakeLock' in navigator)) return;

    navigator.wakeLock
      .request('screen')
      .then((lock) => {
        wakeLockRef.current = lock;
        lock.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      })
      .catch(() => {});
  }, [enabled, isRunning]);

  const handleTestAlert = () => {
    playAlertSound();
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    notifyUser('Test alert', 'Focus Guard is working 🧸');
    setAlertShown(true);
    setTimeout(() => setAlertShown(false), 2500);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enabled ? <Camera className="w-4 h-4 text-violet-600" /> : <CameraOff className="w-4 h-4 text-stone-400" />}
          <span className="text-sm font-medium text-stone-700">Focus Guard</span>
        </div>
        <Button
          type="button"
          variant={enabled ? 'cozy' : 'secondary'}
          size="sm"
          onClick={async () => {
            if (!enabled) await requestNotificationPermission();
            setEnabled(!enabled);
          }}
          isLoading={loading}
        >
          {enabled ? 'On' : 'Off'}
        </Button>
      </div>

      {enabled && status === 'error' && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm">
          Camera or face-detection models failed. Check permissions and internet.
        </div>
      )}

      {enabled && status === 'active' && (
        <button
          onClick={handleTestAlert}
          className="flex items-center gap-2 text-xs text-violet-600 hover:text-violet-700 font-medium"
        >
          <Bell className="w-3 h-3" /> Test alert sound & notification
        </button>
      )}

      {enabled && (
        <div className="relative rounded-2xl overflow-hidden bg-stone-900 aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover opacity-80" muted playsInline />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          <div className="absolute bottom-2 left-2 text-[10px] text-white/70 bg-black/40 px-2 py-1 rounded-lg">
            {status === 'active' ? `EAR ${debug.ear} | Drowsy ${debug.drowsy} | NoFace ${debug.noFace}` : status === 'error' ? 'Camera error' : 'Starting...'}
          </div>
        </div>
      )}

      {alertShown && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Wake up, buddy! Stay focused 🧸</span>
        </motion.div>
      )}

      <p className="text-xs text-stone-400">
        Focus Guard uses your camera to detect drowsiness. Video never leaves your device.
      </p>
    </div>
  );
}
