# IYAN — Web3 ops portfolio

Blue-and-black portfolio for a **community lead / partnerships / biz dev / moderator**.
Static site, no build step, no framework. Everything you see is editable from a
built-in editor called **Studio** — you never have to touch code to add a room.

```
web3-portfolio-v2/
├── index.html              the whole site
├── portfolio.json          ← your real content lives here
├── assets/
│   ├── css/
│   │   ├── core.css        tokens, reset, nav, ambient layers
│   │   ├── site.css        hero, work grid, dossier, sections
│   │   └── studio.css      the editor
│   └── js/
│       ├── data.js         seed content (fallback + "reset to samples")
│       ├── store.js        state, undo/redo, autosave, export
│       ├── fx.js           canvas background, tilt, reveals, counters
│       ├── render.js       paints every section from state
│       ├── palette.js      ⌘K command bar
│       ├── studio.js       the editor
│       └── app.js          boot + keyboard
└── README.md
```

---

## Run it

Any static server works. From inside this folder:

```bash
python -m http.server 4173
```

Then open <http://localhost:4173>.

> Double-clicking `index.html` also works, but `portfolio.json` can't be fetched
> over `file://` — the site falls back to the seed content in `data.js`. Use a
> server if you want your JSON file to load.

---

## Put your real work in

1. Press **`E`** (or click **Studio** in the nav).
2. **Identity** — name, handle, bio, seats, Discord, X, email, accent colour.
3. **Works** — this is the important one:
   - **+ Add a case** for every room you've run.
   - Drop an image on the cover box, or leave it empty for the generated blue cover.
   - Fill summary, description, highlights, numbers, tags.
   - Drag rows in the left list to set the order.
   - Tick **Feature this case** to give it a double-width tile.
   - The **%** meter next to the title tells you how complete the case looks.
4. When your own cases are in, hit **Clear samples** to delete all eight placeholders at once.
5. Go to **Data → Download portfolio.json**, and drop that file into this folder,
   replacing the one already there.

Step 5 is the one people forget. Studio autosaves to **this browser only**.
`portfolio.json` is the file that ships.

### Editing straight on the page

Press **`I`** for inline edit. Anything with a dashed outline becomes typeable —
your name, the bio, section blurbs, the contact headline. Click, type, click away.
Press `Escape` to cancel a field, `I` again to leave the mode.

---

## Keyboard

| Key | Does |
|---|---|
| `⌘K` / `Ctrl K` | Command palette — jump to any section or case, copy your email, switch accent, export |
| `E` | Open / close Studio |
| `I` | Inline edit on the live page |
| `/` | Jump to the work search box |
| `←` `→` | Previous / next case while a case is open |
| `Ctrl Z` / `Ctrl Shift Z` | Undo / redo any edit |
| `Esc` | Close whatever is open |

---

## What's in the site

- **Hero** — letter-by-letter name, four seats at display scale (click one to filter the work), live clock + timezone, operator card, chain pills, animated stat counters
- **Ticker** — two counter-scrolling marquees
- **Work** — bento grid with double-width featured tiles, a soft pointer-tracking
  spotlight, filter by seat *and* chain (from the hero or the toolbar), search, sort
- **Case dossier** — full-screen read-out with metrics, highlights, links, and
  arrow-key navigation between cases
- **Seats** — one block per seat you take
- **Ops** — chains, arsenal, and your operating rules
- **Track** — timeline of where you've sat
- **Floor** — swipeable quote carousel
- **Contact** — form that opens the visitor's mail client with the brief pre-filled
  (no server, no signup, nothing to leak), plus copy-to-clipboard channels
- **Mobile dock** — sticky *See the work* / *Open a seat* bar on small screens, which tucks away when the contact form is in view

Behind it: a canvas constellation that reacts to your pointer, a scroll-progress
bar, a section rail, scroll reveals, magnetic buttons, and a custom cursor.
All of it degrades cleanly — `prefers-reduced-motion` turns the motion off and
keeps the layout.

---

## Deploy

No build step. Drop this folder on Netlify, Vercel, Cloudflare Pages, or GitHub Pages.

If you deploy to a subfolder, everything is relative — it just works.

**Before you send the link to anyone:**

- [ ] Real cases in, samples cleared
- [ ] Your actual email / Discord / X on the Identity tab
- [ ] `portfolio.json` downloaded from Studio and committed
- [ ] Stats and quotes are true

---

## Notes

- **Type.** Anton (the big display moments — name, section titles, stats, card
  titles, footer), Space Grotesk (sub-heads, quotes, form values), Inter (body),
  JetBrains Mono (every label and button). The scale contrast between Anton at
  14rem and mono labels at 0.6rem *is* the design — if you shrink the display
  type or grow the labels, it collapses into an ordinary site.
- **The outlined phrase.** `<em>` inside a section title renders hollow with an
  accent stroke (`-webkit-text-stroke`). Wrap the words you want carrying the
  accent. Note it's the prefixed property only — the unprefixed `text-stroke`
  is in no browser.
- **Cover images** get shrunk to 1400px wide and stored inside `portfolio.json`
  as data URLs, so the JSON is fully self-contained. If you'd rather keep files
  on disk, put them in `assets/img/` and use **Paste a URL** with a relative path
  like `assets/img/ashen.jpg` — much smaller JSON.
- **Generated covers.** A case with no cover image draws one instead of sitting
  empty: six patterns live in `site.css` keyed `[data-pat]`, cycled by the case's
  position in your list so neighbouring cards never repeat, tinted by that case's
  `tint`, with the client name set large behind it.
  Real screenshots still beat generated ones — a Discord you actually ran is
  the most persuasive thing on the page.
- **Storage limits.** Browsers cap local storage around 5 MB. Studio warns you if
  you hit it; the fix is to use relative image paths instead of embedded uploads.
- **Accents** are four blues (Azure, Electric, Cobalt, Glacier). Change it in
  Studio → Identity, or from `⌘K`.
- Editing Studio's `?studio` / `?edit` URL params opens the editor directly, which
  is handy while you're filling things in.
