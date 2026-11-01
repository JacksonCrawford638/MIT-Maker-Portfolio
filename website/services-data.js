/* SPAND Studio — service catalogue (shared by landing, services index, detail pages) */
window.SPAND_SERVICES = [
  {
    slug: "promotional-videos",
    img: "assets/image-placeholder.svg",
    title: "Aerial Promotional Videos",
    category: "Video",
    blurb: "30–90 second branded films that make your business look its best from the air.",
    tags: ["VIDEO", "BRANDED", "SOCIAL"],
    icon: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.5" y="6" width="14" height="12" rx="2"/><path d="m16.5 10 5-3v10l-5-3z"/></svg>',
    lede: "A short, polished promo that makes your business look heroic — shot from the air, cut for the web, and built to stop the scroll.",
    feature: { tag: "Promo Edit", label: "60–90s branded promo — aerial + ground, color-graded", runtime: "0:58" },
    intro: "The bread-and-butter of aerial marketing. We fly your site, gather the best of it from above, mix in supporting ground footage, and cut a tight 30–90 second film that you can run on your homepage, ads, and feeds.",
    deliverables: [
      { name: "30–90 second edited video", desc: "Color-graded, music-licensed, and finished in the aspect ratio you need." },
      { name: "Social media clips", desc: "Vertical and square cut-downs sized for Reels, TikTok, and Stories." },
      { name: "Aerial photos", desc: "A set of high-resolution stills pulled from the same shoot." }
    ],
    whoFor: ["Landscaping companies", "Golf courses", "Marinas", "Campgrounds", "Farms", "Construction companies", "Event venues", "Manufacturing facilities"],
    equipment: [{ name: "Mini 3 Pro", kind: "Aerial" }, { name: "Cinelifter", kind: "Cinematic" }, { name: "A6100", kind: "Ground" }],
    gallery: [
      { cls: "g-wide", ratio: "ratio-16-9", tag: "Hero shot", label: "Sweeping reveal of the property", rt: "0:06" },
      { cls: "g-tall", ratio: "ratio-3-2", tag: "Still", label: "Aerial detail" },
      { cls: "g-third", ratio: "ratio-3-2", tag: "Ground", label: "Ground b-roll" },
      { cls: "g-third", ratio: "ratio-3-2", tag: "Social", label: "9:16 cut-down" },
      { cls: "g-third", ratio: "ratio-3-2", tag: "Still", label: "Wide establishing" }
    ]
  },
  {
    // Hidden from the public site until the right lens is in hand.
    // Page file + data kept intact so it can be re-published by simply
    // removing this flag. Renderers filter on `hidden`.
    hidden: true,
    slug: "real-estate",
    img: "assets/image-placeholder.svg",
    title: "Real Estate Media",
    category: "Video & Photo",
    blurb: "Aerial listing photos and overview videos that sell residential and commercial property faster.",
    tags: ["VIDEO", "PHOTO", "LISTINGS"],
    icon: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-5h6v5"/><path d="M9 12h.01M15 12h.01"/></svg>',
    lede: "The easiest market to enter, because agents already understand the value. Aerials that frame the lot, the location, and the lifestyle.",
    feature: { tag: "Listing Tour", label: "Property overview video — exterior + lot context", runtime: "1:10" },
    intro: "From single-family listings to industrial parks, aerial media gives buyers the full picture: the size of the lot, the lay of the land, and how the property sits in its surroundings. One of the simplest ways to make a listing stand out.",
    deliverables: [
      { name: "Aerial listing photos", desc: "Crisp, well-composed stills that lead the gallery and show the whole property." },
      { name: "Property overview videos", desc: "A short tour that orients buyers to the lot and the neighborhood." },
      { name: "Large-lot & luxury showcases", desc: "Cinematic treatment for estates, acreage, and premium listings." }
    ],
    whoFor: ["Residential listings", "Luxury & large-lot homes", "Office buildings", "Industrial facilities", "Retail centers", "Warehouses", "Real estate agents", "Developers"],
    equipment: [{ name: "Mini 3 Pro", kind: "Aerial" }, { name: "Cinelifter", kind: "Cinematic" }],
    gallery: [
      { cls: "g-half", ratio: "ratio-3-2", tag: "Listing", label: "Hero exterior + lot" },
      { cls: "g-half", ratio: "ratio-3-2", tag: "Context", label: "Neighborhood & approach" },
      { cls: "g-third", ratio: "ratio-3-2", tag: "Detail", label: "Backyard / amenities" },
      { cls: "g-third", ratio: "ratio-3-2", tag: "Commercial", label: "Rooftop & parking" },
      { cls: "g-third", ratio: "ratio-3-2", tag: "Twilight", label: "Dusk hero" }
    ]
  },
  {
    slug: "fpv-fly-throughs",
    img: "assets/image-placeholder.svg",
    title: "FPV Fly-Throughs",
    category: "Video",
    blurb: "One-take cinematic flights straight through your space. Our most unique service.",
    tags: ["FPV", "ONE-TAKE", "INDOOR"],
    icon: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 17c4 0 5-10 9-10s5 4 9 4"/><path d="m17 7 4 0 0 4"/><circle cx="3" cy="17" r="1.4" fill="currentColor"/></svg>',
    lede: "Probably our most unique service: a single, unbroken FPV flight that races through your space and makes ordinary rooms feel cinematic.",
    feature: { tag: "FPV One-Take", label: "Continuous fly-through — no cuts, full venue", runtime: "0:44" },
    intro: "Flying a small, agile FPV drone, we capture one continuous take that threads doorways, drops down stairwells, and glides across the floor. It's the kind of shot that makes people stop and watch — and it works indoors where normal drones can't go.",
    deliverables: [
      { name: "One-take FPV tour", desc: "A single continuous flight through the full space, color-graded and scored." },
      { name: "Social media versions", desc: "Punchy vertical cut-downs built for Reels and TikTok." },
      { name: "Website promotional content", desc: "A looping hero clip for the top of your homepage." }
    ],
    whoFor: ["Gyms", "Churches", "Warehouses", "Schools", "Restaurants", "Retail stores", "Manufacturing facilities"],
    equipment: [{ name: "Pavo20 Pro", kind: "Cinewhoop FPV" }],
    gallery: [
      { cls: "g-wide", ratio: "ratio-16-9", tag: "The flight", label: "Continuous interior fly-through", rt: "0:44" },
      { cls: "g-tall", ratio: "ratio-3-2", tag: "Frame", label: "Doorway thread" },
      { cls: "g-half", ratio: "ratio-3-2", tag: "Frame", label: "Floor-level glide" },
      { cls: "g-half", ratio: "ratio-3-2", tag: "Social", label: "9:16 vertical cut" }
    ]
  },
  {
    slug: "construction",
    img: "assets/image-placeholder.svg",
    title: "Construction Documentation",
    category: "Photo & 3D",
    blurb: "Site documentation on the schedule you set — 3D scans, orthomosaics, 360° photos, and standard stills.",
    tags: ["3D SCAN", "360° PHOTO", "SCHEDULED"],
    icon: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 21h18"/><path d="M5 21V10l5-3 5 3v11"/><path d="M15 21V13l4-2v10"/><path d="M8 12h2M8 15h2M8 18h2"/></svg>',
    lede: "On-site documentation captured on the schedule you set — basic 3D scans and orthomosaics, 360° photos, and standard stills, delivered as often as your project needs.",
    feature: { tag: "Site Capture", label: "3D scan · orthomosaic · 360° · standard photos" },
    intro: "We document your job site with whatever mix of capture makes sense for the project — a top-down orthomosaic and basic 3D scan, navigable 360° photos, or straightforward high-resolution stills. You decide what we shoot and how often: a single visit, key milestones, or a recurring weekly or monthly cadence.",
    deliverables: [
      { name: "3D scan & orthomosaic", desc: "A to-scale, top-down orthomosaic map of the site plus a basic 3D scan you can rotate and review." },
      { name: "360° photos", desc: "Navigable panoramas from fixed points, so anyone can look around the full site remotely." },
      { name: "Standard photos", desc: "Clean, high-resolution stills of progress, detail, and the finished build." }
    ],
    whoFor: ["General contractors", "Developers", "Civil & site work", "Commercial builders", "Project owners"],
    equipment: [{ name: "Mini 3 Pro", kind: "Aerial" }, { name: "A6100", kind: "Ground" }],
    note: "Every capture is on a basis you prescribe — one-time, per milestone, or a recurring weekly or monthly cadence.",
    gallery: []
  },
  {
    slug: "property-documentation",
    img: "assets/image-placeholder.svg",
    title: "Property Documentation",
    category: "Photo & Video",
    blurb: "Aerial scans of large parcels — orthomosaic maps, elevation models, and vegetation analysis for farms, hunting land, and rural estates.",
    tags: ["MAPPING", "ORTHOMOSAIC", "TERRAIN"],
    icon: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z"/><path d="M9 4v13M15 6.5v13" stroke-dasharray="2 2"/></svg>',
    lede: "When a property is too big to photograph from the ground, we scan it from above — a to-scale map of the full footprint, the terrain, and the ground cover.",
    feature: { tag: "Orthomosaic", label: "Full-parcel map stitched from hundreds of frames" },
    intro: "Large parcels are hard to convey from eye level. We fly the property in a grid and process the imagery into precise aerial scans: a single stitched map of the whole footprint, a color elevation model of the terrain, and a vegetation scan of the ground cover — invaluable for owners, land brokers, and recreational buyers.",
    deliverables: [
      { name: "Orthomosaic map", desc: "One to-scale, top-down image of the entire parcel, stitched from hundreds of overlapping aerial frames." },
      { name: "Elevation & terrain model", desc: "A color heightmap revealing slope, drainage, and the high and low ground across the property." },
      { name: "Vegetation analysis", desc: "A plant-health scan that maps tree lines, crops, and ground cover so you can see what's thriving and what's bare." }
    ],
    whoFor: ["Farms", "Hunting land", "Recreational land", "Rural estates", "Land brokers", "Private owners"],
    equipment: [{ name: "Mini 3 Pro", kind: "Aerial mapping" }],
    note: "These scans are for marketing and visualization only — we don't make survey-accuracy or legal-boundary claims. For precise lines, work with a licensed surveyor.",
    gallery: [
      { cls: "g-wide", ratio: "ratio-16-9", tag: "Orthomosaic", label: "Full parcel, stitched to scale", img: "scan-orthomosaic-1600.webp" },
      { cls: "g-half", ratio: "ratio-3-2", tag: "Elevation", label: "Color terrain & heightmap", img: "scan-heightmap-1400.webp" },
      { cls: "g-half", ratio: "ratio-3-2", tag: "Vegetation", label: "Plant-health & ground cover", img: "scan-plantlife-1400.webp" }
    ]
  },
  {
    slug: "tourism",
    img: "assets/image-placeholder.svg",
    title: "Tourism & Community",
    category: "Video & Photo",
    blurb: "Highlight reels and promotional aerials for downtowns, parks, and tourism organizations.",
    tags: ["VIDEO", "COMMUNITY", "PROMO"],
    icon: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    lede: "Show off a place worth visiting. Aerial highlight films and stills that help communities, parks, and downtowns tell their story.",
    feature: { tag: "Highlight Film", label: "Destination promo — landmarks + life", runtime: "1:30" },
    intro: "Tourism and community promotion lives on great visuals. We capture the landmarks, the events, and the energy of a place from above, then cut it into highlight content for websites, grants, and social campaigns.",
    deliverables: [
      { name: "Highlight videos", desc: "A polished destination reel showcasing landmarks, events, and atmosphere." },
      { name: "Promotional content", desc: "Short cut-downs and seasonal clips for social and web." },
      { name: "Aerial photography", desc: "A library of stills for brochures, sites, and press." }
    ],
    whoFor: ["Downtown development groups", "Tourism organizations", "Parks", "Festivals", "Community events", "Municipalities"],
    equipment: [{ name: "Mini 3 Pro", kind: "Aerial" }, { name: "Cinelifter", kind: "Cinematic" }],
    gallery: [
      { cls: "g-wide", ratio: "ratio-16-9", tag: "Skyline", label: "Downtown establishing reveal", rt: "0:08" },
      { cls: "g-tall", ratio: "ratio-3-2", tag: "Landmark", label: "Signature location" },
      { cls: "g-third", ratio: "ratio-3-2", tag: "Park", label: "Green space" },
      { cls: "g-third", ratio: "ratio-3-2", tag: "Event", label: "Festival crowd" },
      { cls: "g-third", ratio: "ratio-3-2", tag: "Water", label: "River / lakefront" }
    ]
  },
  {
    // Hidden from the public site — no event-coverage portfolio yet.
    // Page file + data kept intact; remove `hidden` to re-publish.
    hidden: true,
    slug: "events",
    img: "assets/image-placeholder.svg",
    title: "Event Coverage",
    category: "Video & Photo",
    blurb: "Highlight reels, social clips, and aerial photography for festivals, fairs, and gatherings.",
    tags: ["VIDEO", "PHOTO", "EVENTS"],
    icon: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="m12 3 2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5L12 3z"/></svg>',
    lede: "Capture the scale and the energy of the day from above — then hand back a highlight reel before the buzz wears off.",
    feature: { tag: "Event Recap", label: "Festival highlight reel — air + ground", runtime: "1:15" },
    intro: "Events look incredible from the air: the crowds, the layout, the main stage at golden hour. We mix aerials with ground coverage to produce recap reels and social clips that organizers can use to promote next year.",
    deliverables: [
      { name: "Highlight reels", desc: "A recap edit that captures the energy and scale of the event." },
      { name: "Social media clips", desc: "Fast vertical cut-downs ready to post during and after the event." },
      { name: "Event photography", desc: "Aerial and ground stills for sponsors, press, and recaps." }
    ],
    whoFor: ["Festivals", "Fairs", "Outdoor sporting events", "Community celebrations", "Fundraisers", "Event organizers"],
    equipment: [{ name: "Mini 3 Pro", kind: "Aerial" }, { name: "A6100", kind: "Ground" }],
    gallery: [
      { cls: "g-wide", ratio: "ratio-16-9", tag: "Crowd", label: "Aerial of the full grounds", rt: "0:07" },
      { cls: "g-tall", ratio: "ratio-3-2", tag: "Stage", label: "Main stage at dusk" },
      { cls: "g-third", ratio: "ratio-3-2", tag: "Detail", label: "Vendors & color" },
      { cls: "g-third", ratio: "ratio-3-2", tag: "Action", label: "Sporting moment" },
      { cls: "g-third", ratio: "ratio-3-2", tag: "Social", label: "9:16 recap cut" }
    ]
  },
  {
    slug: "drone-photography",
    img: "assets/image-placeholder.svg",
    title: "Drone Photography",
    category: "Photo",
    blurb: "Simple but often overlooked: crisp aerial stills for websites, marketing, and facilities.",
    tags: ["PHOTO", "STILLS", "MARKETING"],
    icon: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.5" y="6.5" width="19" height="13" rx="2"/><path d="M8 6.5 9.3 4h5.4l1.3 2.5"/><circle cx="12" cy="13" r="3.4"/></svg>',
    lede: "The most overlooked service we offer — and one of the most useful. Clean, high-resolution aerial photographs, no edit required.",
    feature: { tag: "Photo Set", label: "High-resolution aerial stills — delivered same week", runtime: "STILLS" },
    intro: "Sometimes you don't need a video — you need a great photo. Aerial stills give your website, listings, and marketing materials a perspective the competition doesn't have, at a price that's easy to say yes to.",
    deliverables: [
      { name: "Website photos", desc: "Hero-ready aerial images sized and color-corrected for your site." },
      { name: "Marketing photos", desc: "A versatile set for ads, brochures, and social." },
      { name: "Property & facility photos", desc: "Clear documentation of buildings, grounds, and assets from above." }
    ],
    whoFor: ["Businesses", "Real estate agents", "Municipalities", "Developers", "Facility managers"],
    equipment: [{ name: "Mini 3 Pro", kind: "Aerial" }],
    gallery: [
      { cls: "g-half", ratio: "ratio-3-2", tag: "Hero", label: "Top-down facility" },
      { cls: "g-half", ratio: "ratio-3-2", tag: "Angle", label: "45° establishing" },
      { cls: "g-third", ratio: "ratio-1-1", tag: "Still", label: "Detail crop" },
      { cls: "g-third", ratio: "ratio-1-1", tag: "Still", label: "Grounds" },
      { cls: "g-third", ratio: "ratio-1-1", tag: "Still", label: "Signage" }
    ]
  }
];
