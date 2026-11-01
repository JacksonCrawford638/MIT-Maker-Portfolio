// SPAND Studio — Client Portal shell
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "paper",
  "accent": "#7d0e10",
  "density": "comfortable",
  "clientName": "Eliza Hayes",
  "projectName": "Atelier S/26"
}/*EDITMODE-END*/;

const SECTIONS = [
  { id: "quote", label: "Quote", icon: "quote", desc: "Start or continue an estimate" },
  { id: "files", label: "Deliverables", icon: "folder", desc: "Project files & masters" },
  // Current Projects and Calendar tabs retired — clients coordinate scheduling
  // by email and track progress with us directly. To re-enable, restore the
  // SECTIONS entry, the TITLES entry, the render line below, and the
  // projects.jsx / calendar.jsx <script> includes in index.html.
  // Mail tab unpublished — clients communicate by email (we reply from our inbox).
  // To re-enable, restore this entry, the `mail` TITLE, the render line below,
  // and the messages.jsx <script> include in index.html.
];

const TITLES = {
  quote: { h1: "Start a quote", lede: "Pick the service that fits your project. Each opens a page with examples and the deliverables to expect — and a button to start your brief." },
  files: { h1: "Deliverables", lede: "Everything we make for you lives here. Browse, preview, and download masters when they're signed off." },
};

// Live "new deliverables" count that drives the Deliverables tab badge.
// Counts files (not folders) added or updated since the client last
// opened the Deliverables tab. "Last seen" is stored per-user in
// localStorage, so the badge clears once they've looked.
const useNewDeliverables = (uid, section) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!uid || !window.fb) { setCount(0); return; }
    const { db, collection, query, onSnapshot } = window.fb;
    const seenKey = `spand:filesSeen:${uid}`;
    const unsub = onSnapshot(
      query(collection(db, "users", uid, "files")),
      (snap) => {
        let lastSeen = 0;
        try { lastSeen = Number(localStorage.getItem(seenKey) || 0); } catch (e) {}
        let n = 0;
        snap.forEach((d) => {
          const f = d.data();
          if (f.kind === "folder") return;
          const ms = f.updatedAt && f.updatedAt.toMillis ? f.updatedAt.toMillis() : 0;
          if (ms > lastSeen) n++;
        });
        setCount(n);
      },
      () => setCount(0),
    );
    return unsub;
  }, [uid]);

  // Opening the Deliverables tab marks everything currently there as seen.
  useEffect(() => {
    if (section === "files" && uid) {
      try { localStorage.setItem(`spand:filesSeen:${uid}`, String(Date.now())); } catch (e) {}
      setCount(0);
    }
  }, [section, uid]);

  return count;
};

const Brand = () => (
  <div className="brand">
    <div className="brand-logo">
      <img src="assets/image-placeholder.svg" alt="SPAND Studio" />
    </div>
    <div className="brand-stack">
      <span className="brand-name">SPAND<br/>STUDIO</span>
      <span className="brand-sub">+ Video & Photography</span>
    </div>
  </div>
);

// Service catalogue shown in the Quote tab — same cards as the public services
// page (window.SPAND_SERVICES, loaded in index.html). Each card links out to
// that service's detail page; from there "Get a quote" opens the brief
// (quote.html?service=<slug>). "Something else" goes straight to the custom brief.
const ServiceCatalog = () => {
  const services = (window.SPAND_SERVICES || []).filter((s) => !s.hidden);
  if (!services.length) {
    return (
      <div className="pq-cat">
        <p className="lede">
          Services are loading… if this keeps showing, browse them on{" "}
          <a href="services.html">our services page</a>.
        </p>
      </div>
    );
  }
  return (
    <div className="pq-cat">
      <div className="svc-grid svc-grid--feature">
        {services.map((s, i) => (
          <a className="svc-card" href={`services/${s.slug}.html`} key={s.slug}>
            <span className={`viz${s.img ? " photo" : ""}`}>
              <span dangerouslySetInnerHTML={{ __html: s.icon || "" }} />
              {s.img && <img src={s.img} alt="" loading="lazy" onError={(e) => e.currentTarget.remove()} />}
            </span>
            <span>
              <span className="num">{String(i + 1).padStart(2, "0")} / {services.length}</span>
              <h3>{s.title}</h3>
              <p>{s.blurb}</p>
              {(s.deliverables || []).length > 0 && (
                <ul className="svc-points">
                  {(s.deliverables || []).slice(0, 3).map((d, j) => <li key={j}>{d.name}</li>)}
                </ul>
              )}
              {(s.tags || []).length > 0 && (
                <span className="tags">
                  {(s.tags || []).map((t, j) => <span className="tag" key={j}>{t}</span>)}
                </span>
              )}
            </span>
            <span className="go"><Icon name="arrow" size={16} /></span>
          </a>
        ))}
      </div>
      <a className="else-card" href="quote.html?custom=1">
        <span className="else-text">
          <span className="else-label">FOR EVERYTHING ELSE</span>
          <span className="else-title">Something else — let's talk</span>
          <span className="else-desc">A project that isn't one of the above — a multi-shoot campaign, a mix of services, or an idea you're still shaping. Tell us in your own words and we'll build a custom plan.</span>
        </span>
        <span className="else-arrow"><Icon name="arrow" size={18} /></span>
      </a>
    </div>
  );
};

