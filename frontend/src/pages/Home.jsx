// =============================================================================
// Home.jsx - Main Presentation & Interactive Laboratory for FLEXORA
//
// WHAT THIS PAGE REPRESENTS (in simple English):
// FLEXORA is a smart prosthetic hand simulator developed for the
// Digital Electronics and Microprocessor (DEAM) course at VIT Pune.
//
// This page provides:
// 1. Hero header with authentic Apple-grade typography and minimalist flow.
// 2. Real-time interactive simulation workstation (<HandTracker />).
// 3. Interactive 5-Stage System Architecture pipeline (clickable nodes).
// 4. DEAM Curriculum Integration Matrix (Number Systems, Timers, Closed-Loop ADC).
// 5. Quantitative Technical Benchmark comparison table.
// 6. Interactive Technical FAQ Accordion with simple explanations.
// =============================================================================

import React, { useState } from "react";
import "../styles/Home.css";
import HandTracker from "../components/HandTracker";
import MathView from "../components/MathView";

// Interactive System Architecture Pipeline Data
const PIPELINE_STAGES = [
  {
    id: "stage-1",
    step: "Stage 01",
    title: "Optical & Bio-Signal Sensing",
    subtitle: "MediaPipe 21 3D Landmarks & Dual-Channel sEMG",
    tag: "Sensory Input",
    shortDesc: "Captures 60 FPS video stream via browser WASM or synthesizes forearm muscle action potentials in microvolts (µV).",
    details: {
      mechanism: "21 Cartesian 3D coordinates (X, Y, Z) detected via GPU-accelerated neural landmarker. Alternatively, simulates Flexor Digitorum Superficialis & Extensor Carpi Radialis motor unit action potentials (MUAP).",
      deamRelevance: "Sensor acquisition principles: Contactless optical telemetry vs biological biopotential transduction.",
      formula: "d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2 + (z_2 - z_1)^2}",
      hardwareMatch: "Equivalent to dual differential Ag/AgCl surface electrodes or depth-sensing optical sensors.",
    },
  },
  {
    id: "stage-2",
    step: "Stage 02",
    title: "Pattern Recognition & Centroid Classifier",
    subtitle: "66-D Spatial Vector Normalization & Softmax Inference",
    tag: "Edge AI Processing",
    shortDesc: "Translates raw coordinates into scale-invariant Euclidean distance ratios and classifies intent in <2 milliseconds.",
    details: {
      mechanism: "Computes 66-dimensional hand geometry vectors normalized by palm span (wrist-to-MCP width). Classifies gestures using temperature-scaled Softmax distance centroids.",
      deamRelevance: "Edge computing & classification algorithms embedded before the digital control bus.",
      formula: "P(C_k) = \\frac{e^{-d_k / T}}{\\sum_j e^{-d_j / T}}",
      hardwareMatch: "Can execute on ARM Cortex-M4 / Cortex-M7 or ESP32-S3 neural vector accelerators.",
    },
  },
  {
    id: "stage-3",
    step: "Stage 03",
    title: "5-Bit Discrete Control Bus",
    subtitle: "PORTB GPIO Register with Active-Low Pull-Up Logic",
    tag: "Digital Electronics",
    shortDesc: "Encodes the recognized bionic intent into a 5-bit digital control word (0b00000 to 0b11111).",
    details: {
      mechanism: "Five dedicated digital lines representing [Thumb, Index, Middle, Ring, Pinky]. Active-low open-drain logic with internal pull-ups prevents bus floating.",
      deamRelevance: "Unit 1 & 2 Core: 5-bit binary representations, hexadecimal conversion (0x00 to 0x1F), and collision-free truth table decoders.",
      formula: "Register = \\sum_{i=0}^{4} b_i \\cdot 2^i \\quad (0 \\le \\text{Register} \\le 31)",
      hardwareMatch: "Mapped directly to Microcontroller PORTB pins (PB0..PB4) with 8-bit bus latching.",
    },
  },
  {
    id: "stage-4",
    step: "Stage 04",
    title: "Microprocessor Timer Interfacing",
    subtitle: "ATmega328P 16-Bit Timer 1 (50 Hz Fast PWM)",
    tag: "Microprocessor Architecture",
    shortDesc: "Generates precise 1000 µs to 2000 µs pulse widths at 50 Hz to drive physical SG90 or MG996R servo actuators.",
    details: {
      mechanism: "Configures 16-bit Timer/Counter 1 in Fast PWM Mode (Mode 14). Uses ICR1 = 39999 as top register with a prescaler of N = 8 on a 16 MHz crystal to yield an exact 20 ms period.",
      deamRelevance: "Unit 3 Core: Timer registers (TCNT1, OCR1A, OCR1B, ICR1), prescaler math, and pulse-width duty cycle modulation.",
      formula: "f_{PWM} = \\frac{f_{clk}}{N \\cdot (1 + \\text{TOP})} = \\frac{16\\text{ MHz}}{8 \\cdot 40000} = 50\\text{ Hz}",
      hardwareMatch: "ATmega328P / STM32F4 Timer output compare channels (OC1A..OC1E).",
    },
  },
  {
    id: "stage-5",
    step: "Stage 05",
    title: "Closed-Loop Tactile Actuation",
    subtitle: "FSR Sensor Digitization, 10-Bit ADC & PID Crush Guard",
    tag: "Closed-Loop Control",
    shortDesc: "Monitors normal grip force (N) via piezoresistive fingertip sensors and auto-clamps motor torque to avoid crushing delicate objects.",
    details: {
      mechanism: "Piezoresistive Force-Sensing Resistors (FSR) feed an analog voltage divider (0-5V). The MCU internal 10-bit SAR ADC samples force at 1 kHz and triggers a PID interrupt when force approaches payload rupture limits.",
      deamRelevance: "Unit 3 & 4 Core: Analog-to-Digital Converter (ADC) registers (ADMUX, ADCSRA), interrupt service routines (ISR), and closed-loop feedback.",
      formula: "\\text{ADC} = \\left\\lfloor \\frac{V_{out}}{V_{ref}} \\times 1023 \\right\\rfloor, \\quad V_{out} = V_{cc} \\cdot \\frac{R_0}{R_F + R_0}",
      hardwareMatch: "Interfaced with ATmega328P ADC0..ADC4 channels with hardware comparator interrupts.",
    },
  },
];

