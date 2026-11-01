// Tiny icon library — line-art, 1.5 stroke
const Icon = ({ name, size = 16, color = "currentColor", style = {} }) => {
  const stroke = color;
  const props = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke, strokeWidth: 1.5,
    strokeLinecap: "round", strokeLinejoin: "round",
    style,
  };
  const paths = {
    quote: <><path d="M4 6h16M4 12h10M4 18h16"/></>,
    folder: <><path d="M3 6.5a1.5 1.5 0 0 1 1.5-1.5h4.2c.4 0 .8.15 1.06.42L11.5 7H19.5a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-11Z"/></>,
    activity: <><path d="M3 12h4l2-6 4 12 2-6h6"/></>,
    chat: <><path d="M4 5h16v11H8l-4 3V5Z"/></>,
    search: <><circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/></>,
    grid: <><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></>,
    list: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="4" cy="6" r="0.6" fill={stroke}/><circle cx="4" cy="12" r="0.6" fill={stroke}/><circle cx="4" cy="18" r="0.6" fill={stroke}/></>,
    download: <><path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14"/></>,
    upload: <><path d="M12 20V8m0 0-4 4m4-4 4 4M5 4h14"/></>,
    chev: <><path d="m9 6 6 6-6 6"/></>,
    chevD: <><path d="m6 9 6 6 6-6"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    check: <><path d="m5 12 5 5L20 7"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="9" cy="10" r="2"/><path d="m3 17 5-5 5 5 3-3 5 5"/></>,
    video: <><rect x="3" y="6" width="13" height="12" rx="1"/><path d="m16 10 5-3v10l-5-3"/></>,
    doc: <><path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></>,
    archive: <><rect x="3" y="4" width="18" height="4"/><path d="M4 8v12h16V8M10 12h4"/></>,
    arrow: <><path d="M5 12h14m0 0-5-5m5 5-5 5"/></>,
    back: <><path d="M19 12H5m0 0 5 5m-5-5 5-5"/></>,
    user: <><circle cx="12" cy="9" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></>,
    cal: <><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4m8-4v4"/></>,
    layers: <><path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 13 9 5 9-5"/></>,
    star: <><path d="M12 4 14.5 9.5 20 10.5 16 14.5 17 20 12 17.5 7 20 8 14.5 4 10.5 9.5 9.5 12 4Z"/></>,
    spark: <><path d="M12 4v6m0 4v6m-8-8h6m4 0h6"/><path d="M7 7 9 9m6 6 2 2M7 17l2-2m6-6 2-2" opacity="0.6"/></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 8v.5"/></>,
    pin: <><path d="M12 21v-7M8 4h8l-1.5 5L18 13H6l3.5-4z"/></>,
    ring: <><circle cx="12" cy="12" r="9"/></>,
    diamond: <><path d="M12 3 21 12 12 21 3 12Z"/></>,
    square: <><rect x="5" y="5" width="14" height="14"/></>,
    circ: <><circle cx="12" cy="12" r="7"/></>,
    logout: <><path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M9 16l-4-4 4-4M5 12h11"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="m4 7 8 6 8-6"/></>,
    lock: <><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>,
    google: <><path d="M12 11v2.6h4.3c-.2 1-1.4 3-4.3 3a4.6 4.6 0 0 1 0-9.2c1.3 0 2.3.5 2.9 1l2-1.9A7.5 7.5 0 1 0 12 19.5c4.3 0 7.2-3 7.2-7.3 0-.5 0-.9-.1-1.2H12Z"/></>,
  };
  return <svg {...props} aria-hidden="true">{paths[name] || null}</svg>;
};

window.Icon = Icon;
