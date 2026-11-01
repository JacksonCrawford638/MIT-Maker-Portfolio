// Quote module — 10 aerial services + custom path

// ── Quote submission helpers ──────────────────────────────────
// Used by every flow's review screen to write the brief into Firestore.
// The /quotes collection is gated by rules:
//   - signed-in clients can CREATE only
//   - admins (admin custom claim) read / update / delete
// Each flow passes its service id; we sniff name/email out of common
// brief fields with auth-record fallbacks so the inbox always has a
// person attached.
const submitQuoteBrief = async ({ service, brief }) => {
  const fb = window.fb;
  if (!fb) throw new Error("Firebase isn't ready yet.");
  const user = fb.auth && fb.auth.currentUser;

  const name  = brief.contactName || brief.name      || (user && user.displayName) || null;
  const email = brief.email       || brief.contactEmail || (user && user.email)    || null;

  const payload = {
    service,
    brief,
    status: "new",
    createdAt: fb.serverTimestamp(),
  };
  if (user && user.uid) payload.submitterUid   = user.uid;
  if (name)             payload.submitterName  = name;
  if (email)            payload.submitterEmail = email;

  await fb.addDoc(fb.collection(fb.db, "quotes"), payload);
};

// Shared review-screen submit row. Drops in where every flow used to
// have its own q-nav + submit button. Manages submitting / success /
// error state inline so each flow doesn't need to thread its own.
const BriefSubmitNav = ({
  service,
  brief,
  onBack,
  sendLabel = "Send brief → We reply in 1 business day",
  successMessage = "We'll come back within one business day. Thanks for the detail.",
}) => {
  const [state, setState] = React.useState("idle"); // idle | submitting | submitted
  const [error, setError] = React.useState(null);

  const submit = async () => {
    setState("submitting");
    setError(null);
    try {
      await submitQuoteBrief({ service, brief });
      setState("submitted");
    } catch (err) {
      console.error("Quote submit failed:", err);
      setError(
        (err && err.message) ||
        "Couldn't send the brief. Check your connection and try again."
      );
      setState("idle");
    }
  };

  if (state === "submitted") {
    return (
      <div className="q-submitted">
        <span className="q-submitted-mark"><Icon name="check" size={18} /></span>
        <div>
          <h4>Brief sent</h4>
          <p>{successMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <React.Fragment>
      {error && <div className="q-submit-error">{error}</div>}
      <div className="q-nav">
        <button
          className="btn ghost"
          onClick={onBack}
          disabled={state === "submitting"}
        >
          Back
        </button>
        <button
          className="btn primary"
          onClick={submit}
          disabled={state === "submitting"}
        >
          {state === "submitting" ? "Sending…" : sendLabel}
        </button>
      </div>
      <p style={{ marginTop: 12, fontSize: 12, color: "var(--fg-mute)" }}>
        By sending your brief, you agree to our{" "}
        <a href="privacy.html" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>Privacy Policy</a>.
      </p>
    </React.Fragment>
  );
};

const SHOOT_TYPES = [
  {
    id: "promotional-videos",
    index: "01",
    title: "Aerial Promotional Videos",
    desc: "30–90 second branded films that make your business look its best from the air. Web, ads, and social.",
    tags: ["Video", "Branded", "Social"],
    glyph: "video",
  },
  {
    // Hidden from the public picker until the right lens is in hand.
    // Flow code below is kept intact; remove `hidden` to re-offer it.
    hidden: true,
    id: "real-estate",
    index: "02",
    title: "Real Estate Media",
    desc: "Aerial listing photos and overview videos that sell residential and commercial property faster.",
    tags: ["Video", "Photo", "Listings"],
    glyph: "pin",
  },
  {
    id: "fpv-fly-throughs",
    index: "02",
    title: "FPV Fly-Throughs",
    desc: "One-take cinematic flights straight through your space — indoors or out. Our most unique service.",
    tags: ["FPV", "One-take", "Indoor"],
    glyph: "spark",
  },
  {
    id: "construction",
    index: "03",
    title: "Construction Documentation",
    desc: "Progress tracking and contractor marketing — from groundbreaking to ribbon-cutting.",
    tags: ["Progress", "Marketing", "B2B"],
    glyph: "grid",
  },
  {
    id: "property-documentation",
    index: "04",
    title: "Property Documentation",
    desc: "Aerial coverage of large parcels — farms, hunting land, recreational acreage, and rural estates.",
    tags: ["Photo", "Land", "Boundary"],
    glyph: "square",
  },
  {
    id: "tourism",
    index: "05",
    title: "Tourism & Community",
    desc: "Highlight reels and promotional aerials for downtowns, parks, and tourism organizations.",
    tags: ["Video", "Community", "Promo"],
    glyph: "star",
  },
  {
    // Hidden from the public picker — no event-coverage portfolio yet.
    // Flow code below is kept intact; remove `hidden` to re-offer it.
    hidden: true,
    id: "events",
    index: "07",
    title: "Event Coverage",
    desc: "Highlight reels, social clips, and aerial photography for festivals, fairs, and gatherings.",
    tags: ["Video", "Photo", "Events"],
    glyph: "cal",
  },
  {
    id: "drone-photography",
    index: "06",
    title: "Drone Photography",
    desc: "Crisp, high-resolution aerial stills for websites, marketing, and facilities. No edit required.",
    tags: ["Photo", "Stills", "Marketing"],
    glyph: "image",
  },
];

const ShootCard = ({ shoot, onPick }) => (
  <button className="shoot-card" onClick={() => onPick(shoot.id)}>
    <div>
      <div className="index">{shoot.index} / SERVICE</div>
      <h3>{shoot.title}</h3>
      <p>{shoot.desc}</p>
      <div className="tags">
        {shoot.tags.map(t => <span key={t} className="tag">{t}</span>)}
      </div>
    </div>
    <div className="viz">
      <Icon name={shoot.glyph} size={56} />
    </div>
  </button>
);

const ShootDetail = ({ shoot, onBack }) => {
  if (shoot.id === "real-estate") {
    return <RealEstateFlow shoot={shoot} onBack={onBack} />;
  }
  if (shoot.id === "promotional-videos") {
    return <PromotionalFlow shoot={shoot} onBack={onBack} />;
  }
  if (shoot.id === "fpv-fly-throughs") {
    return <FPVFlow shoot={shoot} onBack={onBack} />;
  }
  if (shoot.id === "construction") {
    return <ConstructionFlow shoot={shoot} onBack={onBack} />;
  }
  if (shoot.id === "property-documentation") {
    return <PropertyDocFlow shoot={shoot} onBack={onBack} />;
  }
  if (shoot.id === "tourism") {
    return <TourismFlow shoot={shoot} onBack={onBack} />;
  }
  if (shoot.id === "events") {
    return <EventFlow shoot={shoot} onBack={onBack} />;
  }
  if (shoot.id === "drone-photography") {
    return <DronePhotographyFlow shoot={shoot} onBack={onBack} />;
  }
  // Fallback: should never hit in production. If a new shoot id is added
  // to SHOOT_TYPES without a flow handler above, surface a clear message
  // rather than the disabled placeholder UI we used to ship.
  return (
    <div>
      <div className="back-link" onClick={onBack}>
        <Icon name="back" size={12} /> Back to services
      </div>
      <div className="shoot-detail-header" style={{ marginTop: 14 }}>
        <h2>{shoot.title}</h2>
        <span className="eyebrow">{shoot.index} · NOT YET WIRED UP</span>
      </div>
      <p style={{ marginTop: 16, color: "var(--fg-dim)" }}>
        This service doesn't have an in-portal brief flow yet. Email us at{" "}
        <a href="mailto:hello@spandstudio.com" style={{ color: "var(--accent)" }}>
          hello@spandstudio.com
        </a>{" "}
        and we'll get back to you within one business day.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button className="btn ghost" onClick={onBack}>Back to services</button>
      </div>
    </div>
  );
};

/* ---------- Real Estate Quoting Flow ---------- */

const REAL_ESTATE_TYPES = [
  {
    id: "homes",
    index: "01",
    title: "Homes",
    desc: "Single-family residences, luxury homes, and large-lot listings. Photography, aerials, and tours for residential agents.",
    tags: ["Residential", "Listings", "Tours"],
    glyph: "pin",
  },
  {
    id: "land",
    index: "02",
    title: "Land Parcels",
    desc: "Acreage, farms, hunting land, and rural property. Aerial coverage, 3D scans, and plant health analysis.",
    tags: ["Acreage", "Aerial", "Mapping"],
    glyph: "square",
  },
  {
    id: "commercial",
    index: "03",
    title: "Commercial Real Estate",
    desc: "Custom scopes for commercial listings, multi-channel marketing, and large-format properties.",
    tags: ["Commercial", "Custom", "Multi-channel"],
    glyph: "grid",
  },
];

const HOMES_SERVICES = [
  { id: "photography", title: "Photography", desc: "Interior and exterior listing photos, color-corrected and ready for MLS.", custom: false },
  { id: "aerial-photo", title: "Aerial Photography", desc: "Standard drone stills of the property — exterior, lot, and approach.", custom: false },
  { id: "gimbal-tour", title: "Gimbal Tour", desc: "Smooth handheld walking tour through the home. Cinematic, room-to-room.", custom: true },
  { id: "fpv-tour", title: "FPV Tour", desc: "One-take FPV fly-through that threads doorways and reveals the whole house.", custom: true },
  { id: "3d-tour", title: "3D Tour", desc: "Interactive 3D walkthrough buyers can navigate on their own.", custom: false },
];

const LAND_SERVICES = [
  { id: "aerial-photo", title: "Aerial Photos", desc: "High-resolution stills covering the full parcel and its key features.", custom: false },
  { id: "3d-scan", title: "3D Scan", desc: "Photogrammetric scan of the parcel — terrain, structures, and boundaries.", custom: false },
  { id: "plant-health", title: "Plant Health Scan", desc: "Multispectral imaging to map crop health, irrigation, and stress areas.", custom: false },
];

const COMMERCIAL_KINDS = [
  "Retail",
  "Office",
  "Industrial",
  "Warehouse",
  "Mixed-use",
  "Hospitality",
  "Multi-family",
  "Medical",
  "Restaurant",
  "Land / development site",
  "Other",
];

const COMMERCIAL_FEATURES = [
  "Loading docks",
  "Drive-thru",
  "Storefront / signage",
  "Large parking lot",
  "Rooftop deck",
  "Outdoor patio",
  "Anchor tenant space",
  "Industrial yard",
  "Cold storage",
  "Frontage / road visibility",
  "Recent renovation",
  "Twilight / dusk shot",
];

const COMMERCIAL_USE_CASES = [
  "LoopNet / CoStar listing",
  "Zillow / Realtor.com",
  "Brokerage website",
  "Lease marketing",
  "Sale marketing",
  "Investor pitch deck",
  "Social media (Reels / LinkedIn)",
  "YouTube property tour",
  "Email / newsletter",
  "Trade show / leasing event",
  "Brand awareness",
  "Tenant recruitment",
];

const TypeCard = ({ type, onPick }) => (
  <button className="shoot-card" onClick={() => onPick(type.id)}>
    <div>
      <div className="index">{type.index} / PROPERTY TYPE</div>
      <h3>{type.title}</h3>
      <p>{type.desc}</p>
      <div className="tags">
        {type.tags.map(t => <span key={t} className="tag">{t}</span>)}
      </div>
    </div>
    <div className="viz">
      <Icon name={type.glyph} size={56} />
    </div>
  </button>
);

const RealEstateFlow = ({ shoot, onBack }) => {
  const [step, setStep] = React.useState("type"); // type | service | brief
  const [propertyType, setPropertyType] = React.useState(null);
  const [selectedServices, setSelectedServices] = React.useState([]);

  // brief fields
  const [address, setAddress] = React.useState("");
  const [secondaryAddress, setSecondaryAddress] = React.useState("");
  const [propertyKind, setPropertyKind] = React.useState("");
  const [occupancy, setOccupancy] = React.useState("");
  const [sqft, setSqft] = React.useState("");
  const [beds, setBeds] = React.useState("");
  const [floors, setFloors] = React.useState("");
  const [brokerage, setBrokerage] = React.useState("");
  const [features, setFeatures] = React.useState([]);
  const [featuresOther, setFeaturesOther] = React.useState("");
  const [acres, setAcres] = React.useState("");
  const [cropType, setCropType] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");
  const [contactName, setContactName] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [customBrief, setCustomBrief] = React.useState("");
  const [useCases, setUseCases] = React.useState([]);

  const toggleFeature = (v) => {
    setFeatures(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v]);
  };

  const serviceList =
    propertyType === "homes" ? HOMES_SERVICES :
    propertyType === "land" ? LAND_SERVICES : [];

  const toggleService = (id) => {
    setSelectedServices(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };
  const toggleUseCase = (v) => {
    setUseCases(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v]);
  };

  // Commercial is always custom; Homes>gimbal/fpv are custom; everything else is structured
  const goingCustom =
    propertyType === "commercial" ||
    (propertyType === "homes" && selectedServices.some(id => {
      const svc = HOMES_SERVICES.find(s => s.id === id);
      return svc && svc.custom;
    }));

  const goBackOneStep = () => {
    if (step === "brief") setStep("service");
    else if (step === "service") { setStep("type"); setSelectedServices([]); }
    else onBack();
  };

  /* ---------- STEP 1: Property type ---------- */
  if (step === "type") {
    return (
      <div>
        <div className="back-link" onClick={onBack}>
          <Icon name="back" size={12} /> Back to services
        </div>
        <div className="shoot-detail-header" style={{ marginTop: 14 }}>
          <h2>{shoot.title}</h2>
          <span className="eyebrow">{shoot.index} · STEP 02 — Property type</span>
        </div>
        <p style={{ color: "var(--fg-dim)", fontSize: 14, maxWidth: "62ch", margin: "0 0 24px" }}>
          What kind of property are we shooting? Pick the closest fit — we'll dial in the specifics next.
        </p>
        <div className="shoot-grid">
          {REAL_ESTATE_TYPES.map(t => (
            <TypeCard
              key={t.id}
              type={t}
              onPick={(id) => {
                setPropertyType(id);
                setStep(id === "commercial" ? "brief" : "service");
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ---------- STEP 2: Service pick (homes / land) ---------- */
  if (step === "service") {
    const typeMeta = REAL_ESTATE_TYPES.find(t => t.id === propertyType);
    return (
      <div>
        <div className="back-link" onClick={goBackOneStep}>
          <Icon name="back" size={12} /> Back to property type
        </div>
        <div className="shoot-detail-header" style={{ marginTop: 14 }}>
          <h2>{typeMeta.title}</h2>
          <span className="eyebrow">{shoot.index} · STEP 03 — Pick services</span>
        </div>
        <p style={{ color: "var(--fg-dim)", fontSize: 14, maxWidth: "62ch", margin: "0 0 24px" }}>
          Choose one or more. Combine services in a single visit and we'll bundle the pricing.
        </p>

        <div className="shoot-grid">
          {serviceList.map((svc, i) => {
            const selected = selectedServices.includes(svc.id);
            return (
              <button
                key={svc.id}
                className={`shoot-card${selected ? " selected" : ""}`}
                onClick={() => toggleService(svc.id)}
              >
                <div>
                  <div className="index">
                    {String(i + 1).padStart(2, "0")} / SERVICE
                    {svc.custom ? " · CUSTOM" : ""}
                  </div>
                  <h3>{svc.title}</h3>
                  <p>{svc.desc}</p>
                </div>
                <div className="viz">
                  <Icon name={selected ? "check" : "plus"} size={40} />
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="btn ghost" onClick={goBackOneStep}>Back</button>
          <button
            className="btn primary"
            disabled={selectedServices.length === 0}
            style={selectedServices.length === 0 ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            onClick={() => setStep("brief")}
          >
            Continue → {goingCustom ? "Custom brief" : "Project details"}
          </button>
        </div>
      </div>
    );
  }

  /* ---------- STEP 3: Brief ---------- */
  const typeMeta = REAL_ESTATE_TYPES.find(t => t.id === propertyType);
  const selectedServiceTitles = serviceList
    .filter(s => selectedServices.includes(s.id))
    .map(s => s.title);

  // Commercial brief — step-by-step questionnaire (CommercialFlow) so it
  // feels less overwhelming than a single long form.
  if (propertyType === "commercial") {
    return <CommercialFlow shoot={shoot} onBack={goBackOneStep} />;
  }

  // Custom brief route for homes when gimbal/fpv selected — minimal capture
  if (goingCustom) {
    return (
      <div>
        <div className="back-link" onClick={goBackOneStep}>
          <Icon name="back" size={12} /> Back to services
        </div>
        <div className="shoot-detail-header" style={{ marginTop: 14 }}>
          <h2>{typeMeta.title} · Quick Start</h2>
          <span className="eyebrow">{shoot.index} · STEP 04 — Quick start</span>
        </div>
        <p style={{ color: "var(--fg-dim)", fontSize: 14, maxWidth: "62ch", margin: "0 0 8px" }}>
          You picked: <strong style={{ color: "var(--fg)" }}>{selectedServiceTitles.join(", ")}</strong>.
        </p>
        <p style={{ color: "var(--fg-dim)", fontSize: 14, maxWidth: "62ch", margin: "0 0 24px" }}>
          Gimbal and FPV tours are scoped per-property. Just give us the basics — we'll <strong style={{ color: "var(--fg)" }}>reach out to walk through the details</strong> instead of making you fill out a long form.
        </p>

        <div className="form-row">
          <label>Property address</label>
          <input
            className="input"
            type="text"
            placeholder="Street address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>One-line description (optional)</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. 4BR new build, want a hero FPV walk-through for Zillow"
            value={customBrief}
            onChange={(e) => setCustomBrief(e.target.value)}
          />
        </div>

        <ContactBlock
          contactName={contactName} setContactName={setContactName}
          contactEmail={contactEmail} setContactEmail={setContactEmail}
          contactPhone={contactPhone} setContactPhone={setContactPhone}
          brokerage={brokerage} setBrokerage={setBrokerage}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className="btn ghost" onClick={goBackOneStep}>Back</button>
          <button className="btn primary">Send → We'll reach out within 1 business day</button>
        </div>
      </div>
    );
  }

  // Structured brief — homes (photography/aerial/3d) or land
  return (
    <div>
      <div className="back-link" onClick={goBackOneStep}>
        <Icon name="back" size={12} /> Back to services
      </div>
      <div className="shoot-detail-header" style={{ marginTop: 14 }}>
        <h2>{typeMeta.title} · Project Details</h2>
        <span className="eyebrow">{shoot.index} · STEP 04 — Details</span>
      </div>
      <p style={{ color: "var(--fg-dim)", fontSize: 14, maxWidth: "62ch", margin: "0 0 8px" }}>
        Selected: <strong style={{ color: "var(--fg)" }}>{selectedServiceTitles.join(", ")}</strong>.
      </p>
      <p style={{ color: "var(--fg-dim)", fontSize: 14, maxWidth: "62ch", margin: "0 0 24px" }}>
        A few quick details and we'll send back a written estimate.
      </p>

      <div className="form-row">
        <label>{propertyType === "land" ? "Parcel location" : "Property address"}</label>
        <input
          className="input"
          type="text"
          placeholder={propertyType === "land" ? "Nearest cross-streets or parcel ID" : "Street address"}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>Secondary address (if needed)</label>
        <input
          className="input"
          type="text"
          placeholder="Second unit, adjacent lot, gate entry, etc."
          value={secondaryAddress}
          onChange={(e) => setSecondaryAddress(e.target.value)}
        />
      </div>

      {propertyType === "homes" && (
        <React.Fragment>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div className="form-row">
              <label>Type of property</label>
              <select className="select" value={propertyKind} onChange={(e) => setPropertyKind(e.target.value)}>
                <option value="">Select…</option>
                <option>House</option>
                <option>Condo</option>
                <option>Apartment</option>
                <option>Townhouse</option>
                <option>Other</option>
              </select>
            </div>
            <div className="form-row">
              <label>Vacant or occupied?</label>
              <div className="chips">
                {["Vacant", "Occupied"].map(v => (
                  <button
                    key={v}
                    className={`chip ${occupancy === v ? "active" : ""}`}
                    onClick={() => setOccupancy(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
            <div className="form-row">
              <label>Square footage</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. 2,400"
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label>Floors</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. 2"
                value={floors}
                onChange={(e) => setFloors(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label>Bedrooms</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. 3"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <label>Anything special to capture?</label>
            <div className="chips">
              {[
                "Pool",
                "Waterfront",
                "Pole barn",
                "Large garage",
                "Finished basement",
                "New kitchen",
                "Solar panels",
                "Hunting land",
                "Workshop",
                "Commercial loading docks",
              ].map(f => (
                <button
                  key={f}
                  className={`chip ${features.includes(f) ? "active" : ""}`}
                  onClick={() => toggleFeature(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            <input
              className="input"
              type="text"
              placeholder="Other features — type and comma-separate"
              value={featuresOther}
              onChange={(e) => setFeaturesOther(e.target.value)}
              style={{ marginTop: 10 }}
            />
          </div>
        </React.Fragment>
      )}

      {propertyType === "land" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Acreage</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. 80 acres"
              value={acres}
              onChange={(e) => setAcres(e.target.value)}
            />
          </div>
          {selectedServices.includes("plant-health") && (
            <div className="form-row">
              <label>Crop / vegetation type</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. corn, soybeans, vineyard"
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      <div className="form-row">
        <label>Target shoot date</label>
        <input
          className="input"
          type="text"
          placeholder="e.g. June 18 or 'next 2 weeks'"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>Anything else we should know?</label>
        <textarea
          className="textarea"
          placeholder="Access notes, gate codes, deadlines, twilight shoot preferred, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ minHeight: 100 }}
        />
      </div>

      <ContactBlock
        contactName={contactName} setContactName={setContactName}
        contactEmail={contactEmail} setContactEmail={setContactEmail}
        contactPhone={contactPhone} setContactPhone={setContactPhone}
        brokerage={brokerage} setBrokerage={setBrokerage}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button className="btn ghost" onClick={goBackOneStep}>Back</button>
        <button className="btn primary">Send → Get my estimate</button>
      </div>
    </div>
  );
};

/* ---------- Commercial Real Estate Flow (multi-step) ---------- */
// Mirrors the PromotionalFlow pattern: one focused question per screen
// so a commercial brief doesn't feel like a wall of fields. Property
// detail steps come from the homes flow; goal steps come from
// the promo flow.
const CommercialFlow = ({ shoot, onBack }) => {
  const [step, setStep] = React.useState(1);
  const TOTAL = 5;

  const [brief, setBrief] = React.useState({
    contactName: "",
    brokerage: "",
    email: "",
    phone: "",
    address: "",
    secondaryAddress: "",
    propertyKind: "",
    occupancy: "",
    sqft: "",
    floors: "",
    units: "",
    features: [],
    featuresOther: "",
    about: "",
    useCases: [],
    targetDate: "",
    notes: "",
  });

  const update = (patch) => setBrief(b => ({ ...b, ...patch }));
  const toggleList = (key, value) =>
    setBrief(b => ({
      ...b,
      [key]: b[key].includes(value) ? b[key].filter(x => x !== value) : [...b[key], value],
    }));

  const goPrev = () => (step === 1 ? onBack() : setStep(s => s - 1));
  const goNext = () => setStep(s => Math.min(TOTAL + 1, s + 1));

  const canAdvance = (() => {
    if (step === 1) return brief.contactName.trim() && brief.email.trim() && brief.address.trim();
    if (step === 2) return brief.propertyKind !== "";
    if (step === 3) return true;
    if (step === 4) return brief.useCases.length > 0;
    if (step === 5) return true;
    return true;
  })();

  /* ---------- STEP 1: Contact + address ---------- */
  if (step === 1) {
    return (
      <QStep
        shoot={shoot}
        stepNum={1} totalSteps={TOTAL}
        eyebrow="STEP 03 — Your details"
        question="First, the basics."
        helper="Who you are, how to reach you, and where the property lives. We'll never share any of this."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Your name</label>
            <input
              className="input"
              type="text"
              placeholder="First and last"
              value={brief.contactName}
              onChange={(e) => update({ contactName: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Brokerage <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="text"
              placeholder="Company / brokerage name"
              value={brief.brokerage}
              onChange={(e) => update({ brokerage: e.target.value })}
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@email.com"
              value={brief.email}
              onChange={(e) => update({ email: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Phone <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="tel"
              placeholder="(555) 555-5555"
              value={brief.phone}
              onChange={(e) => update({ phone: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row">
          <label>Property address or location</label>
          <input
            className="input"
            type="text"
            placeholder="Street address or general location"
            value={brief.address}
            onChange={(e) => update({ address: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label>Secondary address <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
          <input
            className="input"
            type="text"
            placeholder="Adjacent parcel, second building, gate entry, etc."
            value={brief.secondaryAddress}
            onChange={(e) => update({ secondaryAddress: e.target.value })}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 2: Property basics ---------- */
  if (step === 2) {
    return (
      <QStep
        shoot={shoot}
        stepNum={2} totalSteps={TOTAL}
        eyebrow="STEP 04 — The property"
        question="Tell us about the property."
        helper="Type, size, and whether it's currently occupied. Rough numbers are fine."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Type of property</label>
            <select
              className="select"
              value={brief.propertyKind}
              onChange={(e) => update({ propertyKind: e.target.value })}
            >
              <option value="">Select…</option>
              {COMMERCIAL_KINDS.map(k => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Vacant or occupied?</label>
            <div className="chips">
              {["Vacant", "Occupied", "Mixed"].map(v => (
                <button
                  key={v}
                  className={`chip ${brief.occupancy === v ? "active" : ""}`}
                  onClick={() => update({ occupancy: v })}
                  type="button"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Square footage</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. 12,000"
              value={brief.sqft}
              onChange={(e) => update({ sqft: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Floors</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. 2"
              value={brief.floors}
              onChange={(e) => update({ floors: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Buildings / units</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. 4 tenants"
              value={brief.units}
              onChange={(e) => update({ units: e.target.value })}
            />
          </div>
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 3: Features + description ---------- */
  if (step === 3) {
    return (
      <QStep
        shoot={shoot}
        stepNum={3} totalSteps={TOTAL}
        eyebrow="STEP 05 — Features"
        question="Anything special to capture?"
        helper="Pick the features worth showing off — and a sentence or two about the property and the business if it helps."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <div className="chips">
            {COMMERCIAL_FEATURES.map(f => (
              <button
                key={f}
                className={`chip ${brief.features.includes(f) ? "active" : ""}`}
                onClick={() => toggleList("features", f)}
                type="button"
              >
                {f}
              </button>
            ))}
          </div>
          <input
            className="input"
            type="text"
            placeholder="Other features — type and comma-separate"
            value={brief.featuresOther}
            onChange={(e) => update({ featuresOther: e.target.value })}
            style={{ marginTop: 10 }}
          />
        </div>
        <div className="form-row">
          <label>About the property &amp; business <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
          <textarea
            className="textarea"
            placeholder="e.g. Recently renovated retail strip in downtown Ann Arbor. Anchor tenant is a regional coffee chain. Looking to attract two more lease signings before year-end."
            value={brief.about}
            onChange={(e) => update({ about: e.target.value })}
            style={{ minHeight: 90 }}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 4: What's this media for? ---------- */
  if (step === 4) {
    return (
      <QStep
        shoot={shoot}
        stepNum={4} totalSteps={TOTAL}
        eyebrow="STEP 06 — End goal"
        question="What's this media for?"
        helper="Pick everywhere it'll run and everything it needs to do. This drives runtime, aspect ratio, and how we cover the property."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <div className="chips">
            {COMMERCIAL_USE_CASES.map(u => (
              <button
                key={u}
                className={`chip ${brief.useCases.includes(u) ? "active" : ""}`}
                onClick={() => toggleList("useCases", u)}
                type="button"
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 5: Timing + notes ---------- */
  if (step === 5) {
    return (
      <QStep
        shoot={shoot}
        stepNum={5} totalSteps={TOTAL}
        eyebrow="STEP 07 — Timing"
        question="When do you need it?"
        helper="Rough is fine. Note any access constraints — gate codes, drone-restricted airspace, twilight preferred, etc."
        onBack={goPrev}
        onNext={() => setStep(6)}
        nextLabel="Review brief"
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <label>Target shoot date</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. June 18 or 'next 2 weeks'"
            value={brief.targetDate}
            onChange={(e) => update({ targetDate: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label>Anything else we should know? <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
          <textarea
            className="textarea"
            placeholder="Access notes, gate codes, deadlines, drone-restricted airspace, etc."
            value={brief.notes}
            onChange={(e) => update({ notes: e.target.value })}
            style={{ minHeight: 90 }}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 6: Review + submit ---------- */
  return (
    <div>
      <div className="back-link" onClick={() => setStep(5)}>
        <Icon name="back" size={12} /> Back to brief
      </div>
      <div className="shoot-detail-header" style={{ marginTop: 14 }}>
        <span className="eyebrow">{shoot.index} · STEP 08 — Review &amp; send</span>
        <h2 className="q-question">Looks good?</h2>
      </div>
      <p className="q-helper">
        Quick sanity check before we send this over. Hit Back if you want to change anything.
      </p>
      <div className="q-review">
        <ReviewRow label="Name"        value={brief.contactName} />
        <ReviewRow label="Brokerage"   value={brief.brokerage || "—"} />
        <ReviewRow label="Email"       value={brief.email} />
        <ReviewRow label="Phone"       value={brief.phone || "—"} />
        <ReviewRow label="Address"     value={brief.address} />
        {brief.secondaryAddress && <ReviewRow label="Secondary" value={brief.secondaryAddress} />}
        <ReviewRow label="Type"        value={brief.propertyKind} />
        <ReviewRow label="Occupancy"   value={brief.occupancy || "—"} />
        <ReviewRow
          label="Size"
          value={
            [brief.sqft && `${brief.sqft} sqft`, brief.floors && `${brief.floors} floors`, brief.units]
              .filter(Boolean)
              .join(" · ") || "—"
          }
        />
        <ReviewRow
          label="Features"
          value={[...brief.features, brief.featuresOther].filter(Boolean).join(", ") || "—"}
        />
        {brief.about && <ReviewRow label="About" value={brief.about} multiline />}
        <ReviewRow label="Media for"   value={brief.useCases.join(", ")} />
        <ReviewRow label="Need by"     value={brief.targetDate || "—"} />
        {brief.notes && <ReviewRow label="Notes" value={brief.notes} multiline />}
      </div>
      <BriefSubmitNav
        service="real-estate-commercial"
        brief={brief}
        onBack={() => setStep(5)}
      />
    </div>
  );
};

const ContactBlock = ({
  contactName, setContactName,
  contactEmail, setContactEmail,
  contactPhone, setContactPhone,
  brokerage, setBrokerage,
}) => (
  <div style={{ marginTop: 8 }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      <div className="form-row">
        <label>Your name</label>
        <input
          className="input"
          type="text"
          placeholder="First last"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
      </div>
      <div className="form-row">
        <label>Brokerage</label>
        <input
          className="input"
          type="text"
          placeholder="Company / brokerage name"
          value={brokerage || ""}
          onChange={(e) => setBrokerage && setBrokerage(e.target.value)}
        />
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      <div className="form-row">
        <label>Email</label>
        <input
          className="input"
          type="email"
          placeholder="you@email.com"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
      </div>
      <div className="form-row">
        <label>Phone</label>
        <input
          className="input"
          type="tel"
          placeholder="(555) 555-5555"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
        />
      </div>
    </div>
  </div>
);

/* ---------- Promotional Videos Quoting Flow ---------- */
// One question per screen (except step 1, which groups contact + address
// since they're all short fields that go together). Each step writes
// into a single `brief` state object so the final submit is just a
// dump-to-Firestore call once we wire the backend up.

const PROMO_GOALS = [
  "Drive sales / conversions",
  "Build brand awareness",
  "Launch announcement",
  "Recruit talent",
  "Generate leads / sign-ups",
  "Pitch to investors",
  "Internal / training",
  "Something else",
];

const PROMO_PLACEMENTS = [
  "Instagram (Reels)",
  "Instagram (Feed)",
  "TikTok",
  "YouTube",
  "LinkedIn",
  "Facebook",
  "Website hero",
  "Email / newsletter",
  "Trade show / event",
  "Paid ads (Meta / Google)",
  "Broadcast / TV",
  "Other",
];

// Wrapper used by every step in the promo flow. Keeps the layout
// consistent — back link, eyebrow with progress, question heading,
// helper text, slot for the input, and nav buttons.
const QStep = ({
  shoot, stepNum, totalSteps, eyebrow,
  question, helper,
  onBack, onNext, nextLabel = "Continue",
  nextDisabled = false,
  children,
}) => (
  <div>
    <div className="back-link" onClick={onBack}>
      <Icon name="back" size={12} /> Back
    </div>
    <div className="q-progress" aria-hidden="true">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <span key={i} className={`q-dot ${i < stepNum ? "done" : ""} ${i === stepNum - 1 ? "active" : ""}`} />
      ))}
      <span className="q-progress-label">Step {stepNum} of {totalSteps}</span>
    </div>
    <div className="shoot-detail-header" style={{ marginTop: 14 }}>
      <span className="eyebrow">{shoot.index} · {eyebrow}</span>
      <h2 className="q-question">{question}</h2>
    </div>
    {helper && (
      <p className="q-helper">{helper}</p>
    )}
    <div className="q-body">
      {children}
    </div>
    <div className="q-nav">
      <button className="btn ghost" onClick={onBack}>Back</button>
      <button
        className="btn primary"
        disabled={nextDisabled}
        onClick={onNext}
        style={nextDisabled ? { opacity: 0.4, cursor: "not-allowed" } : {}}
      >
        {nextLabel}
      </button>
    </div>
  </div>
);

const PromotionalFlow = ({ shoot, onBack }) => {
  const [step, setStep] = React.useState(1);
  const TOTAL = 5;

  // All brief state lives in one object so it's easy to ship to
  // Firestore in one write later, and easy to log/inspect now.
  const [brief, setBrief] = React.useState({
    contactName: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    offering: "",
    goal: [],
    goalDetail: "",
    placements: [],
    deadline: "",  });

  // Merge a partial update into the brief — cleaner than ten setBriefXxx
  // helpers.
  const update = (patch) => setBrief(b => ({ ...b, ...patch }));
  const toggleList = (key, value) =>
    setBrief(b => ({
      ...b,
      [key]: b[key].includes(value) ? b[key].filter(x => x !== value) : [...b[key], value],
    }));

  const goPrev = () => (step === 1 ? onBack() : setStep(s => s - 1));
  const goNext = () => setStep(s => Math.min(TOTAL + 1, s + 1));

  // Per-step "Continue is allowed" gates. We keep these lax — we want
  // a brief, not a checklist — but we do require contact basics +
  // address up front so the studio can actually reply.
  const canAdvance = (() => {
    if (step === 1) {
      return brief.contactName.trim() && brief.email.trim() && brief.address.trim();
    }
    if (step === 2) return brief.offering.trim().length > 4;
    if (step === 3) return brief.goal.length > 0 || brief.goalDetail.trim().length > 4;
    if (step === 4) return brief.placements.length > 0;
    if (step === 5) return true;
    return true;
  })();

  /* ---------- STEP 1: Contact + address (grouped) ---------- */
  if (step === 1) {
    return (
      <QStep
        shoot={shoot}
        stepNum={1} totalSteps={TOTAL}
        eyebrow="STEP 02 — Your details"
        question="First, the basics."
        helper="Who you are, how to reach you, and where the project lives. We'll never share any of this."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Your name</label>
            <input
              className="input"
              type="text"
              placeholder="First and last"
              value={brief.contactName}
              onChange={(e) => update({ contactName: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Company or brand <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="text"
              placeholder="Acme Goods Co."
              value={brief.company}
              onChange={(e) => update({ company: e.target.value })}
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@email.com"
              value={brief.email}
              onChange={(e) => update({ email: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Phone <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="tel"
              placeholder="(555) 555-5555"
              value={brief.phone}
              onChange={(e) => update({ phone: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row">
          <label>Project address or location</label>
          <input
            className="input"
            type="text"
            placeholder="123 Main St, Ann Arbor MI — or 'multiple sites in Washtenaw'"
            value={brief.address}
            onChange={(e) => update({ address: e.target.value })}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 2: What do you do? ---------- */
  if (step === 2) {
    return (
      <QStep
        shoot={shoot}
        stepNum={2} totalSteps={TOTAL}
        eyebrow="STEP 03 — Your brand"
        question="What does your brand or organization create or offer?"
        helper="A sentence or a paragraph — just enough that we get who you are and what you sell. Skip the marketing speak."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <textarea
            className="textarea q-textarea"
            placeholder="We're a small-batch coffee roaster. Our beans go to about thirty cafes around the Midwest, plus a direct-to-consumer subscription that's our main growth channel right now."
            value={brief.offering}
            onChange={(e) => update({ offering: e.target.value })}
            autoFocus
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 3: End goal ---------- */
  if (step === 3) {
    return (
      <QStep
        shoot={shoot}
        stepNum={3} totalSteps={TOTAL}
        eyebrow="STEP 04 — End goal"
        question="What should this video actually do?"
        helper="Pick everything that applies, and tell us what success looks like in your own words."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <div className="chips">
            {PROMO_GOALS.map(v => (
              <button
                key={v}
                className={`chip ${brief.goal.includes(v) ? "active" : ""}`}
                onClick={() => toggleList("goal", v)}
                type="button"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="form-row">
          <label>What does success look like? <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
          <textarea
            className="textarea"
            placeholder="A 30s spot we can run as paid social for our spring DTC push. If it drives ~200 new subscribers in a month, it paid for itself."
            value={brief.goalDetail}
            onChange={(e) => update({ goalDetail: e.target.value })}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 4: Where will it live? ---------- */
  if (step === 4) {
    return (
      <QStep
        shoot={shoot}
        stepNum={4} totalSteps={TOTAL}
        eyebrow="STEP 05 — Placement"
        question="Where will this video live?"
        helper="Pick all the places you'll use it. This drives runtime, aspect ratio, and whether we need licensed music."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <div className="chips">
            {PROMO_PLACEMENTS.map(v => (
              <button
                key={v}
                className={`chip ${brief.placements.includes(v) ? "active" : ""}`}
                onClick={() => toggleList("placements", v)}
                type="button"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 5: Deadline ---------- */
  if (step === 5) {
    return (
      <QStep
        shoot={shoot}
        stepNum={5} totalSteps={TOTAL}
        eyebrow="STEP 06 — Timing"
        question="When do you need it?"
        helper="Rough is fine. If you're flexible on timing, just say so — it helps us reply with the right options."
        onBack={goPrev}
        onNext={() => setStep(6)}
        nextLabel="Review brief"
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <label>Need it by</label>
          <input
            className="input"
            type="text"
            placeholder="mid-July 2026 — or 'flexible'"
            value={brief.deadline}
            onChange={(e) => update({ deadline: e.target.value })}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 6: Review + submit ---------- */
  // (Firestore submit hook lands here next.)
  return (
    <div>
      <div className="back-link" onClick={() => setStep(5)}>
        <Icon name="back" size={12} /> Back to brief
      </div>
      <div className="shoot-detail-header" style={{ marginTop: 14 }}>
        <span className="eyebrow">{shoot.index} · STEP 07 — Review & send</span>
        <h2 className="q-question">Looks good?</h2>
      </div>
      <p className="q-helper">
        Quick sanity check before we send this over. Hit Back if you want to change anything.
      </p>
      <div className="q-review">
        <ReviewRow label="Name"      value={brief.contactName} />
        <ReviewRow label="Company"   value={brief.company || "—"} />
        <ReviewRow label="Email"     value={brief.email} />
        <ReviewRow label="Phone"     value={brief.phone || "—"} />
        <ReviewRow label="Location"  value={brief.address} />
        <ReviewRow label="What you do"   value={brief.offering} multiline />
        <ReviewRow label="End goal"  value={brief.goal.join(", ") || "—"} />
        {brief.goalDetail && <ReviewRow label="Success looks like" value={brief.goalDetail} multiline />}
        <ReviewRow label="Placement" value={brief.placements.join(", ")} />
        <ReviewRow label="Need by"   value={brief.deadline || "—"} />
      </div>
      <BriefSubmitNav
        service="promotional-videos"
        brief={brief}
        onBack={() => setStep(5)}
      />
    </div>
  );
};

/* ---------- FPV Fly-Throughs Flow ---------- */
// Same QStep pattern as Promo & Commercial. FPV is heavily route-dependent
// so we ask for the space, the placement, and what success looks like —
// then mention floor plans / focus docs in the reply so the form stays light.

const FPV_BUILDING_TYPES = [
  "Cafe / restaurant",
  "Retail / boutique",
  "Realty / listing",
  "Office / workspace",
  "Entertainment venue",
  "Gym / fitness studio",
  "Hotel / hospitality",
  "Brewery / distillery",
  "Event space",
  "Outdoor recreation",
  "Industrial / warehouse",
  "Residential",
  "Other",
];

const FPV_PLACEMENTS = [
  "Instagram Reels",
  "TikTok",
  "YouTube",
  "Website hero",
  "Listing site (Zillow / LoopNet)",
  "LinkedIn",
  "Facebook",
  "Trade show / event loop",
  "Internal / training",
  "Paid ads (Meta / Google)",
];

const FPVFlow = ({ shoot, onBack }) => {
  const [step, setStep] = React.useState(1);
  const TOTAL = 5;

  const [brief, setBrief] = React.useState({
    contactName: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    sqft: "",
    buildingType: "",
    spaceDescription: "",
    placements: [],
    placementsOther: "",
    success: "",
    focusAreas: "",
    targetDate: "",  });

  const update = (patch) => setBrief(b => ({ ...b, ...patch }));
  const toggleList = (key, value) =>
    setBrief(b => ({
      ...b,
      [key]: b[key].includes(value) ? b[key].filter(x => x !== value) : [...b[key], value],
    }));

  const goPrev = () => (step === 1 ? onBack() : setStep(s => s - 1));
  const goNext = () => setStep(s => Math.min(TOTAL + 1, s + 1));

  const canAdvance = (() => {
    if (step === 1) return brief.contactName.trim() && brief.email.trim() && brief.address.trim();
    if (step === 2) return brief.buildingType !== "";
    if (step === 3) return brief.placements.length > 0 || brief.placementsOther.trim().length > 0;
    if (step === 4) return brief.success.trim().length > 4;
    if (step === 5) return true;
    return true;
  })();

  /* ---------- STEP 1: Basics ---------- */
  if (step === 1) {
    return (
      <QStep
        shoot={shoot}
        stepNum={1} totalSteps={TOTAL}
        eyebrow="STEP 02 — Your details"
        question="First, the basics."
        helper="Who you are, how to reach you, and where the space is. We'll never share any of this."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Your name</label>
            <input
              className="input"
              type="text"
              placeholder="First and last"
              value={brief.contactName}
              onChange={(e) => update({ contactName: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Company or brand <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="text"
              placeholder="Acme Coffee Co."
              value={brief.company}
              onChange={(e) => update({ company: e.target.value })}
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@email.com"
              value={brief.email}
              onChange={(e) => update({ email: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Phone <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="tel"
              placeholder="(555) 555-5555"
              value={brief.phone}
              onChange={(e) => update({ phone: e.target.value })}
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Address of the space</label>
            <input
              className="input"
              type="text"
              placeholder="Street address — interior + exterior shoots both fine"
              value={brief.address}
              onChange={(e) => update({ address: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Square footage <span style={{ color: "var(--fg-mute)" }}>(approx.)</span></label>
            <input
              className="input"
              type="text"
              placeholder="e.g. 2,400"
              value={brief.sqft}
              onChange={(e) => update({ sqft: e.target.value })}
            />
          </div>
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 2: Type of space + description ---------- */
  if (step === 2) {
    return (
      <QStep
        shoot={shoot}
        stepNum={2} totalSteps={TOTAL}
        eyebrow="STEP 03 — The space"
        question="What kind of space is it?"
        helper="Pick the closest fit, then tell us a little about the vibe and what makes it interesting to fly through."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <div className="chips">
            {FPV_BUILDING_TYPES.map(t => (
              <button
                key={t}
                className={`chip ${brief.buildingType === t ? "active" : ""}`}
                onClick={() => update({ buildingType: t })}
                type="button"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="form-row">
          <label>About the space</label>
          <textarea
            className="textarea q-textarea"
            placeholder="e.g. Two-story coffee shop in a converted warehouse — exposed brick, big front windows, mezzanine seating. We'd want the flight to start outside, swoop through the front door, climb to the mezzanine, and end on the espresso bar."
            value={brief.spaceDescription}
            onChange={(e) => update({ spaceDescription: e.target.value })}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 3: Where it will live ---------- */
  if (step === 3) {
    return (
      <QStep
        shoot={shoot}
        stepNum={3} totalSteps={TOTAL}
        eyebrow="STEP 04 — Placement"
        question="Where will the video live?"
        helper="Pick all that apply. Use the box at the bottom to add anything not on the list — comma-separate multiple."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <div className="chips">
            {FPV_PLACEMENTS.map(p => (
              <button
                key={p}
                className={`chip ${brief.placements.includes(p) ? "active" : ""}`}
                onClick={() => toggleList("placements", p)}
                type="button"
              >
                {p}
              </button>
            ))}
          </div>
          <input
            className="input"
            type="text"
            placeholder="Other placements — e.g. in-store loop, investor deck, press kit"
            value={brief.placementsOther}
            onChange={(e) => update({ placementsOther: e.target.value })}
            style={{ marginTop: 10 }}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 4: Success ---------- */
  if (step === 4) {
    return (
      <QStep
        shoot={shoot}
        stepNum={4} totalSteps={TOTAL}
        eyebrow="STEP 05 — Success"
        question="What does success look like?"
        helper="Tell us the outcome you want. Foot traffic? Lease signings? A reel that lands? Whatever you'd measure it by."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <textarea
            className="textarea q-textarea"
            placeholder="A 45-second reel we can run as paid social for our grand opening. If it gets us to 1,000 followers in week one and a noticeable bump in walk-ins, it paid for itself."
            value={brief.success}
            onChange={(e) => update({ success: e.target.value })}
            autoFocus
          />
        </div>
        <div className="form-row">
          <label>Key areas or moments to hit <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
          <textarea
            className="textarea"
            placeholder="e.g. Reveal the mezzanine, slow over the espresso bar, end on the storefront sign at dusk."
            value={brief.focusAreas}
            onChange={(e) => update({ focusAreas: e.target.value })}
            style={{ minHeight: 80 }}
          />
          <p style={{ color: "var(--fg-mute)", fontSize: 12, margin: "8px 0 0" }}>
            Have a floor plan, sketch, or reference photos? Don't worry about it yet — we'll ask for them in our reply so we can plan the route.
          </p>
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 5: Timing ---------- */
  if (step === 5) {
    return (
      <QStep
        shoot={shoot}
        stepNum={5} totalSteps={TOTAL}
        eyebrow="STEP 06 — Timing"
        question="When do you need it?"
        helper="Rough is fine. If you're flexible, say so — it just helps us reply with the right options."
        onBack={goPrev}
        onNext={() => setStep(6)}
        nextLabel="Review brief"
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <label>Need it by</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. mid-July 2026 — or 'flexible'"
            value={brief.targetDate}
            onChange={(e) => update({ targetDate: e.target.value })}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 6: Review + submit ---------- */
  const placementsCombined = [
    ...brief.placements,
    ...brief.placementsOther
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
  ];

  return (
    <div>
      <div className="back-link" onClick={() => setStep(5)}>
        <Icon name="back" size={12} /> Back to brief
      </div>
      <div className="shoot-detail-header" style={{ marginTop: 14 }}>
        <span className="eyebrow">{shoot.index} · STEP 07 — Review &amp; send</span>
        <h2 className="q-question">Looks good?</h2>
      </div>
      <p className="q-helper">
        Quick sanity check before we send this over. Hit Back if you want to change anything. After we reply, we'll ask for a floor plan, sketch, or reference photos so we can plan the flight route.
      </p>
      <div className="q-review">
        <ReviewRow label="Name"        value={brief.contactName} />
        <ReviewRow label="Company"     value={brief.company || "—"} />
        <ReviewRow label="Email"       value={brief.email} />
        <ReviewRow label="Phone"       value={brief.phone || "—"} />
        <ReviewRow label="Address"     value={brief.address} />
        <ReviewRow label="Square ft."  value={brief.sqft || "—"} />
        <ReviewRow label="Space type"  value={brief.buildingType} />
        {brief.spaceDescription && <ReviewRow label="About space" value={brief.spaceDescription} multiline />}
        <ReviewRow label="Placement"   value={placementsCombined.join(", ") || "—"} />
        <ReviewRow label="Success"     value={brief.success} multiline />
        {brief.focusAreas && <ReviewRow label="Focus areas" value={brief.focusAreas} multiline />}
        <ReviewRow label="Need by"     value={brief.targetDate || "—"} />
      </div>
      <BriefSubmitNav
        service="fpv-fly-throughs"
        brief={brief}
        onBack={() => setStep(5)}
      />
    </div>
  );
};

/* ---------- Construction Documentation Flow ---------- */
// Starts with an Ongoing vs One-time cadence pick (same TypeCard look as
// the real-estate property-type step), then drops into the same QStep
// questionnaire as the other flows. Mavic 3 Pro deliverables drive the
// "what you need" chip list.

const CONSTRUCTION_CADENCES = [
  {
    id: "ongoing",
    index: "01",
    title: "Ongoing Documentation",
    desc: "Recurring visits across the build — groundbreaking, framing, drywall, finishes. Complete photo record plus a timelapse-style edit at handoff.",
    tags: ["Recurring", "Timelapse", "Long-term"],
    glyph: "circ",
  },
  {
    id: "one-time",
    index: "02",
    title: "One-Time or Scheduled",
    desc: "A single shoot — or a handful of pre-planned ones. Milestone moments, ribbon-cuttings, or marketing assets for a finished project.",
    tags: ["Single", "Scheduled", "Milestone"],
    glyph: "cal",
  },
];

const CONSTRUCTION_TYPES = [
  "Residential — single home",
  "Residential — multi-unit",
  "Commercial new build",
  "Commercial renovation",
  "Industrial / warehouse",
  "Infrastructure / civil",
  "Mixed-use",
  "Land development",
  "Solar / utility install",
  "Other",
];

const CONSTRUCTION_SERVICES = [
  { id: "aerial-photo", title: "Aerial Photography", desc: "High-resolution drone stills of the site, structure, and progress." },
  { id: "aerial-video", title: "Aerial Video", desc: "4K cinematic flyovers — for marketing or stakeholder updates." },
  { id: "3d-scan", title: "Low-poly 3D Scan", desc: "Photogrammetric scan of the site for measurement, planning, or stakeholder review." },
  { id: "timelapse", title: "Progress Timelapse", desc: "Compiled timelapse edit from recurring visits — ideal for handoff or marketing." },
  { id: "orthomosaic", title: "Site Map / Orthomosaic", desc: "Top-down stitched map of the full site at survey-grade resolution." },
  { id: "ground-photo", title: "Ground Photography", desc: "On-the-ground stills paired with aerial — facade, interiors, detail shots." },
  { id: "cinematic", title: "Marketing Cinematic", desc: "Short branded edit for ribbon-cuttings, listings, or your portfolio." },
];

const CONSTRUCTION_FREQUENCIES = [
  "Weekly",
  "Bi-weekly",
  "Monthly",
  "Quarterly",
  "At each milestone",
];

const CONSTRUCTION_GOALS = [
  "Marketing / brand",
  "Stakeholder updates",
  "Investor reports",
  "Social media",
  "Internal records",
  "Insurance / legal docs",
  "Bid / sales material",
  "Sale or lease listing",
  "Owner / client deliverable",
];

const ConstructionFlow = ({ shoot, onBack }) => {
  // step 0 = cadence pick, 1-5 = questions, 6 = review
  const [step, setStep] = React.useState(0);
  const TOTAL = 5;

  const [brief, setBrief] = React.useState({
    cadence: "",
    contactName: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    constructionType: "",
    projectDescription: "",
    projectDuration: "",
    services: [],
    frequency: "",
    startDate: "",
    endDate: "",
    shootDates: "",
    numVisits: "",
    goals: [],
    goalsOther: "",    notes: "",
  });

  const update = (patch) => setBrief(b => ({ ...b, ...patch }));
  const toggleList = (key, value) =>
    setBrief(b => ({
      ...b,
      [key]: b[key].includes(value) ? b[key].filter(x => x !== value) : [...b[key], value],
    }));

  const goPrev = () => (step === 0 ? onBack() : setStep(s => s - 1));
  const goNext = () => setStep(s => Math.min(TOTAL + 1, s + 1));

  const canAdvance = (() => {
    if (step === 1) return brief.contactName.trim() && brief.email.trim() && brief.address.trim();
    if (step === 2) return brief.constructionType !== "";
    if (step === 3) return brief.services.length > 0;
    if (step === 4) {
      if (brief.cadence === "ongoing") return brief.frequency !== "" && brief.startDate.trim().length > 0;
      return brief.shootDates.trim().length > 0;
    }
    if (step === 5) return true;
    return true;
  })();

  /* ---------- STEP 0: Cadence pick ---------- */
  if (step === 0) {
    return (
      <div>
        <div className="back-link" onClick={onBack}>
          <Icon name="back" size={12} /> Back to services
        </div>
        <div className="shoot-detail-header" style={{ marginTop: 14 }}>
          <h2>{shoot.title}</h2>
          <span className="eyebrow">{shoot.index} · STEP 02 — Cadence</span>
        </div>
        <p style={{ color: "var(--fg-dim)", fontSize: 14, maxWidth: "62ch", margin: "0 0 24px" }}>
          Is this an ongoing engagement across the build, or a single shoot? Pick whichever fits — we'll dial in the rest next.
        </p>
        <div className="shoot-grid">
          {CONSTRUCTION_CADENCES.map(c => (
            <button
              key={c.id}
              className="shoot-card"
              onClick={() => { update({ cadence: c.id }); setStep(1); }}
            >
              <div>
                <div className="index">{c.index} / CADENCE</div>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
                <div className="tags">
                  {c.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              </div>
              <div className="viz">
                <Icon name={c.glyph} size={56} />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- STEP 1: Basics ---------- */
  if (step === 1) {
    return (
      <QStep
        shoot={shoot}
        stepNum={1} totalSteps={TOTAL}
        eyebrow="STEP 03 — Your details"
        question="First, the basics."
        helper="Who you are, how to reach you, and where the project is. We'll never share any of this."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Your name</label>
            <input
              className="input"
              type="text"
              placeholder="First and last"
              value={brief.contactName}
              onChange={(e) => update({ contactName: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Company <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="text"
              placeholder="GC, developer, or owner name"
              value={brief.company}
              onChange={(e) => update({ company: e.target.value })}
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@email.com"
              value={brief.email}
              onChange={(e) => update({ email: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Phone <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="tel"
              placeholder="(555) 555-5555"
              value={brief.phone}
              onChange={(e) => update({ phone: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row">
          <label>Project address or site location</label>
          <input
            className="input"
            type="text"
            placeholder="Street address, nearest cross-streets, or parcel ID"
            value={brief.address}
            onChange={(e) => update({ address: e.target.value })}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 2: Project ---------- */
  if (step === 2) {
    return (
      <QStep
        shoot={shoot}
        stepNum={2} totalSteps={TOTAL}
        eyebrow="STEP 04 — Project"
        question="Tell us about the project."
        helper="Type of build, rough size or scope, and the overall timeline. Rough is fine."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <label>Type of construction</label>
          <select
            className="select"
            value={brief.constructionType}
            onChange={(e) => update({ constructionType: e.target.value })}
          >
            <option value="">Select…</option>
            {CONSTRUCTION_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>About the project <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
          <textarea
            className="textarea q-textarea"
            placeholder="e.g. 18-unit townhome development on a 2-acre site. Just finishing foundations, framing starts in 3 weeks. Owner wants weekly photo updates plus a final cinematic for the website."
            value={brief.projectDescription}
            onChange={(e) => update({ projectDescription: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label>Total project duration <span style={{ color: "var(--fg-mute)" }}>(approx.)</span></label>
          <input
            className="input"
            type="text"
            placeholder="e.g. 9 months, June '26 – Feb '27"
            value={brief.projectDuration}
            onChange={(e) => update({ projectDuration: e.target.value })}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 3: Services ---------- */
  if (step === 3) {
    return (
      <QStep
        shoot={shoot}
        stepNum={3} totalSteps={TOTAL}
        eyebrow="STEP 05 — What you need"
        question="Which deliverables do you want?"
        helper="Pick any combination. Everything on this list is shot with a Mavic 3 Pro plus our ground rig — we'll bundle the pricing when you combine visits."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="shoot-grid">
          {CONSTRUCTION_SERVICES.map((svc, i) => {
            const selected = brief.services.includes(svc.id);
            return (
              <button
                key={svc.id}
                className={`shoot-card${selected ? " selected" : ""}`}
                onClick={() => toggleList("services", svc.id)}
                type="button"
              >
                <div>
                  <div className="index">{String(i + 1).padStart(2, "0")} / DELIVERABLE</div>
                  <h3>{svc.title}</h3>
                  <p>{svc.desc}</p>
                </div>
                <div className="viz">
                  <Icon name={selected ? "check" : "plus"} size={40} />
                </div>
              </button>
            );
          })}
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 4: Cadence-specific scheduling ---------- */
  if (step === 4) {
    const isOngoing = brief.cadence === "ongoing";
    return (
      <QStep
        shoot={shoot}
        stepNum={4} totalSteps={TOTAL}
        eyebrow="STEP 06 — Schedule"
        question={isOngoing ? "How often, and when does it start?" : "When should we shoot?"}
        helper={
          isOngoing
            ? "Recurring cadence and a start date. We'll lock the specific visit days once we connect."
            : "List the date or dates you want covered. If it's a milestone shoot, just describe the milestone — we'll dial in the day."
        }
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        {isOngoing ? (
          <React.Fragment>
            <div className="form-row">
              <label>Visit frequency</label>
              <div className="chips">
                {CONSTRUCTION_FREQUENCIES.map(f => (
                  <button
                    key={f}
                    className={`chip ${brief.frequency === f ? "active" : ""}`}
                    onClick={() => update({ frequency: f })}
                    type="button"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <div className="form-row">
                <label>Start date</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. June 18 or 'next 2 weeks'"
                  value={brief.startDate}
                  onChange={(e) => update({ startDate: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label>Expected end <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Feb 2027 or 'open-ended'"
                  value={brief.endDate}
                  onChange={(e) => update({ endDate: e.target.value })}
                />
              </div>
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <div className="form-row">
              <label>Shoot date(s)</label>
              <textarea
                className="textarea"
                placeholder="e.g. June 18, then again at topping-out (~Aug 10). Or 'ribbon-cutting on Oct 4'."
                value={brief.shootDates}
                onChange={(e) => update({ shootDates: e.target.value })}
                style={{ minHeight: 80 }}
              />
            </div>
            <div className="form-row">
              <label>Number of visits <span style={{ color: "var(--fg-mute)" }}>(if known)</span></label>
              <input
                className="input"
                type="text"
                placeholder="e.g. 1 — or 3 spread across the build"
                value={brief.numVisits}
                onChange={(e) => update({ numVisits: e.target.value })}
              />
            </div>
          </React.Fragment>
        )}
      </QStep>
    );
  }

  /* ---------- STEP 5: Goals + notes ---------- */
  if (step === 5) {
    return (
      <QStep
        shoot={shoot}
        stepNum={5} totalSteps={TOTAL}
        eyebrow="STEP 07 — Goal"
        question="What's the documentation for?"
        helper="Pick all that apply. Add any access notes — gate codes, site-safety requirements, restricted airspace, etc."
        onBack={goPrev}
        onNext={() => setStep(6)}
        nextLabel="Review brief"
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <label>What's it for?</label>
          <div className="chips">
            {CONSTRUCTION_GOALS.map(g => (
              <button
                key={g}
                className={`chip ${brief.goals.includes(g) ? "active" : ""}`}
                onClick={() => toggleList("goals", g)}
                type="button"
              >
                {g}
              </button>
            ))}
          </div>
          <input
            className="input"
            type="text"
            placeholder="Other goals — comma-separate"
            value={brief.goalsOther}
            onChange={(e) => update({ goalsOther: e.target.value })}
            style={{ marginTop: 10 }}
          />
        </div>
        <div className="form-row">
          <label>Anything else we should know? <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
          <textarea
            className="textarea"
            placeholder="Site-safety badging, gate codes, NOTAM / restricted airspace, deliverable formats, etc."
            value={brief.notes}
            onChange={(e) => update({ notes: e.target.value })}
            style={{ minHeight: 90 }}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 6: Review + submit ---------- */
  const serviceTitles = brief.services
    .map(id => (CONSTRUCTION_SERVICES.find(s => s.id === id) || {}).title)
    .filter(Boolean);

  const goalsCombined = [
    ...brief.goals,
    ...brief.goalsOther.split(",").map(s => s.trim()).filter(Boolean),
  ];

  const cadenceLabel = (CONSTRUCTION_CADENCES.find(c => c.id === brief.cadence) || {}).title;

  return (
    <div>
      <div className="back-link" onClick={() => setStep(5)}>
        <Icon name="back" size={12} /> Back to brief
      </div>
      <div className="shoot-detail-header" style={{ marginTop: 14 }}>
        <span className="eyebrow">{shoot.index} · STEP 08 — Review &amp; send</span>
        <h2 className="q-question">Looks good?</h2>
      </div>
      <p className="q-helper">
        Quick sanity check before we send this over. Hit Back if you want to change anything.
      </p>
      <div className="q-review">
        <ReviewRow label="Cadence"     value={cadenceLabel || "—"} />
        <ReviewRow label="Name"        value={brief.contactName} />
        <ReviewRow label="Company"     value={brief.company || "—"} />
        <ReviewRow label="Email"       value={brief.email} />
        <ReviewRow label="Phone"       value={brief.phone || "—"} />
        <ReviewRow label="Address"     value={brief.address} />
        <ReviewRow label="Project"     value={brief.constructionType} />
        {brief.projectDescription && <ReviewRow label="About"  value={brief.projectDescription} multiline />}
        {brief.projectDuration && <ReviewRow label="Duration" value={brief.projectDuration} />}
        <ReviewRow label="Deliverables" value={serviceTitles.join(", ")} />
        {brief.cadence === "ongoing" ? (
          <React.Fragment>
            <ReviewRow label="Frequency"  value={brief.frequency} />
            <ReviewRow label="Start"      value={brief.startDate} />
            {brief.endDate && <ReviewRow label="End" value={brief.endDate} />}
          </React.Fragment>
        ) : (
          <React.Fragment>
            <ReviewRow label="Shoot date(s)" value={brief.shootDates} multiline />
            {brief.numVisits && <ReviewRow label="Visits" value={brief.numVisits} />}
          </React.Fragment>
        )}
        <ReviewRow label="Goal"        value={goalsCombined.join(", ") || "—"} />
        {brief.notes && <ReviewRow label="Notes" value={brief.notes} multiline />}
      </div>
      <BriefSubmitNav
        service="construction"
        brief={brief}
        onBack={() => setStep(5)}
      />
    </div>
  );
};

/* ---------- Property Documentation Flow ---------- */
// Large-parcel work. Location is rarely a clean street address (parcel ID,
// cross-streets, county) and seasons matter more than building details.
// Deliverables map to what a Mavic 3 Pro can actually produce.

const PROPERTY_DOC_TYPES = [
  "Farm / cropland",
  "Timber / woods",
  "Hunting land",
  "Recreational acreage",
  "Ranch",
  "Rural estate",
  "Vacant / development land",
  "Conservation land",
  "Vineyard / orchard",
  "Other",
];

const PROPERTY_DOC_FEATURES = [
  "Ponds / lakes",
  "Creeks / streams",
  "Woods / timber stands",
  "Open fields",
  "Food plots",
  "Hunting blinds / stands",
  "Trails",
  "Road frontage",
  "Fence lines",
  "Barns / outbuildings",
  "Dwellings",
  "Livestock areas",
  "Vineyards / orchards",
  "Irrigation",
];

const PROPERTY_DOC_SERVICES = [
  { id: "aerial-photo", title: "Aerial Photography", desc: "High-resolution drone stills covering the full parcel and its key features." },
  { id: "aerial-video", title: "Aerial Cinematic", desc: "Smooth video that conveys the size, terrain, and character of the land." },
  { id: "boundary-stills", title: "Boundary-Annotated Stills", desc: "Aerials with approximate property lines drawn on for marketing use.", note: "Marketing only — not survey-grade or legal boundaries." },
  { id: "orthomosaic", title: "Top-Down Site Map", desc: "Stitched orthomosaic — a single high-resolution top-down image of the whole parcel." },
  { id: "3d-scan", title: "Photogrammetric Terrain Scan", desc: "Low-poly 3D scan of the parcel — useful for terrain, planning, and stakeholder visualization." },
  { id: "seasonal", title: "Seasonal Comparison Set", desc: "A second visit in a different season to show the land year-round." },
  { id: "hero-print", title: "Print-Ready Hero Image", desc: "One oversize, high-resolution shot for an office wall or framed gift." },
];

const PROPERTY_DOC_GOALS = [
  "MLS listing",
  "LandWatch / Lands of America",
  "Brokerage website",
  "Social media",
  "Owner records",
  "Insurance documentation",
  "Conservation grant / funding",
  "Hunting lease marketing",
  "Family heirloom / gift",
  "Printed brochure / mailer",
];

const PROPERTY_DOC_SEASONS = [
  "No preference",
  "Peak fall color",
  "Dormant / leaves-off (clearer ground)",
  "Green summer",
  "Snow-covered",
  "Specific date (see notes)",
];

const PropertyDocFlow = ({ shoot, onBack }) => {
  const [step, setStep] = React.useState(1);
  const TOTAL = 5;

  const [brief, setBrief] = React.useState({
    contactName: "",
    company: "",
    email: "",
    phone: "",
    location: "",
    landType: "",
    acreage: "",
    aboutLand: "",
    features: [],
    focusAreas: "",
    services: [],
    goals: [],
    goalsOther: "",
    season: "",
    targetDate: "",    notes: "",
  });

  const update = (patch) => setBrief(b => ({ ...b, ...patch }));
  const toggleList = (key, value) =>
    setBrief(b => ({
      ...b,
      [key]: b[key].includes(value) ? b[key].filter(x => x !== value) : [...b[key], value],
    }));

  const goPrev = () => (step === 1 ? onBack() : setStep(s => s - 1));
  const goNext = () => setStep(s => Math.min(TOTAL + 1, s + 1));

  const canAdvance = (() => {
    if (step === 1) return brief.contactName.trim() && brief.email.trim() && brief.location.trim();
    if (step === 2) return brief.landType !== "" && brief.acreage.trim().length > 0;
    if (step === 3) return true;
    if (step === 4) return brief.services.length > 0;
    if (step === 5) return true;
    return true;
  })();

  /* ---------- STEP 1: Basics ---------- */
  if (step === 1) {
    return (
      <QStep
        shoot={shoot}
        stepNum={1} totalSteps={TOTAL}
        eyebrow="STEP 02 — Your details"
        question="First, the basics."
        helper="Who you are, how to reach you, and where the parcel is. Street address is great if you have it — parcel ID, cross-streets, or county work fine too."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Your name</label>
            <input
              className="input"
              type="text"
              placeholder="First and last"
              value={brief.contactName}
              onChange={(e) => update({ contactName: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Company / brokerage <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="text"
              placeholder="Brokerage, owner LLC, etc."
              value={brief.company}
              onChange={(e) => update({ company: e.target.value })}
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@email.com"
              value={brief.email}
              onChange={(e) => update({ email: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Phone <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="tel"
              placeholder="(555) 555-5555"
              value={brief.phone}
              onChange={(e) => update({ phone: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row">
          <label>Parcel location</label>
          <input
            className="input"
            type="text"
            placeholder="Street address, parcel ID, nearest cross-streets, or county"
            value={brief.location}
            onChange={(e) => update({ location: e.target.value })}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 2: The parcel ---------- */
  if (step === 2) {
    return (
      <QStep
        shoot={shoot}
        stepNum={2} totalSteps={TOTAL}
        eyebrow="STEP 03 — The parcel"
        question="Tell us about the land."
        helper="Land type, rough acreage, and a sentence or two about the terrain or what makes it interesting."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Type of land</label>
            <select
              className="select"
              value={brief.landType}
              onChange={(e) => update({ landType: e.target.value })}
            >
              <option value="">Select…</option>
              {PROPERTY_DOC_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Acreage</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. 80 acres"
              value={brief.acreage}
              onChange={(e) => update({ acreage: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row">
          <label>About the land <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
          <textarea
            className="textarea q-textarea"
            placeholder="e.g. Rolling 80 acres with a creek cutting through the back third. Mix of mature hardwoods and two cleared food plots. Family's owned it for 60 years, listing it this fall."
            value={brief.aboutLand}
            onChange={(e) => update({ aboutLand: e.target.value })}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 3: Features to capture ---------- */
  if (step === 3) {
    return (
      <QStep
        shoot={shoot}
        stepNum={3} totalSteps={TOTAL}
        eyebrow="STEP 04 — Features"
        question="What's worth capturing on the land?"
        helper="Pick everything on the property. Then call out anything we should especially emphasize — a particular pond, the back tree line, etc."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <div className="chips">
            {PROPERTY_DOC_FEATURES.map(f => (
              <button
                key={f}
                className={`chip ${brief.features.includes(f) ? "active" : ""}`}
                onClick={() => toggleList("features", f)}
                type="button"
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="form-row">
          <label>Anything to emphasize? <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
          <textarea
            className="textarea"
            placeholder="e.g. The pond on the south side is the selling point — we'd like it featured. Also the long road frontage along the east edge."
            value={brief.focusAreas}
            onChange={(e) => update({ focusAreas: e.target.value })}
            style={{ minHeight: 90 }}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 4: Deliverables ---------- */
  if (step === 4) {
    return (
      <QStep
        shoot={shoot}
        stepNum={4} totalSteps={TOTAL}
        eyebrow="STEP 05 — What you need"
        question="Which deliverables do you want?"
        helper="Pick any combination. Everything here is shot with a Mavic 3 Pro — we'll bundle pricing when you combine outputs."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="shoot-grid">
          {PROPERTY_DOC_SERVICES.map((svc, i) => {
            const selected = brief.services.includes(svc.id);
            return (
              <button
                key={svc.id}
                className={`shoot-card${selected ? " selected" : ""}`}
                onClick={() => toggleList("services", svc.id)}
                type="button"
              >
                <div>
                  <div className="index">{String(i + 1).padStart(2, "0")} / DELIVERABLE</div>
                  <h3>{svc.title}</h3>
                  <p>{svc.desc}</p>
                  {svc.note && (
                    <p style={{ color: "var(--fg-mute)", fontSize: 11, marginTop: 8, fontStyle: "italic" }}>
                      {svc.note}
                    </p>
                  )}
                </div>
                <div className="viz">
                  <Icon name={selected ? "check" : "plus"} size={40} />
                </div>
              </button>
            );
          })}
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 5: Goal + season + timing ---------- */
  if (step === 5) {
    return (
      <QStep
        shoot={shoot}
        stepNum={5} totalSteps={TOTAL}
        eyebrow="STEP 06 — Goal &amp; timing"
        question="What's it for, and when do you want it shot?"
        helper="Use case, season preference, target date, and anything else we should know — gate codes, livestock, restricted airspace, easements, etc."
        onBack={goPrev}
        onNext={() => setStep(6)}
        nextLabel="Review brief"
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <label>What's it for?</label>
          <div className="chips">
            {PROPERTY_DOC_GOALS.map(g => (
              <button
                key={g}
                className={`chip ${brief.goals.includes(g) ? "active" : ""}`}
                onClick={() => toggleList("goals", g)}
                type="button"
              >
                {g}
              </button>
            ))}
          </div>
          <input
            className="input"
            type="text"
            placeholder="Other goals — comma-separate"
            value={brief.goalsOther}
            onChange={(e) => update({ goalsOther: e.target.value })}
            style={{ marginTop: 10 }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Season preference</label>
            <select
              className="select"
              value={brief.season}
              onChange={(e) => update({ season: e.target.value })}
            >
              <option value="">Select…</option>
              {PROPERTY_DOC_SEASONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Target date</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. mid-October or 'flexible'"
              value={brief.targetDate}
              onChange={(e) => update({ targetDate: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row">
          <label>Anything else we should know? <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
          <textarea
            className="textarea"
            placeholder="Gate codes, livestock present, restricted airspace nearby, easements, hunting season conflicts, etc."
            value={brief.notes}
            onChange={(e) => update({ notes: e.target.value })}
            style={{ minHeight: 90 }}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 6: Review + submit ---------- */
  const serviceTitles = brief.services
    .map(id => (PROPERTY_DOC_SERVICES.find(s => s.id === id) || {}).title)
    .filter(Boolean);

  const goalsCombined = [
    ...brief.goals,
    ...brief.goalsOther.split(",").map(s => s.trim()).filter(Boolean),
  ];

  return (
    <div>
      <div className="back-link" onClick={() => setStep(5)}>
        <Icon name="back" size={12} /> Back to brief
      </div>
      <div className="shoot-detail-header" style={{ marginTop: 14 }}>
        <span className="eyebrow">{shoot.index} · STEP 07 — Review &amp; send</span>
        <h2 className="q-question">Looks good?</h2>
      </div>
      <p className="q-helper">
        Quick sanity check before we send this over. Hit Back if you want to change anything.
      </p>
      <div className="q-review">
        <ReviewRow label="Name"        value={brief.contactName} />
        <ReviewRow label="Company"     value={brief.company || "—"} />
        <ReviewRow label="Email"       value={brief.email} />
        <ReviewRow label="Phone"       value={brief.phone || "—"} />
        <ReviewRow label="Location"    value={brief.location} />
        <ReviewRow label="Land type"   value={brief.landType} />
        <ReviewRow label="Acreage"     value={brief.acreage} />
        {brief.aboutLand && <ReviewRow label="About"  value={brief.aboutLand} multiline />}
        <ReviewRow label="Features"    value={brief.features.join(", ") || "—"} />
        {brief.focusAreas && <ReviewRow label="Emphasize" value={brief.focusAreas} multiline />}
        <ReviewRow label="Deliverables" value={serviceTitles.join(", ")} />
        <ReviewRow label="Goal"        value={goalsCombined.join(", ") || "—"} />
        <ReviewRow label="Season"      value={brief.season || "—"} />
        <ReviewRow label="Target date" value={brief.targetDate || "—"} />
        {brief.notes && <ReviewRow label="Notes" value={brief.notes} multiline />}
      </div>
      <BriefSubmitNav
        service="property-documentation"
        brief={brief}
        onBack={() => setStep(5)}
      />
    </div>
  );
};

/* ---------- Tourism & Community Flow ---------- */
// The work itself is open-ended (downtowns, parks, trails, festivals,
// "live here" recruitment films) so we narrow it by asking *who* the org
// is and *who they're trying to reach* first — that drives the creative
// more than the location does. Then we collect what's being covered, the
// deliverable shape (incl. a stock library option), and placement / season.

const TOURISM_ORG_TYPES = [
  "Tourism board / CVB",
  "Chamber of Commerce",
  "Downtown Development Authority",
  "Parks & Recreation",
  "State / regional tourism org",
  "Economic development office",
  "Land conservancy / preserve",
  "Festival / event organization",
  "Nonprofit / community org",
  "Municipal government",
  "Other",
];

const TOURISM_AUDIENCES = [
  "Visitors / tourists",
  "Prospective residents",
  "Donors / grant-makers",
  "Current residents",
  "Businesses considering relocation",
  "Conference / event attendees",
  "Students / families",
];

const TOURISM_COVERAGE = [
  "Single venue or landmark",
  "Downtown core",
  "Park or single site",
  "Trail or recreation system",
  "Multiple locations across town",
  "Region-wide / multi-town",
  "Full town overview",
  "Festival or event area",
];

const TOURISM_SERVICES = [
  { id: "highlight", title: "Hero Highlight Reel", desc: "A 60–90s anchor video — the one that lives on the home page or kicks off presentations." },
  { id: "social-reels", title: "Short Social Reels", desc: "Cut-down 15–30s vertical edits for Instagram, TikTok, and Reels-style feeds." },
  { id: "stock-library", title: "Aerial Stock Library", desc: "Unedited, color-graded aerial clips and stills you can repurpose for years of campaigns." },
  { id: "photo-set", title: "Photo Set", desc: "High-resolution stills for the website, brochures, social, and grant decks." },
  { id: "live-here", title: "'Live Here' Recruitment", desc: "A pitch film aimed at prospective residents or businesses — quality of life, schools, downtown." },
  { id: "recurring", title: "Recurring Monthly Content", desc: "A monthly visit that keeps the org's feed full of fresh seasonal content." },
  { id: "event-recap", title: "Event / Festival Recap", desc: "A reel from a specific event — useful for the next year's promotion and sponsor reports." },
];

const TOURISM_PLACEMENTS = [
  "Org website hero",
  "Visit / tourism site",
  "Instagram / TikTok",
  "YouTube",
  "Facebook",
  "LinkedIn (econ dev)",
  "Paid social ads",
  "Grant applications",
  "Conference / trade show",
  "Sponsor / donor presentations",
  "Visitor center / kiosk loop",
  "Broadcast / cable spots",
];

const TOURISM_SEASONS = [
  "No preference",
  "Peak fall color",
  "Green summer",
  "Winter / snow",
  "Spring bloom",
  "All seasons (multiple visits)",
  "Specific date / event",
];

const TourismFlow = ({ shoot, onBack }) => {
  const [step, setStep] = React.useState(1);
  const TOTAL = 5;

  const [brief, setBrief] = React.useState({
    contactName: "",
    orgName: "",
    email: "",
    phone: "",
    location: "",
    orgType: "",
    audiences: [],
    coverage: [],
    coverageDetail: "",
    services: [],
    placements: [],
    placementsOther: "",
    season: "",
    targetDate: "",    notes: "",
  });

  const update = (patch) => setBrief(b => ({ ...b, ...patch }));
  const toggleList = (key, value) =>
    setBrief(b => ({
      ...b,
      [key]: b[key].includes(value) ? b[key].filter(x => x !== value) : [...b[key], value],
    }));

  const goPrev = () => (step === 1 ? onBack() : setStep(s => s - 1));
  const goNext = () => setStep(s => Math.min(TOTAL + 1, s + 1));

  const canAdvance = (() => {
    if (step === 1) return brief.contactName.trim() && brief.email.trim() && brief.orgName.trim() && brief.location.trim();
    if (step === 2) return brief.orgType !== "" && brief.audiences.length > 0;
    if (step === 3) return brief.coverage.length > 0;
    if (step === 4) return brief.services.length > 0;
    if (step === 5) return true;
    return true;
  })();

  /* ---------- STEP 1: Basics ---------- */
  if (step === 1) {
    return (
      <QStep
        shoot={shoot}
        stepNum={1} totalSteps={TOTAL}
        eyebrow="STEP 02 — Your details"
        question="First, the basics."
        helper="Who you are, the org you're working with, and the town or region it represents. We'll never share any of this."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Your name</label>
            <input
              className="input"
              type="text"
              placeholder="First and last"
              value={brief.contactName}
              onChange={(e) => update({ contactName: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Organization</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Visit Ann Arbor, Downtown Ypsi DDA"
              value={brief.orgName}
              onChange={(e) => update({ orgName: e.target.value })}
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@email.com"
              value={brief.email}
              onChange={(e) => update({ email: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Phone <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="tel"
              placeholder="(555) 555-5555"
              value={brief.phone}
              onChange={(e) => update({ phone: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row">
          <label>Town or region you represent</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Ann Arbor, MI — or 'Huron River corridor'"
            value={brief.location}
            onChange={(e) => update({ location: e.target.value })}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 2: Org + audience ---------- */
  if (step === 2) {
    return (
      <QStep
        shoot={shoot}
        stepNum={2} totalSteps={TOTAL}
        eyebrow="STEP 03 — Org &amp; audience"
        question="Who's the org, and who's it for?"
        helper="Type of org plus who the media is aimed at. This shapes the creative more than anything else — a tourism reel and a recruitment film for the same town look very different."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <label>Type of organization</label>
          <select
            className="select"
            value={brief.orgType}
            onChange={(e) => update({ orgType: e.target.value })}
          >
            <option value="">Select…</option>
            {TOURISM_ORG_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Who's the audience?</label>
          <div className="chips">
            {TOURISM_AUDIENCES.map(a => (
              <button
                key={a}
                className={`chip ${brief.audiences.includes(a) ? "active" : ""}`}
                onClick={() => toggleList("audiences", a)}
                type="button"
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 3: Coverage ---------- */
  if (step === 3) {
    return (
      <QStep
        shoot={shoot}
        stepNum={3} totalSteps={TOTAL}
        eyebrow="STEP 04 — What we'd cover"
        question="What are we covering?"
        helper="Pick everything that's in scope — single venue, a downtown core, a parks system, or the whole town. Then list the actual places, trails, parks, or landmarks you'd want featured."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <div className="chips">
            {TOURISM_COVERAGE.map(c => (
              <button
                key={c}
                className={`chip ${brief.coverage.includes(c) ? "active" : ""}`}
                onClick={() => toggleList("coverage", c)}
                type="button"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="form-row">
          <label>Specific places, landmarks, or moments</label>
          <textarea
            className="textarea q-textarea"
            placeholder="e.g. Main Street downtown, the riverfront, Riverside Park, the farmers' market on Saturday mornings, fall color along Huron River Drive."
            value={brief.coverageDetail}
            onChange={(e) => update({ coverageDetail: e.target.value })}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 4: Deliverables ---------- */
  if (step === 4) {
    return (
      <QStep
        shoot={shoot}
        stepNum={4} totalSteps={TOTAL}
        eyebrow="STEP 05 — What you need"
        question="Which deliverables do you want?"
        helper="Mix and match. A hero reel + a stock library + a few short social cuts is a common combo for tourism orgs — gets you a year of content from one shoot."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="shoot-grid">
          {TOURISM_SERVICES.map((svc, i) => {
            const selected = brief.services.includes(svc.id);
            return (
              <button
                key={svc.id}
                className={`shoot-card${selected ? " selected" : ""}`}
                onClick={() => toggleList("services", svc.id)}
                type="button"
              >
                <div>
                  <div className="index">{String(i + 1).padStart(2, "0")} / DELIVERABLE</div>
                  <h3>{svc.title}</h3>
                  <p>{svc.desc}</p>
                </div>
                <div className="viz">
                  <Icon name={selected ? "check" : "plus"} size={40} />
                </div>
              </button>
            );
          })}
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 5: Placement + season + timing + notes ---------- */
  if (step === 5) {
    return (
      <QStep
        shoot={shoot}
        stepNum={5} totalSteps={TOTAL}
        eyebrow="STEP 06 — Placement &amp; timing"
        question="Where will it live, and when do you want it shot?"
        helper="Placements drive aspect ratio and runtime. Note anything we'd need to coordinate — event permits, road closures, partner orgs, or seasonal windows."
        onBack={goPrev}
        onNext={() => setStep(6)}
        nextLabel="Review brief"
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <label>Where it'll live</label>
          <div className="chips">
            {TOURISM_PLACEMENTS.map(p => (
              <button
                key={p}
                className={`chip ${brief.placements.includes(p) ? "active" : ""}`}
                onClick={() => toggleList("placements", p)}
                type="button"
              >
                {p}
              </button>
            ))}
          </div>
          <input
            className="input"
            type="text"
            placeholder="Other placements — comma-separate"
            value={brief.placementsOther}
            onChange={(e) => update({ placementsOther: e.target.value })}
            style={{ marginTop: 10 }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Season preference</label>
            <select
              className="select"
              value={brief.season}
              onChange={(e) => update({ season: e.target.value })}
            >
              <option value="">Select…</option>
              {TOURISM_SEASONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Target date</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. before peak fall — or 'flexible'"
              value={brief.targetDate}
              onChange={(e) => update({ targetDate: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row">
          <label>Anything else we should know? <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
          <textarea
            className="textarea"
            placeholder="Event permits, road closures, partner orgs to credit, restricted airspace, accessibility / inclusion considerations, brand guidelines, etc."
            value={brief.notes}
            onChange={(e) => update({ notes: e.target.value })}
            style={{ minHeight: 90 }}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 6: Review + submit ---------- */
  const serviceTitles = brief.services
    .map(id => (TOURISM_SERVICES.find(s => s.id === id) || {}).title)
    .filter(Boolean);

  const placementsCombined = [
    ...brief.placements,
    ...brief.placementsOther.split(",").map(s => s.trim()).filter(Boolean),
  ];

  return (
    <div>
      <div className="back-link" onClick={() => setStep(5)}>
        <Icon name="back" size={12} /> Back to brief
      </div>
      <div className="shoot-detail-header" style={{ marginTop: 14 }}>
        <span className="eyebrow">{shoot.index} · STEP 07 — Review &amp; send</span>
        <h2 className="q-question">Looks good?</h2>
      </div>
      <p className="q-helper">
        Quick sanity check before we send this over. Hit Back if you want to change anything.
      </p>
      <div className="q-review">
        <ReviewRow label="Name"        value={brief.contactName} />
        <ReviewRow label="Organization" value={brief.orgName} />
        <ReviewRow label="Email"       value={brief.email} />
        <ReviewRow label="Phone"       value={brief.phone || "—"} />
        <ReviewRow label="Town / region" value={brief.location} />
        <ReviewRow label="Org type"    value={brief.orgType} />
        <ReviewRow label="Audience"    value={brief.audiences.join(", ")} />
        <ReviewRow label="Coverage"    value={brief.coverage.join(", ")} />
        {brief.coverageDetail && <ReviewRow label="Specifics" value={brief.coverageDetail} multiline />}
        <ReviewRow label="Deliverables" value={serviceTitles.join(", ")} />
        <ReviewRow label="Placement"   value={placementsCombined.join(", ") || "—"} />
        <ReviewRow label="Season"      value={brief.season || "—"} />
        <ReviewRow label="Target date" value={brief.targetDate || "—"} />
        {brief.notes && <ReviewRow label="Notes" value={brief.notes} multiline />}
      </div>
      <BriefSubmitNav
        service="tourism"
        brief={brief}
        onBack={() => setStep(5)}
      />
    </div>
  );
};

/* ---------- Event Coverage Flow ---------- */
// Events live or die on their highlight reel — and FPV one-take openers
// are the single most-shared thing we make for festivals and crowd events,
// so the FPV deliverable leads the card grid. Night events need waivers,
// so time-of-day is surfaced early and a note prompts the user on it.

const EVENT_TYPES = [
  "Festival (music / food / cultural)",
  "Fair (county / state)",
  "Conference / summit",
  "Gala / fundraiser",
  "Sporting event / race",
  "Concert",
  "Parade / community event",
  "Trade show / expo",
  "Product launch / activation",
  "Wedding / private",
  "Other",
];

const EVENT_VENUE_TYPES = [
  "Outdoor",
  "Indoor",
  "Mixed indoor / outdoor",
];

const EVENT_TIME_OF_DAY = [
  "Daytime only",
  "Evening / golden hour",
  "Night",
  "All-day (morning through evening)",
  "Multiple sessions across the event",
];

const EVENT_SERVICES = [
  { id: "fpv-opener", title: "FPV One-Take Opener", desc: "A cinematic FPV fly-through that threads the crowd, the stage, and the venue in a single shot. The single most-shared thing we make for festivals — perfect as the opener for your highlight reel.", featured: true },
  { id: "highlight", title: "Highlight Reel", desc: "A 60–90s edit that captures the feel of the day. Built for next year's marketing." },
  { id: "social-cuts", title: "Same-Day Social Cuts", desc: "Short vertical edits delivered before the event ends — keeps the feed alive in real time." },
  { id: "sponsor-recap", title: "Sponsor Recap", desc: "Branded edit with sponsor logos and crowd shots, sized for sponsor reports and renewals." },
  { id: "aerial-photo", title: "Aerial Photography", desc: "Crowd and venue stills from the air — the wide shot that anchors the press kit." },
  { id: "ground-photo", title: "Ground Photography", desc: "Event photography on the ground — performers, attendees, signage, sponsor activations." },
  { id: "broll", title: "Full B-Roll Archive", desc: "Unedited, color-graded footage delivered to your portal for ongoing reuse." },
  { id: "timelapse", title: "Setup / Teardown Time-Lapse", desc: "Time-lapse of the build-out and breakdown — surprisingly popular for sponsor decks." },
];

const EVENT_GOALS = [
  "Next year's marketing",
  "Sponsor reports / renewals",
  "Social media",
  "Recap email to attendees",
  "Press kit",
  "Internal records",
  "Brand campaign",
  "Stakeholder / board presentation",
];

const EVENT_TURNAROUNDS = [
  "Same-day social",
  "Within 48 hours",
  "Within a week",
  "Within 2–3 weeks",
  "Flexible",
];

const EventFlow = ({ shoot, onBack }) => {
  const [step, setStep] = React.useState(1);
  const TOTAL = 5;

  const [brief, setBrief] = React.useState({
    contactName: "",
    orgName: "",
    email: "",
    phone: "",
    eventName: "",
    location: "",
    eventType: "",
    expectedAttendance: "",
    venueType: "",
    eventDates: "",
    timeOfDay: "",
    moments: "",
    services: [],
    goals: [],
    goalsOther: "",
    turnaround: "",    notes: "",
  });

  const update = (patch) => setBrief(b => ({ ...b, ...patch }));
  const toggleList = (key, value) =>
    setBrief(b => ({
      ...b,
      [key]: b[key].includes(value) ? b[key].filter(x => x !== value) : [...b[key], value],
    }));

  const goPrev = () => (step === 1 ? onBack() : setStep(s => s - 1));
  const goNext = () => setStep(s => Math.min(TOTAL + 1, s + 1));

  const canAdvance = (() => {
    if (step === 1) return brief.contactName.trim() && brief.email.trim() && brief.eventName.trim() && brief.location.trim();
    if (step === 2) return brief.eventType !== "" && brief.venueType !== "";
    if (step === 3) return brief.eventDates.trim().length > 0 && brief.timeOfDay !== "";
    if (step === 4) return brief.services.length > 0;
    if (step === 5) return brief.turnaround !== "";
    return true;
  })();

  /* ---------- STEP 1: Basics ---------- */
  if (step === 1) {
    return (
      <QStep
        shoot={shoot}
        stepNum={1} totalSteps={TOTAL}
        eyebrow="STEP 02 — Your details"
        question="First, the basics."
        helper="Who you are, the event, and where it's happening. We'll never share any of this."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Your name</label>
            <input
              className="input"
              type="text"
              placeholder="First and last"
              value={brief.contactName}
              onChange={(e) => update({ contactName: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Organization <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="text"
              placeholder="Organizer, sponsor, agency"
              value={brief.orgName}
              onChange={(e) => update({ orgName: e.target.value })}
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@email.com"
              value={brief.email}
              onChange={(e) => update({ email: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Phone <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="tel"
              placeholder="(555) 555-5555"
              value={brief.phone}
              onChange={(e) => update({ phone: e.target.value })}
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Event name</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Ann Arbor Summer Festival"
              value={brief.eventName}
              onChange={(e) => update({ eventName: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Venue or location</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Top of the Park, Ingalls Mall"
              value={brief.location}
              onChange={(e) => update({ location: e.target.value })}
            />
          </div>
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 2: About the event ---------- */
  if (step === 2) {
    return (
      <QStep
        shoot={shoot}
        stepNum={2} totalSteps={TOTAL}
        eyebrow="STEP 03 — The event"
        question="Tell us about the event."
        helper="Type, rough attendance, and whether it's indoors, outdoors, or both. Drives crew size, gear, and what's even possible aerially."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <label>Type of event</label>
          <select
            className="select"
            value={brief.eventType}
            onChange={(e) => update({ eventType: e.target.value })}
          >
            <option value="">Select…</option>
            {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Expected attendance</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. 5,000 / 'under 200' / 'we don't know yet'"
              value={brief.expectedAttendance}
              onChange={(e) => update({ expectedAttendance: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Venue type</label>
            <div className="chips">
              {EVENT_VENUE_TYPES.map(v => (
                <button
                  key={v}
                  className={`chip ${brief.venueType === v ? "active" : ""}`}
                  onClick={() => update({ venueType: v })}
                  type="button"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 3: Schedule + moments ---------- */
  if (step === 3) {
    const wantsNight = brief.timeOfDay === "Night" || brief.timeOfDay === "Evening / golden hour";
    return (
      <QStep
        shoot={shoot}
        stepNum={3} totalSteps={TOTAL}
        eyebrow="STEP 04 — Schedule"
        question="When is it, and what should we be there for?"
        helper="Date(s), time of day, and the specific moments we shouldn't miss — headliner, keynote, ribbon cutting, fireworks, etc."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <label>Event date(s)</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. July 12 — or 'Aug 8–10 (Fri–Sun)'"
            value={brief.eventDates}
            onChange={(e) => update({ eventDates: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label>Time of day</label>
          <div className="chips">
            {EVENT_TIME_OF_DAY.map(t => (
              <button
                key={t}
                className={`chip ${brief.timeOfDay === t ? "active" : ""}`}
                onClick={() => update({ timeOfDay: t })}
                type="button"
              >
                {t}
              </button>
            ))}
          </div>
          {wantsNight && (
            <p style={{ color: "var(--fg-mute)", fontSize: 12, margin: "8px 0 0" }}>
              Heads up — night drone work requires an FAA waiver and lit aircraft. We'll handle it, but flag in notes if the timing is tight.
            </p>
          )}
        </div>
        <div className="form-row">
          <label>Moments we shouldn't miss <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
          <textarea
            className="textarea q-textarea"
            placeholder="e.g. Headliner at 9pm Saturday, sponsor ribbon-cutting Friday at noon, fireworks Sunday close, kids' parade Saturday at 11."
            value={brief.moments}
            onChange={(e) => update({ moments: e.target.value })}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 4: Deliverables ---------- */
  if (step === 4) {
    return (
      <QStep
        shoot={shoot}
        stepNum={4} totalSteps={TOTAL}
        eyebrow="STEP 05 — What you need"
        question="Which deliverables do you want?"
        helper="The FPV opener up top is what makes event reels go viral — strongly worth a look if the venue allows it. Mix in anything else that fits."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="shoot-grid">
          {EVENT_SERVICES.map((svc, i) => {
            const selected = brief.services.includes(svc.id);
            return (
              <button
                key={svc.id}
                className={`shoot-card${selected ? " selected" : ""}`}
                onClick={() => toggleList("services", svc.id)}
                type="button"
              >
                <div>
                  <div className="index">
                    {String(i + 1).padStart(2, "0")} / DELIVERABLE
                    {svc.featured ? " · FEATURED" : ""}
                  </div>
                  <h3>{svc.title}</h3>
                  <p>{svc.desc}</p>
                </div>
                <div className="viz">
                  <Icon name={selected ? "check" : "plus"} size={40} />
                </div>
              </button>
            );
          })}
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 5: Goal + turnaround + notes ---------- */
  if (step === 5) {
    return (
      <QStep
        shoot={shoot}
        stepNum={5} totalSteps={TOTAL}
        eyebrow="STEP 06 — Goal &amp; timing"
        question="What's it for, and how fast do you need it?"
        helper="Turnaround drives crew size — same-day social means an on-site editor. Flag permits, restricted airspace over crowds, sponsor approval chains, or special access."
        onBack={goPrev}
        onNext={() => setStep(6)}
        nextLabel="Review brief"
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <label>What's it for?</label>
          <div className="chips">
            {EVENT_GOALS.map(g => (
              <button
                key={g}
                className={`chip ${brief.goals.includes(g) ? "active" : ""}`}
                onClick={() => toggleList("goals", g)}
                type="button"
              >
                {g}
              </button>
            ))}
          </div>
          <input
            className="input"
            type="text"
            placeholder="Other goals — comma-separate"
            value={brief.goalsOther}
            onChange={(e) => update({ goalsOther: e.target.value })}
            style={{ marginTop: 10 }}
          />
        </div>
        <div className="form-row">
          <label>Turnaround needed</label>
          <select
            className="select"
            value={brief.turnaround}
            onChange={(e) => update({ turnaround: e.target.value })}
          >
            <option value="">Select…</option>
            {EVENT_TURNAROUNDS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Anything else we should know? <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
          <textarea
            className="textarea"
            placeholder="FAA waivers / restricted airspace, crowd-overflight permits, sponsor approval chains, backstage access, performer release forms, brand guidelines, etc."
            value={brief.notes}
            onChange={(e) => update({ notes: e.target.value })}
            style={{ minHeight: 90 }}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 6: Review + submit ---------- */
  const serviceTitles = brief.services
    .map(id => (EVENT_SERVICES.find(s => s.id === id) || {}).title)
    .filter(Boolean);

  const goalsCombined = [
    ...brief.goals,
    ...brief.goalsOther.split(",").map(s => s.trim()).filter(Boolean),
  ];

  return (
    <div>
      <div className="back-link" onClick={() => setStep(5)}>
        <Icon name="back" size={12} /> Back to brief
      </div>
      <div className="shoot-detail-header" style={{ marginTop: 14 }}>
        <span className="eyebrow">{shoot.index} · STEP 07 — Review &amp; send</span>
        <h2 className="q-question">Looks good?</h2>
      </div>
      <p className="q-helper">
        Quick sanity check before we send this over. Hit Back if you want to change anything.
      </p>
      <div className="q-review">
        <ReviewRow label="Name"        value={brief.contactName} />
        <ReviewRow label="Organization" value={brief.orgName || "—"} />
        <ReviewRow label="Email"       value={brief.email} />
        <ReviewRow label="Phone"       value={brief.phone || "—"} />
        <ReviewRow label="Event"       value={brief.eventName} />
        <ReviewRow label="Venue"       value={brief.location} />
        <ReviewRow label="Type"        value={brief.eventType} />
        <ReviewRow label="Attendance"  value={brief.expectedAttendance || "—"} />
        <ReviewRow label="Setting"     value={brief.venueType} />
        <ReviewRow label="Date(s)"     value={brief.eventDates} />
        <ReviewRow label="Time of day" value={brief.timeOfDay} />
        {brief.moments && <ReviewRow label="Key moments" value={brief.moments} multiline />}
        <ReviewRow label="Deliverables" value={serviceTitles.join(", ")} />
        <ReviewRow label="Goal"        value={goalsCombined.join(", ") || "—"} />
        <ReviewRow label="Turnaround"  value={brief.turnaround} />
        {brief.notes && <ReviewRow label="Notes" value={brief.notes} multiline />}
      </div>
      <BriefSubmitNav
        service="events"
        brief={brief}
        onBack={() => setStep(5)}
      />
    </div>
  );
};

/* ---------- Drone Photography Flow ---------- */
// Simplest of the flows: aerial stills only, no edit. The questions
// just need to give us enough to scope a half-day shoot and decide how
// many finals to deliver.

const DRONE_PHOTO_SUBJECTS = [
  "Single-family home",
  "Commercial building",
  "Industrial / warehouse",
  "Manufacturing facility",
  "Retail / restaurant",
  "Land parcel",
  "Construction site",
  "Event venue",
  "Campus or grounds",
  "Other",
];

const DRONE_PHOTO_GOALS = [
  "Website / homepage",
  "Marketing materials",
  "Real estate listing",
  "Investor / lender materials",
  "Insurance / records",
  "Social media",
  "Print / brochure",
];

const DRONE_PHOTO_PACKAGES = [
  { id: "essentials", title: "Essentials",   desc: "5 finished hero stills from one short visit. Best when you just need a website header or two." },
  { id: "standard",   title: "Standard",     desc: "10–15 finished stills covering the building/lot from several angles. The most popular pick." },
  { id: "extensive",  title: "Extensive",    desc: "20+ finished stills, multiple times of day if needed. For campuses, large lots, or marketing-heavy use." },
  { id: "discuss",    title: "Let's discuss",desc: "Not sure how many you need? Pick this and we'll suggest a count in the reply." },
];

const DRONE_PHOTO_TIMING = [
  "Midday (bright, even light)",
  "Golden hour (warm, dramatic)",
  "Overcast (soft, no shadows)",
  "Twilight / dusk",
  "No preference — pick what looks best",
];

const DronePhotographyFlow = ({ shoot, onBack }) => {
  const [step, setStep] = React.useState(1);
  const TOTAL = 4;

  const [brief, setBrief] = React.useState({
    contactName: "",
    company: "",
    email: "",
    phone: "",
    subject: "",
    subjectOther: "",
    location: "",
    siteDescription: "",
    package: "",
    goals: [],
    goalsOther: "",
    timing: "",
    targetDate: "",    notes: "",
  });

  const update = (patch) => setBrief(b => ({ ...b, ...patch }));
  const toggleList = (key, value) =>
    setBrief(b => ({
      ...b,
      [key]: b[key].includes(value) ? b[key].filter(x => x !== value) : [...b[key], value],
    }));

  const goPrev = () => (step === 1 ? onBack() : setStep(s => s - 1));
  const goNext = () => setStep(s => Math.min(TOTAL + 1, s + 1));

  const canAdvance = (() => {
    if (step === 1) return brief.contactName.trim() && brief.email.trim();
    if (step === 2) return brief.subject !== "" && brief.location.trim().length > 0;
    if (step === 3) return brief.package !== "";
    if (step === 4) return true;
    return true;
  })();

  /* ---------- STEP 1: Basics ---------- */
  if (step === 1) {
    return (
      <QStep
        shoot={shoot}
        stepNum={1} totalSteps={TOTAL}
        eyebrow="STEP 02 — Your details"
        question="First, the basics."
        helper="Who you are and how to reach you. Company is optional — for personal shoots, just leave it blank."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Your name</label>
            <input
              className="input"
              type="text"
              placeholder="First and last"
              value={brief.contactName}
              onChange={(e) => update({ contactName: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Company <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="text"
              placeholder="Acme Goods Co."
              value={brief.company}
              onChange={(e) => update({ company: e.target.value })}
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@email.com"
              value={brief.email}
              onChange={(e) => update({ email: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Phone <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="tel"
              placeholder="(555) 555-5555"
              value={brief.phone}
              onChange={(e) => update({ phone: e.target.value })}
            />
          </div>
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 2: Subject + location ---------- */
  if (step === 2) {
    return (
      <QStep
        shoot={shoot}
        stepNum={2} totalSteps={TOTAL}
        eyebrow="STEP 03 — The subject"
        question="What are we photographing?"
        helper="A street address is best — parcel ID, cross-streets, or the name of the place works too. A short description helps us scope the visit."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="form-row">
          <label>Type of subject</label>
          <div className="chips">
            {DRONE_PHOTO_SUBJECTS.map(s => (
              <button
                key={s}
                className={`chip ${brief.subject === s ? "active" : ""}`}
                onClick={() => update({ subject: s })}
                type="button"
              >
                {s}
              </button>
            ))}
          </div>
          {brief.subject === "Other" && (
            <input
              className="input"
              type="text"
              placeholder="Tell us what you'd like photographed"
              value={brief.subjectOther}
              onChange={(e) => update({ subjectOther: e.target.value })}
              style={{ marginTop: 10 }}
            />
          )}
        </div>
        <div className="form-row">
          <label>Location</label>
          <input
            className="input"
            type="text"
            placeholder="Street address, parcel ID, or nearest cross-streets"
            value={brief.location}
            onChange={(e) => update({ location: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label>Quick description <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
          <textarea
            className="textarea q-textarea"
            placeholder="e.g. 12,000 sq ft warehouse with an adjacent fenced yard. Two semi bays on the east side we want featured."
            value={brief.siteDescription}
            onChange={(e) => update({ siteDescription: e.target.value })}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 3: Package + use case ---------- */
  if (step === 3) {
    return (
      <QStep
        shoot={shoot}
        stepNum={3} totalSteps={TOTAL}
        eyebrow="STEP 04 — What you need"
        question="How many photos, and what are they for?"
        helper="Pick the package that's closest — we'll confirm the final count in the quote. Knowing the end use helps us frame the shots."
        onBack={goPrev}
        onNext={goNext}
        nextDisabled={!canAdvance}
      >
        <div className="shoot-grid">
          {DRONE_PHOTO_PACKAGES.map((pkg, i) => {
            const selected = brief.package === pkg.id;
            return (
              <button
                key={pkg.id}
                className={`shoot-card${selected ? " selected" : ""}`}
                onClick={() => update({ package: pkg.id })}
                type="button"
              >
                <div>
                  <div className="index">
                    {String(i + 1).padStart(2, "0")} / PACKAGE
                  </div>
                  <h3>{pkg.title}</h3>
                  <p>{pkg.desc}</p>
                </div>
                <div className="viz">
                  <Icon name={selected ? "check" : "image"} size={40} />
                </div>
              </button>
            );
          })}
        </div>
        <div className="form-row" style={{ marginTop: 18 }}>
          <label>What are these photos for?</label>
          <div className="chips">
            {DRONE_PHOTO_GOALS.map(g => (
              <button
                key={g}
                className={`chip ${brief.goals.includes(g) ? "active" : ""}`}
                onClick={() => toggleList("goals", g)}
                type="button"
              >
                {g}
              </button>
            ))}
          </div>
          <input
            className="input"
            type="text"
            placeholder="Other uses — comma-separate"
            value={brief.goalsOther}
            onChange={(e) => update({ goalsOther: e.target.value })}
            style={{ marginTop: 10 }}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 4: Timing + notes ---------- */
  if (step === 4) {
    return (
      <QStep
        shoot={shoot}
        stepNum={4} totalSteps={TOTAL}
        eyebrow="STEP 05 — Timing"
        question="When do you need it?"
        helper="Aerial stills are mostly weather-dependent — flag any hard deadlines and we'll plan the shoot window around them."
        onBack={goPrev}
        onNext={() => setStep(5)}
        nextLabel="Review brief"
        nextDisabled={!canAdvance}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="form-row">
            <label>Light preference</label>
            <select
              className="select"
              value={brief.timing}
              onChange={(e) => update({ timing: e.target.value })}
            >
              <option value="">Select…</option>
              {DRONE_PHOTO_TIMING.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Target date <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
            <input
              className="input"
              type="text"
              placeholder="e.g. June 18 or 'next 2 weeks'"
              value={brief.targetDate}
              onChange={(e) => update({ targetDate: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row">
          <label>Anything else we should know? <span style={{ color: "var(--fg-mute)" }}>(optional)</span></label>
          <textarea
            className="textarea"
            placeholder="Access notes, gate codes, restricted airspace, sensitive neighbors, hard deadlines, brand guidelines, etc."
            value={brief.notes}
            onChange={(e) => update({ notes: e.target.value })}
            style={{ minHeight: 90 }}
          />
        </div>
      </QStep>
    );
  }

  /* ---------- STEP 5: Review + submit ---------- */
  const pkgTitle = (DRONE_PHOTO_PACKAGES.find(p => p.id === brief.package) || {}).title || "";
  const goalsCombined = [
    ...brief.goals,
    ...brief.goalsOther.split(",").map(s => s.trim()).filter(Boolean),
  ];
  const subjectLabel = brief.subject === "Other" && brief.subjectOther
    ? brief.subjectOther
    : brief.subject;

  return (
    <div>
      <div className="back-link" onClick={() => setStep(4)}>
        <Icon name="back" size={12} /> Back to brief
      </div>
      <div className="shoot-detail-header" style={{ marginTop: 14 }}>
        <span className="eyebrow">{shoot.index} · STEP 06 — Review &amp; send</span>
        <h2 className="q-question">Looks good?</h2>
      </div>
      <p className="q-helper">
        Quick sanity check before we send this over. Hit Back if you want to change anything.
      </p>
      <div className="q-review">
        <ReviewRow label="Name"        value={brief.contactName} />
        <ReviewRow label="Company"     value={brief.company || "—"} />
        <ReviewRow label="Email"       value={brief.email} />
        <ReviewRow label="Phone"       value={brief.phone || "—"} />
        <ReviewRow label="Subject"     value={subjectLabel} />
        <ReviewRow label="Location"    value={brief.location} />
        {brief.siteDescription && <ReviewRow label="Description" value={brief.siteDescription} multiline />}
        <ReviewRow label="Package"     value={pkgTitle} />
        <ReviewRow label="Use"         value={goalsCombined.join(", ") || "—"} />
        <ReviewRow label="Light"       value={brief.timing || "—"} />
        <ReviewRow label="Target date" value={brief.targetDate || "—"} />
        {brief.notes && <ReviewRow label="Notes" value={brief.notes} multiline />}
      </div>
      <BriefSubmitNav
        service="drone-photography"
        brief={brief}
        onBack={() => setStep(4)}
      />
    </div>
  );
};

const ReviewRow = ({ label, value, multiline }) => (
  <div className={`q-review-row ${multiline ? "multiline" : ""}`}>
    <span className="q-review-label">{label}</span>
    <span className="q-review-value">{value}</span>
  </div>
);

const CustomQuote = ({ onBack }) => {
  const [project, setProject] = React.useState("");
  const [scope, setScope] = React.useState([]);
  const toggle = (v) => setScope(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v]);

  return (
    <div>
      <div className="back-link" onClick={onBack}>
        <Icon name="back" size={12} /> Back to services
      </div>
      <div className="shoot-detail-header" style={{ marginTop: 14 }}>
        <h2>Tell us about your project</h2>
        <span className="eyebrow">CUSTOM · STEP 02 — Brief</span>
      </div>
      <p style={{ color: "var(--fg-dim)", fontSize: 14, maxWidth: "62ch", margin: "0 0 28px" }}>
        Anything outside the four shoot categories. Write as much or as little as you want — we'll come back within one business day with questions and an estimate.
      </p>

      <div className="form-row">
        <label>What are you making?</label>
        <textarea
          className="textarea"
          placeholder="A short film for our spring campaign. Two locations, one actor, no dialogue. Hoping to feel close to early Wong Kar-wai…"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>What does this need to do?</label>
        <div className="chips">
          {["Social", "Web hero", "Broadcast / TVC", "OOH stills", "Print", "Trade show loop", "Investor / Internal"].map(v => (
            <button key={v} className={`chip ${scope.includes(v) ? "active" : ""}`} onClick={() => toggle(v)}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label>Target completion</label>
        <input className="input" type="text" placeholder="e.g. mid-July 2026" />
      </div>

      <div className="form-row">
        <label>References, mood, links</label>
        <textarea
          className="textarea"
          placeholder="Paste links to reference films, decks, Pinterest boards. Drag files into Deliverables once we get going."
          style={{ minHeight: 100 }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button className="btn ghost" onClick={onBack}>Back</button>
        <button className="btn primary">Send brief → We respond in 1 business day</button>
      </div>
    </div>
  );
};

const QuoteModule = () => {
  // Deep-link: ?service=<slug> opens that service's brief directly.
  // Survives sign-in because the URL is unchanged through the auth gate.
  var _initSvc = (function () {
    try {
      var p = new URLSearchParams(window.location.search).get("service");
      // Only allow deep-linking to services that are currently published.
      return SHOOT_TYPES.find(function (s) { return s.id === p && !s.hidden; }) ? p : null;
    } catch (e) { return null; }
  })();
  // Deep-link: ?custom=1 (or ?service=custom) opens the "Something else" brief
  // directly — used by the "Something else" card on the public services page.
  var _initCustom = (function () {
    try {
      var q = new URLSearchParams(window.location.search);
      return q.get("custom") === "1" || q.get("service") === "custom";
    } catch (e) { return false; }
  })();
  const [stage, setStage] = React.useState(_initCustom ? "custom" : (_initSvc ? "detail" : "pick")); // pick | detail | custom
  const [pickedId, setPickedId] = React.useState(_initSvc);
  const picked = SHOOT_TYPES.find(s => s.id === pickedId);

  if (stage === "detail" && picked) {
    return <ShootDetail shoot={picked} onBack={() => setStage("pick")} />;
  }
  if (stage === "custom") {
    return <CustomQuote onBack={() => setStage("pick")} />;
  }

  return (
    <div>
      <div className="quote-intro">
        <p className="lede" style={{ margin: 0, color: "var(--fg-dim)", fontSize: 15, maxWidth: "56ch" }}>
          Start by picking the service that best fits your project. If nothing here is quite right, jump to <em className="italic">Something else</em> at the bottom and write us a brief.
        </p>
        <div className="steps">
          <div className="step active"><span className="num">1</span><span className="name">Service</span></div>
          <div className="step"><span className="num">2</span><span className="name">Brief</span></div>
          <div className="step"><span className="num">3</span><span className="name">Estimate</span></div>
        </div>
      </div>

      <div className="shoot-grid">
        {SHOOT_TYPES.filter(s => !s.hidden).map(s => (
          <ShootCard key={s.id} shoot={s} onPick={(id) => { setPickedId(id); setStage("detail"); }} />
        ))}
      </div>

      <button className="custom-quote-card" onClick={() => setStage("custom")}>
        <div>
          <div className="label">07 / FOR EVERYTHING ELSE</div>
          <div className="title serif">Something else — let's talk</div>
          <div className="desc">Something outside the six services — multi-month campaigns, mixed shoots, or an idea you're still shaping. Tell us in your own words.</div>
        </div>
        <span className="arrow"><Icon name="arrow" size={20} /></span>
      </button>
    </div>
  );
};

window.QuoteModule = QuoteModule;
