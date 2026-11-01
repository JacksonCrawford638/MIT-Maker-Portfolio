// SPAND Studio — Deliverables (live)
// ───────────────────────────────────────────────────────────────
// Pulls the file index from Firestore (users/{uid}/files), shapes
// it into a tree, and lets clients:
//   - browse folders + search
//   - preview images and videos via the low-res versions written by
//     the onFileFinalized Cloud Function
//   - download a single file (signed Storage URL)
//   - request a zip of the whole project (or current folder) via
//     the requestZip callable
// ───────────────────────────────────────────────────────────────

// ── format helpers ─────────────────────────────────────────────
const fmtBytes = (n) => {
  if (!n || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

const fileIcon = (type) => ({
  folder: "folder", image: "image", video: "video", doc: "doc", archive: "archive",
}[type] || "doc");

// ── live file index hook ───────────────────────────────────────
// Subscribes to users/{uid}/files. Returns:
//   { loading, error, rows }  where rows is the flat list of docs.
const useFileIndex = (uid) => {
  const [state, setState] = React.useState({ loading: true, error: null, rows: [] });
  React.useEffect(() => {
    if (!uid) return;
    const { db, collection, query, orderBy, onSnapshot } = window.fb;
    const q = query(
      collection(db, "users", uid, "files"),
      orderBy("path", "asc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setState({ loading: false, error: null, rows });
      },
      (err) => {
        console.error("file index subscribe failed:", err);
        setState({ loading: false, error: err, rows: [] });
      },
    );
    return unsub;
  }, [uid]);
  return state;
};

// Build a tree of folder nodes from the flat docs so the sidebar
// can render nested chevrons. Files are NOT in this tree; the file
// list pane queries the flat rows directly using parent === path.
const buildFolderTree = (rows) => {
  const root = { name: "All projects", path: "", type: "root", children: [] };
  const byPath = new Map();
  byPath.set("", root);

  const folders = rows.filter(r => r.kind === "folder")
    .sort((a, b) => a.path.localeCompare(b.path));

  for (const f of folders) {
    const node = { name: f.name, path: f.path, type: "folder", children: [] };
    byPath.set(f.path, node);
    const parent = byPath.get(f.parent || "") || root;
    parent.children.push(node);
  }
  return root;
};

// ── sidebar folder tree ────────────────────────────────────────
const Tree = ({ node, depth = 0, currentPath, onNavigate }) => {
  const [open, setOpen] = React.useState(depth < 2);
  const isCurrent = currentPath === node.path;
  return (
    <div>
      <div
        className={`tree-row ${isCurrent ? "active" : ""}`}
        style={{ paddingLeft: 18 + depth * 14 }}
        onClick={() => { setOpen(o => !o); onNavigate(node.path); }}
      >
        <span className="chev"><Icon name={open ? "chevD" : "chev"} size={10} /></span>
        <span className="ic"><Icon name="folder" size={14} /></span>
        <span>{node.name}</span>
      </div>
      {open && node.children && node.children.map((c, i) => (
        <Tree key={c.path || i} node={c} depth={depth + 1} currentPath={currentPath} onNavigate={onNavigate} />
      ))}
    </div>
  );
};

// ── preview modal ──────────────────────────────────────────────
// Shows a low-res preview of an image or video. Uses the previewPath
// written by the Cloud Function — never the original, which can be
// hundreds of MB. For doc/archive types we show metadata and a
// download button only.
// Fetch a short-lived signed URL for a full-res master and open it.
// getMasterUrl checks the file belongs to this client, then mints the URL.
// Files are available as soon as the studio uploads them (no payment gate).
const downloadMaster = async (item) => {
  try {
    const { functions, httpsCallable } = window.fb;
    const call = httpsCallable(functions, "getMasterUrl");
    const res = await call({ path: item.storagePath });
    const url = res.data && res.data.url;
    if (!url) throw new Error("No download URL returned.");
    window.open(url, "_blank");
  } catch (e) {
    alert((e && e.message) || "Couldn't start the download.");
  }
};

const PreviewModal = ({ item, onClose }) => {
  const [url, setUrl] = React.useState(null);
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    if (!item) return;
    let cancelled = false;
    const { storage, storageRef, getDownloadURL } = window.fb;

    // Preview URL (low-res). Some files won't have one (docs, archives,
    // or files that landed before the function ran).
    (async () => {
      try {
        if (item.previewPath) {
          const u = await getDownloadURL(storageRef(storage, item.previewPath));
          if (!cancelled) setUrl(u);
        }
      } catch (e) {
        if (!cancelled) setErr("Preview isn't ready yet — try again in a minute.");
      }
    })();

    return () => { cancelled = true; };
  }, [item && item.id]);

  if (!item) return null;

  const stop = (e) => e.stopPropagation();

  return (
    <div className="preview-backdrop" onClick={onClose}>
      <div className="preview-modal" onClick={stop}>
        <div className="preview-head">
          <div>
            <div className="preview-title">{item.name}</div>
            <div className="preview-meta">{fmtBytes(item.size)} · {item.type}</div>
          </div>
          <div className="preview-actions">
            <button className="btn sm primary" onClick={() => downloadMaster(item)}>
              <Icon name="download" size={12} /> Download original
            </button>
            <button className="icon-btn" onClick={onClose} title="Close"><Icon name="back" size={14} /></button>
          </div>
        </div>
        {(item.type === "image" || item.type === "video") && (
          <div className="preview-notice">
            <span className="preview-notice-dot" aria-hidden="true"></span>
            <span>
              <strong>Preview only — heavily compressed.</strong>{" "}
              The {item.type === "image" ? "image" : "video"} you see here is a low-res proxy for fast loading.
              Hit <strong>Download original</strong> (or use “Download all” to grab the zip) for the full-quality master.
            </span>
          </div>
        )}
        <div className="preview-body">
          {err && <div className="preview-empty">{err}</div>}
          {!err && item.type === "image" && url && (
            <img src={url} alt={item.name} />
          )}
          {!err && item.type === "video" && url && (
            <video src={url} controls preload="metadata" playsInline />
          )}
          {!err && item.type === "video" && !url && (
            <div className="preview-empty">Generating preview… this can take a minute for large videos.</div>
          )}
          {!err && item.type === "image" && !url && (
            <div className="preview-empty">Loading preview…</div>
          )}
          {(item.type === "doc" || item.type === "archive") && (
            <div className="preview-empty">
              No preview for {item.type === "doc" ? "documents" : "archives"}.
              {" Use the Download button above."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── main module ────────────────────────────────────────────────
const DeliverablesModule = () => {
  const [user] = useAuth();
  const uid = user && user.uid;
  const { loading, error, rows } = useFileIndex(uid);

  const [path, setPath] = React.useState("");
  const [view, setView] = React.useState("list"); // list | grid
  const [selected, setSelected] = React.useState(null);
  const [previewing, setPreviewing] = React.useState(null);
  const [query, setQuery] = React.useState("");
  const [zipState, setZipState] = React.useState({ busy: false, error: null });

  const tree = React.useMemo(() => buildFolderTree(rows), [rows]);

  // Items shown in the right pane: every doc whose parent === current path.
  // Folders sort first, then files; query filters by name.
  const itemsAll = React.useMemo(() => {
    const list = rows.filter(r => (r.parent || "") === path);
    list.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [rows, path]);

  const items = query
    ? itemsAll.filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
    : itemsAll;

  const totalBytes = itemsAll.reduce((acc, i) => acc + (i.size || 0), 0);

  const breadcrumb = path ? path.split("/") : [];

  // Open: folder → descend; file → open preview modal.
  const open = (item) => {
    if (item.kind === "folder") {
      setPath(item.path);
      setSelected(null);
    } else {
      setPreviewing(item);
    }
  };

  // Single-file download — routed through the getMasterUrl function, which
  // verifies ownership and mints a short-lived signed URL (no direct Storage
  // access to masters).
  const downloadSelected = async () => {
    const item = items.find(i => i.id === selected);
    if (!item || item.kind !== "file") return;
    await downloadMaster(item);
  };

  // Bundle the current folder (or whole project if at root) into a zip
  // server-side and open the signed URL when ready.
  const downloadBundle = async () => {
    setZipState({ busy: true, error: null });
    try {
      const { functions, httpsCallable } = window.fb;
      const requestZip = httpsCallable(functions, "requestZip");
      const result = await requestZip({ folder: path || "" });
      const url = result && result.data && result.data.url;
      if (!url) throw new Error("No URL returned");
      window.open(url, "_blank", "noopener");
      setZipState({ busy: false, error: null });
    } catch (e) {
      console.error("zip request failed:", e);
      const msg = (e && e.message) || "Couldn't build the zip.";
      setZipState({ busy: false, error: msg });
    }
  };

  // Empty-state copy depends on whether we're at the root or in a sub-
  // folder. At the root with zero files, the studio hasn't uploaded yet.
  const emptyCopy = path
    ? "Empty folder."
    : (rows.length === 0
        ? "No deliverables yet. We'll let you know as soon as the first files land here."
        : "Empty folder.");

  return (
    <div className="files-shell">
      <aside className="files-side">
        <h4>Locations</h4>
        {loading && <div className="tree-row" style={{ color: "var(--fg-mute)" }}>Loading…</div>}
        {!loading && <Tree node={tree} currentPath={path} onNavigate={setPath} />}
        <h4 style={{ marginTop: 22 }}>Shortcuts</h4>
        <div className="tree-row" style={{ color: "var(--fg-dim)" }}>
          <span className="chev"></span>
          <span className="ic" style={{ color: "var(--accent)" }}><Icon name="download" size={14} /></span>
          <span>Download everything</span>
        </div>
      </aside>

      <main className="files-main">
        <div className="files-toolbar">
          <button
            className="icon-btn"
            disabled={!path}
            onClick={() => {
              const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
              setPath(parent);
            }}
            style={!path ? { opacity: 0.3, cursor: "default" } : {}}
            title="Back"
          ><Icon name="back" size={14} /></button>
          <div className="crumbs">
            <span className="crumb" onClick={() => setPath("")}>~ / Projects</span>
            {breadcrumb.map((seg, i) => (
              <React.Fragment key={i}>
                <span className="crumb-sep">/</span>
                <span className={`crumb ${i === breadcrumb.length - 1 ? "current" : ""}`}
                      onClick={() => setPath(breadcrumb.slice(0, i + 1).join("/"))}>{seg}</span>
              </React.Fragment>
            ))}
          </div>
          <input
            className="search"
            placeholder="Search this folder…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className={`icon-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}><Icon name="list" size={14} /></button>
          <button className={`icon-btn ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")}><Icon name="grid" size={14} /></button>
          {(() => {
            // Button label + behaviour depend on where the client is:
            //   /                   → "Pick a project" (disabled — zipping every
            //                         project together is almost never what they
            //                         want; the file would be enormous)
            //   /ProjectName        → "Download project" (zips the whole project)
            //   /ProjectName/Sub..  → "Zip folder" (zips that sub-folder)
            const depth = breadcrumb.length;
            const isRoot = depth === 0;
            const isProjectRoot = depth === 1;
            const label = isRoot
              ? "Pick a project"
              : isProjectRoot ? "Download project" : "Zip folder";
            const tooltip = isRoot
              ? "Open a project before downloading"
              : isProjectRoot
                ? "Bundle the whole project into a zip"
                : "Bundle this folder into a zip";
            const disabled = zipState.busy || rows.length === 0 || isRoot;
            return (
              <button
                className="btn sm"
                onClick={downloadBundle}
                disabled={disabled}
                style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                title={tooltip}
              >
                <Icon name="archive" size={12} />{" "}
                {zipState.busy ? "Building zip…" : label}
              </button>
            );
          })()}
          <button className="btn sm primary"
                  disabled={!selected}
                  onClick={downloadSelected}
                  style={!selected ? { opacity: 0.4, cursor: "not-allowed" } : {}}>
            <Icon name="download" size={12} /> Download
          </button>
        </div>

        {zipState.error && (
          <div style={{ padding: "8px 18px", color: "var(--accent)", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
            {zipState.error}
          </div>
        )}

        {error ? (
          <div style={{ padding: "40px 18px", color: "var(--fg-mute)", fontSize: 12, textAlign: "center" }}>
            Couldn't load your files. Refresh, or message us if it keeps happening.
          </div>
        ) : view === "list" ? (
          <div className="files-list">
            <div className="files-row-head">
              <span>Name</span>
              <span className="f-size">Size</span>
              <span className="f-modified">Modified</span>
            </div>
            {loading && (
              <div style={{ padding: "40px 18px", color: "var(--fg-mute)", fontFamily: "JetBrains Mono, monospace", fontSize: 12, textAlign: "center" }}>
                Loading deliverables…
              </div>
            )}
            {!loading && items.length === 0 && (
              <div style={{ padding: "40px 18px", color: "var(--fg-mute)", fontFamily: "JetBrains Mono, monospace", fontSize: 12, textAlign: "center" }}>
                {emptyCopy}
              </div>
            )}
            {items.map((item) => (
              <div
                key={item.id}
                className={`files-row ${selected === item.id ? "selected" : ""}`}
                onClick={() => { if (item.kind === "folder") open(item); else setSelected(item.id); }}
                onDoubleClick={() => open(item)}
              >
                <div className="f-name">
                  <span className="f-ic"><Icon name={fileIcon(item.kind === "folder" ? "folder" : item.type)} size={16} /></span>
                  <span className="nm">{item.name}</span>
                </div>
                <span className="f-meta f-size">{item.kind === "folder" ? "—" : fmtBytes(item.size)}</span>
                <span className="f-meta f-modified">{fmtDate(item.updatedAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="files-grid">
            {items.map((item) => (
              <div
                key={item.id}
                className={`tile ${selected === item.id ? "selected" : ""}`}
                onClick={() => { if (item.kind === "folder") open(item); else setSelected(item.id); }}
                onDoubleClick={() => open(item)}
              >
                <div className="thumb"><Icon name={fileIcon(item.kind === "folder" ? "folder" : item.type)} size={28} /></div>
                <div className="tname">{item.name}</div>
                <div className="tmeta">{item.kind === "folder" ? "—" : fmtBytes(item.size)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="files-statusbar">
          <span>{items.length} items{selected ? ` · 1 selected` : ""}</span>
          <span>{fmtBytes(totalBytes)} in view</span>
        </div>
      </main>

      <PreviewModal item={previewing} onClose={() => setPreviewing(null)} />
    </div>
  );
};

// `useAuth` is defined in auth.jsx but the babel-standalone load order
// can put deliverables.jsx ahead of it on first parse. By the time the
// component renders, auth.jsx has been parsed and useAuth is in scope.

window.DeliverablesModule = DeliverablesModule;
