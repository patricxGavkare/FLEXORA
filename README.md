# FLEXORA — Smart Prosthetic Hand Simulator

A browser-based prosthetic hand simulator built as a Digital Electronics and Microprocessor (DEAM) course project at Vishwakarma Institute of Technology (VIT), Pune.

A webcam tracks your real hand. The movement is encoded into a 5-bit digital control word, and a virtual prosthetic hand mirrors it. The same word drives register-level models of the microcontroller logic taught in the DEAM syllabus.

> **Scope:** FLEXORA is a software simulation. There is no physical Arduino or servo connection yet. The sEMG, ADC and PID force-limiter panels are **simulated** and are labelled `[SIMULATED]` in the UI.

## Features

- **Live hand tracking:** MediaPipe Hand Landmarker (21 3D landmarks) running in the browser via WebAssembly.
- **Continuous joint control:** MCP, PIP and DIP angles for all 5 fingers, with a manual slider override when the webcam is unavailable.
- **5-bit control bus:** one bit per finger (1 = bent), shown live in binary, decimal and hex.
- **8 clinical grip presets**, each with a unique code. `validateGripPresets()` checks for collisions at load time.
- **Temporal gesture stabilizer** (`gestureStabilizer.js`): a rolling-window state machine that commits a gesture only after the pose settles, with early commit when finger velocities converge on a known preset. It is deterministic arithmetic with **no machine learning**.
- **Honest telemetry:** latency, intent and bus values show "—" when the camera is off or no hand is detected. No cached or synthetic values.
- **Live inference latency:** 30-frame rolling average of neural inference time (not end-to-end camera latency).
- **Workstation instruments:**
  1. Kinematics and manual override
  2. DEAM microcontroller bus: PORTB register, 74LS138 3:8 decoder, ATmega328P Timer1 Fast PWM (Mode 14, ICR1 = 39999, 50 Hz) timing diagram
  3. On-device few-shot grip trainer
  4. sEMG oscilloscope (simulated; RMS, MAV, SNR)
  5. Tactile and haptic lab (simulated FSR, 10-bit ADC, PID crush guard)
- **KaTeX** rendering for all equations.

## Grip presets (bit order: Thumb, Index, Middle, Ring, Pinky; 1 = bent)

| Preset | Code | Dec |
|---|---|---|
| Open Hand | 00000 | 0 |
| Precision Pinch | 00111 | 7 |
| Lateral Key | 01100 | 12 |
| Thumbs Up | 01111 | 15 |
| Peace / V-Grip | 10011 | 19 |
| Pointing | 10111 | 23 |
| Hook Grip | 11110 | 30 |
| Fist (Power Grip) | 11111 | 31 |

## DEAM syllabus mapping

| Unit | Topics demonstrated |
|---|---|
| 1 | Number systems (binary / decimal / hex), 5-bit control word, collision-free truth table |
| 2 | 3:8 decoder (74LS138), multiplexing, latching, propagation delay |
| 3 | 16-bit Timer1 Fast PWM, Output Compare, 10-bit SAR ADC, ISR-based force limiting |

## Tech stack

React, Vite, MediaPipe Tasks Vision, KaTeX, plain CSS.

## Getting started

```bash
git clone https://github.com/patricxGavkare/FLEXORA.git
cd FLEXORA/frontend
npm install
npm run dev
```

Open the local URL Vite prints (usually http://localhost:5173) and allow camera access, or enable Manual Slider Override.

Production build: `npm run build` (inside `frontend/`).

## Project structure

```
frontend/src/
├── components/   HandTracker, KinematicsPanel, McuPanel, SemgPanel,
│                 HapticGraspPanel, AiTrainerPanel, VirtualHand,
│                 MathView, Navbar, Footer
├── pages/        Home.jsx
├── styles/       global.css, Home.css, Navbar.css, Footer.css
└── utils/        handLogic.js, gestureStabilizer.js, mlClassifier.js
```

## Known limitations

- 5 bits encode only bent / straight per finger. Partial flexion (for example hook vs fist) cannot be distinguished by the bus word alone. The continuous angles carry that detail.
- sEMG, ADC and PID force limiting are simulated, not measured.
- Reported latency is neural inference time only.
- No hardware integration yet (planned: Web Serial to Arduino).

## References

- Microchip, *ATmega328P Datasheet* (DS40002061), Timer/Counter1 chapter.
- Google, *MediaPipe Hand Landmarker* documentation.

## Author

Pratik Gavkare, Second-Year B.Tech CSE (AI & ML), VIT Pune.
