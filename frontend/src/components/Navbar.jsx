// =============================================================================
// Navbar.jsx - Apple-Style Frosted Glass Header with Scroll-Spy & Mobile Menu
// =============================================================================

import React, { useState, useEffect } from "react";
import "../styles/Navbar.css";

const NAV_LINKS = [
  { href: "#home", label: "Home", id: "home" },
  { href: "#demo", label: "Workstation", id: "demo" },
  { href: "#architecture", label: "Architecture", id: "architecture" },
  { href: "#curriculum", label: "DEAM Specs", id: "curriculum" },
  { href: "#benchmarks", label: "Benchmarks", id: "benchmarks" },
  { href: "#faq", label: "FAQ", id: "faq" },
  { href: "#contact", label: "Contact", id: "contact" },
];

export default function Navbar() {
  const [activeSection, setActiveSection] = useState("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Scroll-Spy: detect which section is currently active in viewport
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const sectionIds = NAV_LINKS.map((link) => link.id);

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop - 120;
          if (scrollY >= top) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-inner container">
        {/* Brand Logo */}
        <a href="#home" className="navbar-logo" onClick={() => setIsMobileMenuOpen(false)}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 8px var(--accent)",
              display: "inline-block",
            }}
          />
          FLEXORA
        </a>

        {/* Desktop Navigation Links with Scroll-Spy */}
        <div className="navbar-links">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className={activeSection === link.id ? "active" : ""}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          className="navbar-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
        >
          <span style={{ transform: isMobileMenuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
          <span style={{ opacity: isMobileMenuOpen ? 0 : 1 }} />
          <span style={{ transform: isMobileMenuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="navbar-mobile-menu">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className={activeSection === link.id ? "active" : ""}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}