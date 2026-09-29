// =============================================================================
// Footer.jsx - Apple-Grade Minimalist Footer
// =============================================================================

import React from "react";
import "../styles/Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner container">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="footer-logo">FLEXORA</span>
            <p className="footer-tagline">
              Open-architecture bio-robotics simulator & DEAM microcontroller research platform.
            </p>
          </div>

          <div className="footer-nav">
            <a href="#home">Home</a>
            <a href="#demo">Workstation</a>
            <a href="#architecture">Architecture</a>
            <a href="#curriculum">DEAM Specs</a>
            <a href="#benchmarks">Benchmarks</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">
            © 2026 FLEXORA • Department of Electronics & Computer Engineering • VIT Pune
          </p>
        </div>
      </div>
    </footer>
  );
}