const Portal = () => {
  // Fixed brand config (the live theme/accent). The old in-portal "Tweaks"
  // editor panel was removed — clients see the finished white theme.
  const t = TWEAK_DEFAULTS;
  const [section, setSection] = useState("quote");
  const [user, auth] = useAuth();

  // Apply accent + theme via CSS vars on root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--accent-soft", t.accent + "22");
    // derive strong
    root.style.setProperty("--accent-strong", t.accent);
  }, [t.accent]);

  const themeClass =
    t.theme === "cinematic" ? "theme-cinematic" :
    t.theme === "carmine" ? "theme-carmine" : "";
  const densityClass = t.density === "dense" ? "dense" : "";

  // Real, live badge counts. Deliverables shows how many new files the
  // client hasn't seen; quote carries no badge for now.
  const newFiles = useNewDeliverables(user && user.uid, section);
  const counts = { quote: 0, files: newFiles };

  // While Firebase reports back on the initial auth state, render nothing
  // (avoids a flash of the auth screen for already-signed-in clients).
  if (auth.loading) {
    return <div className={`app-auth ${themeClass}`} />;
  }

  // Gate the portal behind sign-in / create-account.
  if (!user) {
    return (
      <div className={`app-auth ${themeClass}`}>
        <AuthScreen api={auth} />
      </div>
    );
  }

  // Email/password users must verify before they get the portal.
  // Google sign-ins are pre-verified by Google so they skip this screen.
  if (user.providerId === "password" && !user.emailVerified) {
    return (
      <div className={`app-auth ${themeClass}`}>
        <VerifyScreen user={user} api={auth} />
      </div>
    );
  }

  const displayName = user.name || t.clientName;

  return (
    <div className={`app ${themeClass} ${densityClass}`}>
      <aside className="rail">
        <a className="home-link" href="landing.html">
          <Icon name="back" size={13} />
          <span>Back to site</span>
        </a>
        <Brand />
        <nav className="nav">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`nav-item ${section === s.id ? "active" : ""}`}
              onClick={() => setSection(s.id)}
            >
              <Icon name={s.icon} size={15} />
              <span>{s.label}</span>
              {counts[s.id] > 0 && (
                <span className="badge">{counts[s.id]}</span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1 }}></div>
        <div className="rail-footer">
          <div className="avatar">{(displayName || "E").trim().charAt(0).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div className="client-name">{displayName}</div>
            <div className="client-meta">{t.projectName.toUpperCase()}</div>
          </div>
          <button className="signout" title="Sign out" onClick={auth.signOut}>
            <Icon name="logout" size={15} />
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">CLIENT PORTAL · {(t.projectName || "PROJECT").toUpperCase()}</span>
            <h1 style={{ marginTop: 8 }}>{TITLES[section].h1}</h1>
            <p className="lede">{TITLES[section].lede}</p>
          </div>
          <div className="topbar-meta">
            <div>WASHTENAW COUNTY · {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}</div>
            <div>SPANDSTUDIO.COM</div>
            <div>810 · 263 · 0979</div>
          </div>
        </header>

        <div>
          {section === "quote" && <ServiceCatalog />}
          {section === "files" && <DeliverablesModule />}
        </div>
      </main>
    </div>
  );
};

// Wait for Firebase to initialize before mounting React so window.fb is
// guaranteed to exist when useAuth's effect runs.
window.firebaseReady.then(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(<Portal />);
});
