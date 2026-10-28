# FLEXORA — Smart Prosthetic Hand Simulator

A browser-based prosthetic hand simulator built as a Digital Electronics and Microprocessor (DEAM) course project at Vishwakarma Institute of Technology (VIT), Pune.

A webcam tracks your real hand. The movement is encoded into a 5-bit digital control word, and a virtual prosthetic hand mirrors it. The same word drives register-level models of the microcontroller logic taught in the DEAM syllabus.

> **Scope:** FLEXORA is a software simulation. There is no physical Arduino or servo connection yet. The sEMG, ADC and PID force-limiter panels are **simulated** and are labelled `[SIMULATED]` in the UI.

## Motivation

Physical bionic prosthetic hardware is prohibitively expensive for classroom environments, and Digital Electronics and Microprocessor (DEAM) concepts are traditionally taught through abstract theory or isolated breadboard labs. To our knowledge, no reviewed prior work combines real-time consumer webcam tracking with an interactive, register-level digital logic and microcontroller simulation in a unified educational tool.

## How it works

The data pipeline runs entirely in the client browser:

1. **Webcam input & vision:** A standard video stream (640×480, up to 60 FPS via `requestAnimationFrame`) is processed by MediaPipe Hand Landmarker to extract 21 3D coordinate landmarks.
2. **Scale-invariant finger flexion:** Flexion values are calculated per finger as continuous ratios ($0.0$ to $1.0$):
   - **Index, Middle, Ring, Pinky:** A scale-invariant distance ratio normalizes hand depth:
     $$\text{ratio} = \frac{\text{dist}(\text{tip}, \text{wrist})}{\text{dist}(\text{pip}, \text{wrist})}$$
     $$\text{flexion} = \text{clamp}\left(\frac{\text{straightRef} - \text{ratio}}{\text{straightRef} - \text{bentRef}}, 0, 1\right)$$
     with $\text{straightRef} = 1.35$ and $\text{bentRef} = 0.80$ across all four medial fingers.
   - **Thumb:** Measures lateral opposition distance from thumb tip (Landmark 4) to pinky base (Landmark 17), normalized by thumb base (Landmark 2) to pinky base distance:
     $$\text{ratio} = \frac{\text{dist}(\text{thumbTip}, \text{pinkyBase})}{\text{dist}(\text{thumbBase}, \text{pinkyBase})}$$
     $$\text{flexion} = \text{clamp}\left(\frac{\text{extendedRef} - \text{ratio}}{\text{extendedRef} - \text{tuckedRef}}, 0, 1\right)$$
     with $\text{extendedRef} = 1.25$ and $\text{tuckedRef} = 0.75$.
3. **5-bit digital word conversion:** Each finger's flexion is quantized by a fixed digital threshold ($\text{bit} = 1 \text{ if flexion} \ge 0.5$, else $0$). Concatenating digits from Thumb (MSB) to Pinky (LSB) yields a 5-bit bus word.
4. **Three downstream processing branches:**
   - **3:8 Decoder branch:** The lower 3 bits $[b_2, b_1, b_0]$ (Middle, Ring, Pinky) drive an interactive 74LS138 line decoder model with active-low outputs ($Y_0..Y_7$).
   - **PWM servo module branch:** Continuous flexion scales servo pulse widths from $1000\,\mu\text{s}$ (open) to $2000\,\mu\text{s}$ (closed), modeled after ATmega328P 16-bit Timer1 Mode 14 Fast PWM ($ICR1 = 39999$, $50\text{ Hz}$, $OCR1A = \text{PulseWidth} \times 2$).
   - **Virtual hand renderer branch:** Continuous angles ($0^\circ-40^\circ$ for thumb/pinky, $0^\circ-42^\circ$ for index/middle/ring) articulate proximal, middle, and distal SVG phalanx segments in real time.

## AI Calibrator

The on-device machine learning studio (`mlClassifier.js`, `AiTrainerPanel.jsx`) provides few-shot custom grip training. It captures a 66-dimensional spatial feature vector (comprising 20 wrist-to-joint distances, 15 inter-fingertip distances, 5 thumb-to-joint distances, 21 z-depth values, and 5 finger flexions) across a 30-frame recording sequence. Pose matching computes Euclidean distance against class centroid prototypes and generates class probabilities using a softmax function with temperature scaling $\tau = 1.2$.

This calibrator is the **only learned component** in FLEXORA. The temporal gesture stabilizer, kinematic calculations, and 5-bit bus encoding are entirely deterministic arithmetic.

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

> **Network requirement:** The vision pipeline requires an internet connection on first load to download the MediaPipe WebAssembly runtime from the jsDelivr CDN and the `hand_landmarker.task` model binary from Google Cloud Storage. Manual Slider Override operates fully offline.

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

Group 11 , Members : ( Pratik , Aniket , Krushna , Prajakta ) , Second-Year B.Tech CSE (AI & ML), VIT Pune.
