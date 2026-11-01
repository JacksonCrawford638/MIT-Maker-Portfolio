// SPAND Studio — Client Portal auth gate (Firebase Auth + Firestore)
// ─────────────────────────────────────────────────────────────
// Firebase is initialized in index.html and exposed on window.fb.
// The React tree only mounts after window.firebaseReady resolves,
// so window.fb is guaranteed to exist by the time useAuth runs.
// ─────────────────────────────────────────────────────────────

// Map Firebase error codes to messages safe to show to a client.
// We deliberately avoid leaking which step failed — email enumeration
// protection should be ON in Firebase console so wrong-password vs
// unknown-account collapse into one generic error.
const friendlyAuthError = (err) => {
  const code = (err && err.code) || "";
  switch (code) {
    case "auth/invalid-email":         return "That doesn't look like a valid email address.";
    case "auth/missing-password":      return "Enter your password.";
    case "auth/weak-password":         return "Password is too weak. Use at least 8 characters with a number or symbol.";
    case "auth/email-already-in-use":  return "An account with that email already exists. Try signing in.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":        return "Email or password is incorrect.";
    case "auth/too-many-requests":     return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":return "Network problem. Check your connection and retry.";
    case "auth/popup-blocked":         return "Your browser blocked the Google sign-in popup. Allow popups for this site and retry.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request": return ""; // user dismissed, no error to show
    case "auth/account-exists-with-different-credential":
      return "An account already exists with that email using a different sign-in method.";
    default: return "Something went wrong. Try again, or message us if it keeps happening.";
  }
};

// Lightweight password strength check that runs before we even call Firebase.
// Firebase's own password-policy (set in console) is the source of truth; this
// is just a fast client-side gate to avoid a roundtrip on obvious failures.
const validatePassword = (pw) => {
  if (!pw || pw.length < 8) return "Use at least 8 characters.";
  if (!/[^A-Za-z]/.test(pw)) return "Add at least one number or symbol.";
  return null;
};