// Technical FAQ Data
const FAQ_ITEMS = [
  {
    q: "How does FLEXORA achieve sub-15ms pipeline latency entirely in the browser?",
    a: "FLEXORA loads the Google MediaPipe HandLandmarker directly into browser WebAssembly (WASM) compiled with SIMD instructions and delegates neural inference to the client device GPU via WebGL/WebGPU. By batching React state updates and bypassing heavyweight CSS transitions, frame updates take under 15ms, maintaining a silky 60 FPS.",
  },
  {
    q: "How does this simulation map to physical microcontrollers like Arduino, STM32, or ESP32?",
    a: "FLEXORA generates both standard 5-bit GPIO pin words (PORTB) and high-speed UART telemetry strings ($FLEX,1000,1500,...). When connected via Web Serial or USB-to-UART bridge (FTDI/CH340), any microcontroller running C/C++ firmware can read the data and directly drive physical servo motors.",
  },
  {
    q: "Why use a 5-bit binary bus instead of transmitting raw finger angles?",
    a: "In Digital Electronics (DEAM), digital buses provide immense noise immunity compared to noisy analog voltages over long prosthetic wire harnesses. A 5-bit bus supports 2^5 = 32 distinct discrete grasp postures, enabling fast combinational decoding with simple TTL/CMOS logic gates (74LS138) before entering the CPU.",
  },
  {
    q: "What role does surface electromyography (sEMG) play in commercial prosthetics?",
    a: "Commercial myoelectric bionic hands (like the Ottobock Michelangelo or Open Bionics Hero Arm) use sEMG electrodes placed on the residual forearm. When the user flexes their forearm muscles, microvolt electrical potentials (µV) are picked up, amplified, rectified, and passed to microcontroller ADCs to actuate motors.",
  },
  {
    q: "How does the closed-loop tactile force limiter prevent crushing fragile payloads?",
    a: "Open-loop prosthetics rely solely on sight, causing users to crush fragile objects like eggs or cups. In FLEXORA's Tactile & Haptic Lab, simulated Force-Sensing Resistors (FSR) digitize pressure into 10-bit ADC words. A simulated firmware interrupt routine dynamically halts servo duty cycles the instant force reaches 88% of the object's fracture threshold.",
  },
];

