import "../styles/Home.css";
import HandTracker from "../components/HandTracker";

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <section id="home" className="hero container">
        <div className="hero-content">
          <p className="section-label">FLEXORA</p>
          <h1>
            Smart prosthetic
            <br />
            movement, made accessible.
          </h1>
          <p className="hero-description">
            FLEXORA is an AI-based smart prosthetic hand simulator. Move your
            hand in front of your camera and watch a virtual prosthetic hand
            respond in real time.
          </p>
          <div className="hero-buttons">
            <a href="#demo" className="primary-btn">Try the Demo</a>
            <a href="#features" className="secondary-btn">Learn More</a>
          </div>
        </div>
      </section>

      {/* LIVE DEMO */}
      <section id="demo" className="demo container">
        <p className="section-label">LIVE DEMO</p>
        <h2>See it in action</h2>
        <p className="section-intro">
          Allow camera access below. FLEXORA tracks your hand and mirrors
          your finger movements onto a virtual prosthetic hand.
        </p>
        <div className="demo-frame">
          <HandTracker />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="features container">
        <p className="section-label">OUR APPROACH</p>
        <h2>Intelligent. Accessible. Human-focused.</h2>

        <div className="features-grid">
          <article className="feature-card">
            <h3>Real-Time Tracking</h3>
            <p>
              Computer vision detects 21 points on your hand instantly,
              through nothing more than a standard webcam.
            </p>
          </article>

          <article className="feature-card">
            <h3>Gesture Recognition</h3>
            <p>
              Custom logic interprets finger positions — bent or straight —
              to understand your hand's shape in real time.
            </p>
          </article>

          <article className="feature-card">
            <h3>Virtual Prosthetic Hand</h3>
            <p>
              A responsive on-screen hand mirrors your movement, simulating
              how a real prosthetic device could respond to control signals.
            </p>
          </article>

          <article className="feature-card">
            <h3>Software-First Design</h3>
            <p>
              No hardware required. FLEXORA runs entirely in the browser,
              making experimentation accessible to anyone.
            </p>
          </article>

          <article className="feature-card">
            <h3>Modular Foundation</h3>
            <p>
              Built so future input types — EMG, motion sensors, or voice —
              can plug into the same movement pipeline.
            </p>
          </article>

          <article className="feature-card">
            <h3>Built for Research</h3>
            <p>
              Designed as a foundation for comparing AI-based control
              approaches before physical hardware integration.
            </p>
          </article>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="about container">
        <div className="about-grid">
          <div>
            <p className="section-label">ABOUT THE PROJECT</p>
            <h2>Why FLEXORA exists</h2>
          </div>
          <div>
            <p>
              Advanced prosthetic hands involve complex control systems,
              sensors, and expensive hardware — putting real experimentation
              out of reach for most students and beginners.
            </p>
            <p>
              FLEXORA is a software-first simulation platform that lets
              prosthetic movement and control concepts be explored before
              any sensor or physical hardware is involved.
            </p>
            <p>
              What you see running here is the current implementation — a
              real, working camera-based control pipeline. Future stages
              will expand into EMG signals, motion sensors, and eventually
              physical hardware integration.
            </p>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="contact container">
        <p className="section-label">GET IN TOUCH</p>
        <h2>Interested in FLEXORA?</h2>
        <p className="section-intro">
          This project is under active development as part of an engineering
          course. Reach out with questions, feedback, or collaboration ideas.
        </p>
        <a href="mailto:your-pratik.1251030135@vit.edu" className="primary-btn">
          Contact Us
        </a>
      </section>
    </main>
  );
}