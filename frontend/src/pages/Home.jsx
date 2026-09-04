import "../styles/Home.css";
import HandTracker from "../components/HandTracker";

function Home() {
  return (
    <main id="home">
      <section className="hero">
        <div className="hero-content">
          <p className="section-label">FLEXORA</p>

          <h1>
            Smart prosthetic
            <br />
            movement, made accessible.
          </h1>

          <p className="hero-description">
            FLEXORA is an AI-based smart prosthetic hand simulator designed
            to demonstrate intelligent movement, control, and accessibility.
          </p>

          <div className="hero-buttons">
            <button className="primary-btn">Explore FLEXORA</button>
            <button className="secondary-btn">View Project</button>
          </div>
        </div>

        <div className="hero-visual">
          <HandTracker />
          </div>
      </section>

      <section className="principles">
        <p className="section-label">OUR APPROACH</p>

        <h2>Intelligent. Accessible. Human-focused.</h2>

        <div className="principles-grid">
          <article>
            <h3>Smart Control</h3>
            <p>
              AI-assisted interaction designed to simulate natural and
              responsive prosthetic hand movements.
            </p>
          </article>

          <article>
            <h3>Accessible Design</h3>
            <p>
              A simple and approachable platform focused on understanding
              prosthetic technology and its possibilities.
            </p>
          </article>

          <article>
            <h3>Human Focus</h3>
            <p>
              Built around the idea that intelligent technology should support
              people through practical and meaningful interaction.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}

export default Home;