export default function Home() {
  // Selected architecture stage for deep inspection modal
  const [activeStageId, setActiveStageId] = useState("stage-1");
  const activeStage = PIPELINE_STAGES.find((s) => s.id === activeStageId) || PIPELINE_STAGES[0];

  // Open FAQ accordion index
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Live measured inference latency from HandTracker
  const [liveLatency, setLiveLatency] = useState(null);

  return (
    <main>
      {/* 1. HERO SECTION */}
      <section id="home" className="hero container">
        <div className="hero-content">
          <p className="section-label">FLEXORA • BIONIC ROBOTICS LAB</p>
          <h1>
            Smart prosthetic movement,
            <br />
            engineered for human touch.
          </h1>

          <p className="hero-description">
            An open-architecture bio-robotics simulator bridging contactless computer vision,
            surface electromyography, 5-bit microcontroller buses, and closed-loop tactile feedback.
          </p>

          <div className="hero-buttons">
            <a href="#demo" className="primary-btn">
              Launch Live Workstation
            </a>
            <a href="#architecture" className="secondary-btn">
              System Architecture
            </a>
            <a href="#curriculum" className="secondary-btn">
              DEAM Specifications
            </a>
          </div>
        </div>
      </section>

      {/* 2. LIVE DEMO WORKSTATION */}
      <section id="demo" className="demo container">
        <div className="section-header">
          <p className="section-label">INTERACTIVE LABORATORY</p>
          <h2>Five Instruments. One Unified Workstation.</h2>
          <p className="section-intro">
            Position your hand in front of your camera or toggle <strong>Manual Slider Override</strong> below.
            Explore continuous kinematics, microcontroller PWM registers, sEMG oscilloscopes, and closed-loop haptic force control.
          </p>
        </div>

        <div className="demo-frame">
          <HandTracker onLatencyUpdate={setLiveLatency} />
        </div>
      </section>

      {/* 3. INTERACTIVE SYSTEM ARCHITECTURE */}
      <section id="architecture" className="architecture container">
        <div className="section-header">
          <p className="section-label">SIGNAL PROCESSING CHAIN</p>
          <h2>End-to-End System Architecture</h2>
          <p className="section-intro">
            From biological intent detection to closed-loop tactile actuation. Click any pipeline stage to inspect its circuit theory, mathematical equations, and firmware implementations.
          </p>
        </div>

        {/* Pipeline Stage Cards Grid */}
        <div className="pipeline-grid">
          {PIPELINE_STAGES.map((stage) => {
            const isSelected = stage.id === activeStageId;
            return (
              <div
                key={stage.id}
                onClick={() => setActiveStageId(stage.id)}
                className={`pipeline-card ${isSelected ? "selected" : ""}`}
              >
                <div className="pipeline-step">{stage.step}</div>
                <div className="pipeline-tag">{stage.tag}</div>
                <h3>{stage.title}</h3>
                <p>{stage.shortDesc}</p>
                <div className="pipeline-explore">
                  {isSelected ? "● Active Deep Spec" : "Click to Inspect Theory →"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Deep Spec Inspection Drawer */}
        <div className="deep-spec-drawer">
          <div className="drawer-header">
            <div>
              <span className="drawer-step">{activeStage.step} • {activeStage.tag}</span>
              <h3>{activeStage.title}</h3>
              <p className="drawer-subtitle">{activeStage.subtitle}</p>
            </div>
          </div>

          <div className="drawer-body">
            <div className="drawer-item">
              <h4>Theoretical Mechanism</h4>
              <p>{activeStage.details.mechanism}</p>
            </div>

            <div className="drawer-item">
              <h4>DEAM Curriculum Relevance</h4>
              <p>{activeStage.details.deamRelevance}</p>
            </div>

            <div className="drawer-item">
              <h4>Mathematical Foundation</h4>
              <div className="math-pill">
                <MathView math={activeStage.details.formula} block />
              </div>
            </div>

            <div className="drawer-item">
              <h4>Target Microcontroller Hardware</h4>
              <p>{activeStage.details.hardwareMatch}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DEAM CURRICULUM INTEGRATION MATRIX */}
      <section id="curriculum" className="curriculum container">
        <div className="section-header">
          <p className="section-label">ACADEMIC ALIGNMENT</p>
          <h2>Digital Electronics & Microprocessor Syllabus Integration</h2>
          <p className="section-intro">
            FLEXORA was built from the ground up to embody every core learning outcome of the second-year DEAM engineering curriculum at VIT Pune.
          </p>
        </div>

        <div className="curriculum-grid">
          {/* Unit 1 */}
          <article className="curriculum-card">
            <div className="unit-badge">UNIT 1</div>
            <h3>Number Systems & Logic Gates</h3>
            <ul>
              <li>
                <strong>5-Bit Binary Control Words:</strong> Direct mapping from 5 anatomical digits to 5 digital lines (<MathView math="2^5 = 32" inline /> unique states).
              </li>
              <li>
                <strong>Hexadecimal & Decimal Conversion:</strong> Live register conversion from binary (e.g., <code>0b10111</code>) to decimal (<code>23</code>) and hex (<code>0x17</code>).
              </li>
              <li>
                <strong>Collision-Free Truth Table:</strong> Deterministic grip mapping table ensuring every clinical posture occupies a unique digital address.
              </li>
              <li>
                <strong>Bus Electrical Characteristics:</strong> Active-low pull-up configuration to prevent high-impedance floating logic states.
              </li>
            </ul>
          </article>

          {/* Unit 2 */}
          <article className="curriculum-card">
            <div className="unit-badge">UNIT 2</div>
            <h3>Combinational & Sequential Circuits</h3>
            <ul>
              <li>
                <strong>Digital Decoders (3:8 & 5:32):</strong> Decoding parallel grip words into individual servo actuator drive lines.
              </li>
              <li>
                <strong>Multiplexing & Signal Routing:</strong> Switching between contactless optical tracking and differential sEMG bio-potential channels.
              </li>
              <li>
                <strong>Latching & State Registers:</strong> D flip-flop state preservation ensuring the prosthetic maintains its grip even if camera tracking momentarily drops.
              </li>
              <li>
                <strong>Bus Propagation Delay:</strong> Sub-15ms processing respecting electronic gate propagation constraints
                {liveLatency !== null ? (
                  <span style={{ marginLeft: 8, padding: "2px 7px", borderRadius: 4, background: "rgba(48, 209, 88, 0.15)", color: "#30D158", fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}>
                    Live: {liveLatency} ms inference latency
                  </span>
                ) : (
                  <span style={{ marginLeft: 8, padding: "2px 7px", borderRadius: 4, background: "rgba(255, 255, 255, 0.06)", color: "var(--text-tertiary)", fontSize: 11, fontFamily: "monospace" }}>
                    Live: —
                  </span>
                )}
                .
              </li>
            </ul>
          </article>

          {/* Unit 3 */}
          <article className="curriculum-card">
            <div className="unit-badge">UNIT 3</div>
            <h3>Microprocessor Architecture & Timers</h3>
            <ul>
              <li>
                <strong>16-Bit Timer/Counter 1 (Fast PWM):</strong> Operating in Mode 14 with <MathView math="ICR1 = 39999" inline /> on a 16 MHz clock (<MathView math="N = 8" inline />) for precise 50 Hz servo cycles.
              </li>
              <li>
                <strong>Pulse-Width Modulation (PWM):</strong> Output Compare Registers (OCR1A..OCR1E) continuously modulated from 1000 µs (0°) to 2000 µs (90°).
              </li>
              <li>
                <strong>10-Bit SAR Analog-to-Digital Converter:</strong> Digitizing fingertip Force-Sensing Resistors (FSR) with ADC0..ADC4 channels.
              </li>
              <li>
                <strong>Closed-Loop Interrupt Service Routines (ISR):</strong> Real-time hardware interrupts that clamp motor drive upon detecting payload rupture limits.
              </li>
            </ul>
          </article>
        </div>
      </section>

      {/* 5. QUANTITATIVE BENCHMARKS & SPECIFICATIONS */}
      <section id="benchmarks" className="benchmarks container">
        <div className="section-header">
          <p className="section-label">ENGINEERING BENCHMARKS</p>
          <h2>Technical Specifications & Comparative Analysis</h2>
          <p className="section-intro">
            Comparing FLEXORA's in-browser simulation architecture with leading commercial myoelectric and clinical bionic hands.
          </p>
        </div>

        <div className="benchmark-table-wrapper">
          <table className="benchmark-table">
            <thead>
              <tr>
                <th>System Parameter</th>
                <th className="highlight-col">FLEXORA Simulator</th>
                <th>Ottobock Michelangelo</th>
                <th>Open Bionics Hero Arm</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Pipeline Latency</strong></td>
                <td className="highlight-col">
                  <strong>&lt; 15 ms</strong> (Edge WASM + GPU)
                  <div style={{ marginTop: 6, fontSize: 11, color: liveLatency !== null ? "#30D158" : "var(--text-tertiary)", fontFamily: "monospace", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: liveLatency !== null ? "#30D158" : "var(--text-tertiary)", boxShadow: liveLatency !== null ? "0 0 6px #30D158" : "none" }}></span>
                    <span>
                      Live: <strong>{liveLatency !== null ? `${liveLatency} ms` : "—"}</strong> inference latency
                    </span>
                  </div>
                </td>
                <td>60 – 110 ms (Onboard DSP)</td>
                <td>80 – 140 ms (Myo Filter)</td>
              </tr>
              <tr>
                <td><strong>Degrees of Freedom (DoF)</strong></td>
                <td className="highlight-col"><strong>5 Continuous Channels</strong></td>
                <td>4 Active Degrees</td>
                <td>6 Multi-Grip Modes</td>
              </tr>
              <tr>
                <td><strong>Bio-Signal Telemetry</strong></td>
                <td className="highlight-col"><strong>Dual-Channel sEMG (RMS, MAV, SNR)</strong></td>
                <td>2-Site Differential sEMG</td>
                <td>2-Channel Surface EMG</td>
              </tr>
              <tr>
                <td><strong>Closed-Loop Force Feedback</strong></td>
                <td className="highlight-col"><strong>10-Bit ADC + PID Crush Guard</strong></td>
                <td>Axon-Bus Force Sensor</td>
                <td>Proportional Current Sensing</td>
              </tr>
              <tr>
                <td><strong>Microcontroller Interfacing</strong></td>
                <td className="highlight-col"><strong>PORTB GPIO Register + 50 Hz PWM</strong></td>
                <td>Proprietary Axon-Bus</td>
                <td>Custom STM32 Microcontroller</td>
              </tr>
              <tr>
                <td><strong>Hardware Cost / Accessibility</strong></td>
                <td className="highlight-col"><strong>$0 (Zero Setup, 100% In-Browser)</strong></td>
                <td>$35,000 – $70,000</td>
                <td>$12,000 – $20,000</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Benchmark Footnotes & Architectural Notes */}
        <div className="benchmark-footnotes">
          <div className="benchmark-note">
            <strong>* Architectural Comparison Note:</strong> Commercial clinical prosthetics (e.g., Ottobock Michelangelo and Open Bionics Hero Arm) are dedicated physical end-effector hardware systems engineered with onboard microprocessors, mechanical tendon linkages, and skin-interfaced sEMG electrodes. FLEXORA is an open-architecture browser-native digital robotics simulator designed to model their kinematic, digital bus, and tactile feedback principles without requiring high-cost physical hardware.
          </div>
          <div className="benchmark-sources">
            <strong>Sources & Industry Reference Standards:</strong>
            <ol>
              <li>Ottobock Michelangelo Axon-Bus Prosthetic System Technical Manual & Clinical Specifications (2022).</li>
              <li>Open Bionics Hero Arm Developer Documentation & Multi-Grip Actuator Datasheet (2023).</li>
              <li>Google MediaPipe Hand Landmark WASM Pipeline Real-Time Benchmark Whitepaper (GPU Delegate, 60 FPS).</li>
              <li>Microchip ATmega328P 8-bit AVR Microcontroller Datasheet (Section 16: 16-bit Timer/Counter1 with PWM).</li>
            </ol>
          </div>
        </div>
      </section>

      {/* 6. TECHNICAL FAQ ACCORDION */}
      <section id="faq" className="faq container">
        <div className="section-header">
          <p className="section-label">FREQUENTLY ASKED QUESTIONS</p>
          <h2>Engineering Principles & Methodology</h2>
          <p className="section-intro">
            Clear, straightforward explanations of the digital electronics, microprocessor interfacing, and biomechanics behind FLEXORA.
          </p>
        </div>

        <div className="faq-list">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className={`faq-item ${isOpen ? "open" : ""}`}
                onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
              >
                <div className="faq-question">
                  <h4>{item.q}</h4>
                  <span className="faq-icon">{isOpen ? "−" : "+"}</span>
                </div>
                {isOpen && <p className="faq-answer">{item.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. GET IN TOUCH / AFFILIATION */}
      <section id="contact" className="contact container">
        <p className="section-label">DEVELOPMENT & CONTACT</p>
        <h2>Interested in FLEXORA?</h2>
        <p className="section-intro">
          Developed as an open-architecture course project for Digital Electronics and Microprocessor (DEAM) at
          Vishwakarma Institute of Technology (VIT), Pune. Built by Pratik Gavkare.
        </p>

        <div className="contact-card-wrapper">
          {/* GitHub Repository Card (Full Width Horizontal) */}
          <a
            href="https://github.com/patricxGavkare/FLEXORA"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-github-card"
          >
            <div className="contact-github-left">
              <div className="contact-github-icon-box">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              </div>
              <div className="contact-github-info">
                <div className="contact-github-heading">
                  <span className="contact-github-title">patricxGavkare / FLEXORA</span>
                  <span className="contact-github-pill">Public Repository</span>
                </div>
                <p className="contact-github-desc">
                  Open-architecture bio-robotics simulator bridging computer vision, 5-bit microcontroller bus logic, and closed-loop tactile feedback.
                </p>
                <div className="contact-github-url">
                  github.com/patricxGavkare/FLEXORA
                </div>
              </div>
            </div>

            <div className="contact-github-action">
              <span className="contact-github-btn">
                View on GitHub
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </span>
            </div>
          </a>
        </div>

        <div className="hero-buttons" style={{ justifyContent: "center" }}>
          <a href="mailto:pratik.1251030135@vit.edu" className="primary-btn">
            Contact Developer
          </a>
          <a
            href="https://github.com/patricxGavkare/FLEXORA"
            target="_blank"
            rel="noopener noreferrer"
            className="secondary-btn"
          >
            Star on GitHub
          </a>
        </div>
      </section>
    </main>
  );
}