// useAuth — returns [user, api]. user is null while loading or signed out.
// user shape: { uid, email, name, emailVerified, providerId, isNew }
const useAuth = () => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const { auth, onAuthStateChanged } = window.fb;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser({
          uid: u.uid,
          email: u.email,
          name: u.displayName || (u.email ? u.email.split("@")[0] : ""),
          emailVerified: u.emailVerified,
          providerId: (u.providerData[0] && u.providerData[0].providerId) || "password",
          isNew: false,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signUp = async ({ name, email, password }) => {
    const { auth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } = window.fb;
    const bad = validatePassword(password);
    if (bad) throw { code: "auth/weak-password", message: bad };
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name && name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
    // Fire-and-await: send verification email immediately after sign-up.
    await sendEmailVerification(cred.user);
  };

  const signIn = async ({ email, password }) => {
    const { auth, signInWithEmailAndPassword } = window.fb;
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signInWithGoogle = async () => {
    const { auth, signInWithPopup, GoogleAuthProvider } = window.fb;
    const provider = new GoogleAuthProvider();
    // Force account chooser every time — safer on shared computers.
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  };

  const signOutNow = async () => {
    const { auth, signOut } = window.fb;
    await signOut(auth);
  };

  // Resend verification + re-read the current user so emailVerified updates
  // after the client clicks the link in their inbox.
  const resendVerification = async () => {
    const { auth, sendEmailVerification } = window.fb;
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  };
  const refreshUser = async () => {
    const { auth, reload } = window.fb;
    if (auth.currentUser) {
      await reload(auth.currentUser);
      const u = auth.currentUser;
      setUser({
        uid: u.uid,
        email: u.email,
        name: u.displayName || (u.email ? u.email.split("@")[0] : ""),
        emailVerified: u.emailVerified,
        providerId: (u.providerData[0] && u.providerData[0].providerId) || "password",
        isNew: false,
      });
    }
  };

  const sendPasswordReset = async (email) => {
    const { auth, sendPasswordResetEmail } = window.fb;
    await sendPasswordResetEmail(auth, email.trim());
  };

  // Lead capture for the "message the studio" path. No account is created
  // here — the studio reviews leads in Firestore and sets the client up
  // manually. Security rules must allow `leads` create-only.
  const sendMessage = async ({ name, email, phone, message }) => {
    const { db, collection, addDoc, serverTimestamp } = window.fb;
    await addDoc(collection(db, "leads"), {
      name: (name || "").trim().slice(0, 200),
      email: (email || "").trim().slice(0, 200),
      phone: (phone || "").trim().slice(0, 50),
      message: (message || "").trim().slice(0, 4000),
      createdAt: serverTimestamp(),
      source: "portal-auth-screen",
      userAgent: (navigator.userAgent || "").slice(0, 400),
    });
  };

  return [user, {
    loading,
    signUp, signIn, signInWithGoogle,
    signOut: signOutNow,
    resendVerification, refreshUser,
    sendPasswordReset,
    sendMessage,
  }];
};

const Field = ({ icon, label, type = "text", value, onChange, placeholder, autoComplete, error }) => (
  <label className="auth-field">
    <span className="auth-label">{label}</span>
    <span className={`auth-input-wrap ${error ? "err" : ""}`}>
      <Icon name={icon} size={15} />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </span>
  </label>
);

const AuthScreen = ({ api }) => {
  const [mode, setMode] = React.useState("signin"); // signin | signup | message
  const isSignup = mode === "signup";
  const isMessage = mode === "message";

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState(""); // non-error feedback (e.g. reset email sent)

  // message-the-studio path (no account)
  const [mName, setMName] = React.useState("");
  const [mEmail, setMEmail] = React.useState("");
  const [mPhone, setMPhone] = React.useState("");
  const [mBody, setMBody] = React.useState("");
  const [sent, setSent] = React.useState(false);

  const reset = () => { setError(""); setNotice(""); };
  const swap = (m) => { setMode(m); reset(); };

  const submit = async (e) => {
    e.preventDefault();
    reset();
    if (!email.trim()) return setError("Enter your email address.");
    if (!password) return setError("Enter a password.");
    if (isSignup && password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    try {
      if (isSignup) await api.signUp({ name, email, password });
      else await api.signIn({ email, password });
      // onAuthStateChanged in useAuth re-renders the tree into the portal.
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true); reset();
    try { await api.signInWithGoogle(); }
    catch (err) {
      const msg = friendlyAuthError(err);
      if (msg) setError(msg);
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    reset();
    if (!email.trim()) {
      setError("Enter your email above first, then click Forgot password.");
      return;
    }
    setBusy(true);
    try {
      await api.sendPasswordReset(email);
      // With email enumeration protection on, this succeeds whether or not
      // the account exists. The wording matches that reality.
      setNotice("If an account exists for that email, we've sent a reset link.");
    } catch (err) {
      setError(friendlyAuthError(err));
    }
    setBusy(false);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    reset();
    if (!mName.trim()) return setError("Let us know your name.");
    if (!mEmail.trim()) return setError("Add an email so we can reach you.");
    if (!mBody.trim()) return setError("Tell us a little about the project.");
    setBusy(true);
    try {
      await api.sendMessage({ name: mName, email: mEmail, phone: mPhone, message: mBody });
      setSent(true);
    } catch (err) {
      setError("Couldn't send your message. Try again, or email us directly.");
    }
    setBusy(false);
  };

  return (
    <div className="auth">
      {/* ── Left: cinematic brand panel ── */}
      <aside className="auth-aside">
        <div className="auth-aside-grain"></div>
        <div className="auth-coords">42.2808° N · 83.7430° W<br/>WASHTENAW COUNTY · MI</div>
        <div className="auth-aside-top">
          <div className="brand">
            <div className="brand-logo"><img src="assets/image-placeholder.svg" alt="SPAND Studio" /></div>
            <div className="brand-stack">
              <span className="brand-name" style={{ color: "#f6f1e0" }}>SPAND<br/>STUDIO</span>
              <span className="brand-sub" style={{ color: "#b3aa92" }}>+ Aerial Video &amp; Photography</span>
            </div>
          </div>
        </div>
        <div className="auth-aside-mid">
          {isMessage ? (
            <React.Fragment>
              <h2>Something<br/><em>more custom?</em></h2>
              <p>Skip the form. Tell us what you have in mind and we'll set up your portal and send your sign-in — no account needed up front.</p>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <h2>Your footage,<br/><em>ready when you are.</em></h2>
              <p>Quotes, deliverables, and masters — all in one place. Sign in to pick up your project where it left off.</p>
            </React.Fragment>
          )}
        </div>
        <div className="auth-aside-foot">
          <span>SPANDSTUDIO.COM</span>
          <span>810 · 263 · 0979</span>
        </div>
      </aside>

      {/* ── Right: form ── */}
      <main className="auth-main">
        <div className="auth-card">
          <a className="auth-home" href="landing.html"><Icon name="back" size={12} /> Back to site</a>

          {sent ? (
            /* ── success after messaging the studio ── */
            <div className="auth-sent">
              <div className="auth-sent-mark"><Icon name="check" size={26} /></div>
              <h1>Message sent</h1>
              <p className="auth-sub">
                Thanks{mName ? `, ${mName.split(" ")[0]}` : ""} — we've got it. We'll review your project and get back to you at <strong>{mEmail}</strong> within one business day. If it's a fit, we'll set up your portal and email your sign-in details.
              </p>
              <div className="auth-sent-meta">
                <span>USUALLY REPLIES IN 1 BUSINESS DAY</span>
                <span>810 · 263 · 0979</span>
              </div>
              <button className="btn auth-submit" onClick={() => { setSent(false); swap("signin"); }}>
                <Icon name="back" size={15} /> Back to sign in
              </button>
            </div>
          ) : isMessage ? (
            /* ── message the studio (no account) ── */
            <React.Fragment>
              <div className="auth-eyebrow">No account needed</div>
              <h1>Tell us about your project</h1>
              <p className="auth-sub">
                Got something custom or one-off? Send us the details and we'll take it from there — we'll set up your account and send your sign-in if we move forward.
              </p>

              <form onSubmit={sendMessage} className="auth-form">
                <Field icon="user" label="Your name" value={mName} onChange={setMName}
                  placeholder="Eliza Hayes" autoComplete="name" />
                <Field icon="mail" label="Email" type="email" value={mEmail} onChange={setMEmail}
                  placeholder="you@company.com" autoComplete="email" />
                <Field icon="quote" label="Phone (optional)" type="tel" value={mPhone} onChange={setMPhone}
                  placeholder="810 · 263 · 0979" autoComplete="tel" />
                <label className="auth-field">
                  <span className="auth-label">What are you thinking?</span>
                  <textarea
                    className="auth-textarea"
                    value={mBody}
                    onChange={(e) => setMBody(e.target.value)}
                    placeholder="A one-take FPV flight through our new facility, plus a 60-second promo for the website. Hoping to shoot sometime next month…"
                  />
                </label>

                {error && <div className="auth-error"><Icon name="info" size={14} /> {error}</div>}

                <button type="submit" className="btn primary auth-submit" disabled={busy}>
                  {busy ? "Sending…" : "Send message"}
                  {!busy && <Icon name="arrow" size={16} />}
                </button>
              </form>

              <p className="auth-switch">
                Already a client?{" "}
                <button onClick={() => swap("signin")}>Sign in</button>
              </p>
            </React.Fragment>
          ) : (
            /* ── sign in / create account ── */
            <React.Fragment>
              <div className="auth-tabs">
                <button className={!isSignup ? "active" : ""} onClick={() => swap("signin")}>Sign in</button>
                <button className={isSignup ? "active" : ""} onClick={() => swap("signup")}>Create account</button>
              </div>

              <h1>{isSignup ? "Create your account" : "Welcome back"}</h1>
              <p className="auth-sub">
                {isSignup
                  ? "Set up a client account to start a quote and track your project."
                  : "Sign in to your SPAND Studio client portal."}
              </p>

              <button className="auth-google" onClick={google} disabled={busy}>
                <Icon name="google" size={17} /> Continue with Google
              </button>

              <div className="auth-divider"><span>or {isSignup ? "sign up" : "sign in"} with email</span></div>

              <form onSubmit={submit} className="auth-form">
                {isSignup && (
                  <Field icon="user" label="Full name" value={name} onChange={setName}
                    placeholder="Eliza Hayes" autoComplete="name" />
                )}
                <Field icon="mail" label="Email" type="email" value={email} onChange={setEmail}
                  placeholder="you@company.com" autoComplete="email" />
                <Field icon="lock" label="Password" type="password" value={password} onChange={setPassword}
                  placeholder={isSignup ? "At least 8 characters" : "••••••••"}
                  autoComplete={isSignup ? "new-password" : "current-password"} />
                {isSignup && (
                  <Field icon="lock" label="Confirm password" type="password" value={confirm} onChange={setConfirm}
                    placeholder="Re-enter password" autoComplete="new-password" />
                )}

                {!isSignup && (
                  <div className="auth-row-end">
                    <a href="#" onClick={(e) => { e.preventDefault(); forgotPassword(); }}>Forgot password?</a>
                  </div>
                )}

                {error && <div className="auth-error"><Icon name="info" size={14} /> {error}</div>}
                {notice && !error && <div className="auth-error" style={{ color: "var(--fg)" }}><Icon name="check" size={14} /> {notice}</div>}

                <button type="submit" className="btn primary auth-submit" disabled={busy}>
                  {busy ? "One moment…" : isSignup ? "Create account" : "Sign in"}
                  {!busy && <Icon name="arrow" size={16} />}
                </button>
              </form>

              <p className="auth-switch">
                {isSignup ? "Already have an account? " : "New here? "}
                <button onClick={() => swap(isSignup ? "signin" : "signup")}>
                  {isSignup ? "Sign in" : "Create one"}
                </button>
              </p>

              {/* message-the-studio entry */}
              <div className="auth-alt">
                <div className="auth-alt-line">
                  <span>Rather not set up an account yet?</span>
                </div>
                <button className="auth-alt-btn" onClick={() => swap("message")}>
                  <Icon name="chat" size={16} />
                  <span>
                    <strong>Message us about a custom project</strong>
                    <small>We'll set up your portal and send your sign-in.</small>
                  </span>
                  <Icon name="chev" size={16} />
                </button>
              </div>

              <p className="auth-legal">
                By continuing you acknowledge our <a href="privacy.html">Privacy Policy</a>.
              </p>
            </React.Fragment>
          )}
        </div>
      </main>
    </div>
  );
};

// Email-verification gate — shown after sign-up but before portal access.
// Google sign-ins skip this because Google has already verified the email.
const VerifyScreen = ({ user, api }) => {
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");

  const resend = async () => {
    setBusy(true); setNotice(""); setError("");
    try {
      await api.resendVerification();
      setNotice("Sent. Check your inbox (and spam folder).");
    } catch (err) {
      setError(friendlyAuthError(err));
    }
    setBusy(false);
  };

  const check = async () => {
    setBusy(true); setNotice(""); setError("");
    try {
      await api.refreshUser();
      // If still not verified, surface a note. If verified, the parent
      // re-renders into the portal automatically.
      setNotice("Still not verified. Click the link in the email, then try again.");
    } catch (err) {
      setError("Couldn't check status. Try again.");
    }
    setBusy(false);
  };

  return (
    <div className="auth">
      <aside className="auth-aside">
        <div className="auth-aside-grain"></div>
        <div className="auth-aside-top">
          <div className="brand">
            <div className="brand-logo"><img src="assets/image-placeholder.svg" alt="SPAND Studio" /></div>
            <div className="brand-stack">
              <span className="brand-name" style={{ color: "#f6f1e0" }}>SPAND<br/>STUDIO</span>
              <span className="brand-sub" style={{ color: "#b3aa92" }}>+ Aerial Video &amp; Photography</span>
            </div>
          </div>
        </div>
        <div className="auth-aside-mid">
          <h2>One more<br/><em>quick step.</em></h2>
          <p>We sent a verification link to your email. Click it to unlock your portal — keeps your project files locked to you.</p>
        </div>
        <div className="auth-aside-foot">
          <span>SPANDSTUDIO.COM</span>
          <span>810 · 263 · 0979</span>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-eyebrow">Verify your email</div>
          <h1>Check your inbox</h1>
          <p className="auth-sub">
            We sent a verification link to <strong>{user.email}</strong>. Click it, then come back here and tap <em>I've verified</em>.
          </p>
          {error && <div className="auth-error"><Icon name="info" size={14} /> {error}</div>}
          {notice && !error && <div className="auth-error" style={{ color: "var(--fg)" }}><Icon name="check" size={14} /> {notice}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
            <button className="btn primary auth-submit" onClick={check} disabled={busy}>
              {busy ? "Checking…" : "I've verified — continue"}
              {!busy && <Icon name="arrow" size={16} />}
            </button>
            <button className="btn auth-submit" onClick={resend} disabled={busy}>
              Resend verification email
            </button>
            <button className="btn auth-submit" onClick={api.signOut} disabled={busy} style={{ background: "transparent" }}>
              Use a different account
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

window.useAuth = useAuth;
window.AuthScreen = AuthScreen;
window.VerifyScreen = VerifyScreen;
