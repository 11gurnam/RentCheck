import { Brand } from "@/components/ui/brand";
import { SiteHeader } from "@/components/ui/site-header";

const principles = [
  {
    number: "01",
    title: "The place, and the people.",
    text: "Separate property and landlord ratings help you understand the home and how it is managed.",
  },
  {
    number: "02",
    title: "Experiences with context.",
    text: "Tenancy dates, rent paid and current or former tenant status give each review a clearer picture.",
  },
  {
    number: "03",
    title: "Your next move, considered.",
    text: "Compare localities, accommodation types and budgets, then keep a shortlist of places to research.",
  },
];

function NeighbourhoodIllustration() {
  return (
    <svg
      className="city-art"
      viewBox="0 0 640 460"
      role="img"
      aria-labelledby="city-title"
    >
      <title id="city-title">
        Illustration of neighbourhood homes in India
      </title>
      <rect width="640" height="460" fill="#f0e9dc" />
      <circle cx="495" cy="103" r="57" fill="#e3bb76" />
      <path
        d="M0 316 Q100 269 213 313 T430 303 T640 302 V460 H0Z"
        fill="#d5d8c5"
      />
      <g fill="#cf8069" stroke="#b56854" strokeWidth="2">
        <path d="M172 359V166h34v-36l23-23 23 23v36h32v-53l25-25 25 25v53h32v-36l23-23 23 23v36h34v193Z" />
        <path d="M159 166h300v17H159Z" fill="#e3a58a" />
      </g>
      <g fill="#f0c0a1">
        <path d="M202 359v-70q27-42 54 0v70Z" />
        <path d="M282 359v-82q27-44 54 0v82Z" />
        <path d="M362 359v-70q27-42 54 0v70Z" />
      </g>
      <g fill="#7c5750">
        {[209, 289, 369].map((x) => (
          <g key={x}>
            <path d={`M${x} 226v-22q20-33 40 0v22Z`} />
            <path d={`M${x + 6} 159v-15q14-23 28 0v15Z`} />
          </g>
        ))}
      </g>
      <path d="M49 364V264h94v100Z" fill="#f5dfbd" />
      <path d="M39 264l57-40 57 40Z" fill="#b8795e" />
      <path d="M70 364v-50h29v50M111 282h18v22" fill="#73847a" />
      <path d="M465 364V239h125v125Z" fill="#e0bf87" />
      <path d="M457 229h141v15H457Z" fill="#8c9a85" />
      <path
        d="M484 261h27v36h-27ZM546 261h27v36h-27ZM513 364v-46h29v46Z"
        fill="#6c8178"
      />
      <path d="M0 366H640V460H0Z" fill="#e3d7c2" />
      <path d="M244 460l50-94h33l70 94Z" fill="#f7efdf" />
      <g stroke="#6f826c" strokeWidth="8">
        <path d="M31 381v-90M612 388v-83" />
      </g>
      <g fill="#879b7e">
        <ellipse cx="31" cy="292" rx="29" ry="42" />
        <ellipse cx="612" cy="298" rx="31" ry="45" />
      </g>
      <path d="M81 406h103M445 409h112" stroke="#c9b99c" strokeWidth="3" />
    </svg>
  );
}

export function Introduction() {
  return (
    <div id="top">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader home />
      <main id="main">
        <section className="hero shell" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> A MORE INFORMED MOVE · INDIA
            </p>
            <h1 id="hero-heading">
              A little more clarity
              <br />
              before you <em>move.</em>
            </h1>
            <p className="hero-description">
              The photos show you the space. Tenant experiences help you
              understand what it’s like to live there.
            </p>
            <p className="hero-detail">
              Get to know flats, houses, PGs and hostels across India — and the
              people who manage them.
            </p>
            <a className="primary-link" href="#how-it-works">
              Get to know RentCheck <span aria-hidden="true">↗</span>
            </a>
            <p className="availability">
              An early prototype. Explore synthetic accommodation across India.
              {" "}<a href="/search">Explore accommodation →</a>
            </p>
          </div>
          <div className="hero-visual">
            <div className="illustration-frame">
              <div className="illustration-caption">
                <span>ACROSS INDIA</span>
                <span>NEIGHBOURHOODS & HOMES</span>
              </div>
              <NeighbourhoodIllustration />
              <div className="illustration-bottom">
                <span>Find your place. Feel informed.</span>
                <span aria-hidden="true">✳</span>
              </div>
            </div>
            <div className="visual-note">
              <span className="note-icon" aria-hidden="true">
                ⌂
              </span>
              <div>
                <strong>A home is more than an address.</strong>
                <span>
                  A neighbourhood. A landlord. An everyday experience.
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="scope-strip" aria-label="Accommodation types">
          <div className="shell">
            <p>
              Different spaces.
              <br />
              <strong>The same need for clarity.</strong>
            </p>
            <ul>
              <li>Flats</li>
              <li>Houses</li>
              <li>PGs</li>
              <li>Hostels</li>
            </ul>
          </div>
        </section>
        <section
          className="how-section shell"
          id="how-it-works"
          aria-labelledby="how-heading"
        >
          <div className="section-heading">
            <p className="eyebrow">BUILT AROUND TENANT EXPERIENCES</p>
            <h2 id="how-heading">
              Know a little more.
              <br />
              Choose a little better.
            </h2>
            <p>
              RentCheck is being built to bring the details that matter into one
              place, before you decide where to live.
            </p>
          </div>
          <div className="principle-grid">
            {principles.map((item) => (
              <article className="principle" key={item.number}>
                <span className="step-number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section
          className="trust-section shell"
          id="our-principles"
          aria-labelledby="trust-heading"
        >
          <div>
            <p className="eyebrow">CLARITY, WITH CARE</p>
            <h2 id="trust-heading">
              Real context.
              <br />
              Respect for your privacy.
            </h2>
          </div>
          <div className="trust-copy">
            <p>
              Reviews will use public aliases. Account identities, emails and
              rental documents will stay private.
            </p>
            <p>
              Women’s recommendations will reflect eligible verified tenant
              responses, with visible counts. They are tenant recommendations,
              never a platform safety guarantee.
            </p>
            <div className="demo-notice">
              <strong>About this prototype</strong>
              <p>
                Future sample properties, reviews and documents will be
                synthetic. Verification and claim approvals will be clearly
                labelled demonstrations.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer shell">
        <Brand href="#top" />
        <p>Made for a more informed move.</p>
        <span>India · Early prototype</span>
      </footer>
    </div>
  );
}
