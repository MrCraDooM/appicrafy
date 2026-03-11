import { useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Smartphone, Play, X } from "lucide-react";

interface GeneratedFile { name: string; path: string; content: string; language: string; }

// ── Color Utilities ───────────────────────────────────────────────────────────
function isLight(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length < 6) return true;
  return 0.299 * parseInt(c.slice(0, 2), 16) + 0.587 * parseInt(c.slice(2, 4), 16) + 0.114 * parseInt(c.slice(4, 6), 16) > 128;
}
function styleVal(code: string, block: string, prop: string): string | null {
  const re = new RegExp(`${block}\\s*:\\s*\\{([^}]*)\\}`, "g"); let m;
  while ((m = re.exec(code)) !== null) { const pm = m[1].match(new RegExp(`${prop}\\s*:\\s*['"]([^'"]+)['"]`)); if (pm) return pm[1]; }
  return null;
}
function getBg(code: string): string {
  for (const n of ["container", "screen", "wrapper", "root", "safeArea", "safe", "main"]) { const v = styleVal(code, n, "backgroundColor"); if (v) return v; }
  const m = code.match(/backgroundColor\s*:\s*['"]([^'"]+)['"]/); return m ? m[1] : "#F8F9FA";
}
function getPrimary(code: string): string {
  for (const n of ["button", "btn", "primary", "accent", "fab", "addButton", "action", "header", "addBtn"]) { const v = styleVal(code, n, "backgroundColor"); if (v && !["#fff","#ffffff","#FFF","#FFFFFF"].includes(v)) return v; }
  const nav = code.match(/headerStyle\s*:\s*\{[^}]*backgroundColor\s*:\s*['"]([^'"]+)['"]/); if (nav) return nav[1];
  const hexes = code.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/g) || [];
  return hexes.find(h => !isLight(h) && h.toLowerCase() !== "#000000") ?? "#6C63FF";
}
function getNavColor(code: string): string {
  const m = code.match(/headerStyle\s*:\s*\{[^}]*backgroundColor\s*:\s*['"]([^'"]+)['"]/); return m ? m[1] : "#6C63FF";
}

// ── Parsers ───────────────────────────────────────────────────────────────────
function parseTexts(code: string): string[] {
  const out: string[] = [];
  const re = /<Text[^>]*>\s*([A-Za-z][A-Za-z0-9 .,!?':()\-]{2,80})\s*<\/Text>/g; let m;
  while ((m = re.exec(code)) !== null) { if (!m[1].includes("{") && !m[1].includes("$")) out.push(m[1].trim()); }
  const re2 = /(?:title|label|name|description)\s*:\s*['"]([A-Za-z][^'"]{2,60})['"]/g;
  while ((m = re2.exec(code)) !== null) out.push(m[1]);
  return [...new Set(out)];
}
function parseInputs(code: string): { ph: string; multiline: boolean }[] {
  const out: { ph: string; multiline: boolean }[] = [];
  const re = /placeholder\s*=\s*[{]?\s*["']([^"']+)["']/g; let m;
  while ((m = re.exec(code)) !== null) out.push({ ph: m[1], multiline: /multiline/.test(code.slice(Math.max(0, m.index - 100), m.index + 100)) });
  return [...new Set(out.map(o => o.ph))].slice(0, 3).map(ph => ({ ph, multiline: false }));
}
function parseButtons(code: string): string[] {
  const out: string[] = [];
  const re = /<Text[^>]*>([A-Z][A-Za-z\s]{2,30})<\/Text>\s*<\/(?:TouchableOpacity|Pressable)/g; let m;
  while ((m = re.exec(code)) !== null) out.push(m[1].trim());
  return [...new Set(out)].slice(0, 3);
}
function parseListItems(code: string): string[] {
  const out: string[] = [];
  const re = /[{][^{}]*(?:title|name|text|task|label|item)\s*:\s*['"]([A-Za-z][^'"]{2,60})['"]/g; let m;
  while ((m = re.exec(code)) !== null) out.push(m[1]);
  return [...new Set(out)].slice(0, 6);
}

// ── Types ─────────────────────────────────────────────────────────────────────
type UIEl = { t: "heading" | "sub" | "input" | "button" | "list" | "card" | "toggle" | "divider"; content?: string; ph?: string; bg?: string; fg?: string; items?: string[]; multiline?: boolean; };
interface Screen { name: string; title: string; bg: string; primary: string; navColor: string; fg: string; els: UIEl[]; hasList: boolean; hasInput: boolean; }

// ── Screen Parser ─────────────────────────────────────────────────────────────
function parseScreen(file: GeneratedFile, navColor: string): Screen {
  const code = file.content;
  const rawName = file.name.replace(/Screen\.(js|tsx?)$/, "").replace(/\.(js|tsx?)$/, "");
  const bg = getBg(code); const primary = getPrimary(code);
  const dark = !isLight(bg); const fg = dark ? "#FFFFFF" : "#0D0D0D";
  const titleM = code.match(/options\s*=\s*\{\s*title\s*:\s*['"]([^'"]+)['"]/);
  const title = titleM?.[1] ?? rawName;
  const texts = parseTexts(code);
  const inputs = parseInputs(code);
  const buttons = parseButtons(code);
  const listItems = parseListItems(code);
  const hasList = /FlatList|SectionList|\.map\(/.test(code);
  const hasToggle = /Switch|Toggle/.test(code);
  const cardBg = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";

  const els: UIEl[] = [];
  const bodyTexts = texts.filter(t => !buttons.includes(t) && t !== title);
  els.push({ t: "heading", content: bodyTexts[0] || rawName, fg });
  if (bodyTexts[1]) els.push({ t: "sub", content: bodyTexts[1], fg: fg + "99" });
  for (const { ph, multiline } of inputs) els.push({ t: "input", ph, bg: cardBg, fg, multiline });
  if (hasToggle && listItems.length > 0) listItems.slice(0, 4).forEach(c => els.push({ t: "toggle", content: c, bg: cardBg, fg }));
  else if (hasList || listItems.length > 0) els.push({ t: "list", items: listItems.length ? listItems : ["Item 1", "Item 2", "Item 3"], bg: cardBg, fg });
  for (const btn of buttons) els.push({ t: "button", content: btn, bg: primary, fg: "#fff" });
  if (els.length <= 1) { els.push({ t: "card", content: "Example item", bg: cardBg, fg }); els.push({ t: "card", content: "Another item", bg: cardBg, fg }); els.push({ t: "button", content: "Get Started", bg: primary, fg: "#fff" }); }

  return { name: rawName, title, bg, primary, navColor, fg, els, hasList: hasList || listItems.length > 0, hasInput: inputs.length > 0 };
}
function parseScreens(files: GeneratedFile[]): Screen[] {
  const appFile = files.find(f => f.name === "App.js" || f.name === "App.tsx");
  const navColor = appFile ? getNavColor(appFile.content) : "#6C63FF";
  return files
    .filter(f => (f.path.includes("screens/") || f.name.toLowerCase().includes("screen")) && !["json","markdown","text"].includes(f.language))
    .map(f => parseScreen(f, navColor));
}

// ── Interactive Screen State ───────────────────────────────────────────────────
interface ScreenState {
  inputValues: Record<string, string>;
  listItems: { id: string; text: string; done: boolean }[];
  toggles: Record<string, boolean>;
}
function initState(screen: Screen): ScreenState {
  const inputValues: Record<string, string> = {};
  const listItems = (screen.els.find(e => e.t === "list")?.items ?? []).map((text, i) => ({ id: String(i), text, done: false }));
  const toggles: Record<string, boolean> = {};
  screen.els.filter(e => e.t === "toggle").forEach((e, i) => { toggles[String(i)] = i % 2 === 0; });
  return { inputValues, listItems, toggles };
}

// ── Tab Icon ──────────────────────────────────────────────────────────────────
function TabIcon({ name, active, color }: { name: string; active: boolean; color: string }) {
  const n = name.toLowerCase(); const c = active ? color : "rgba(150,150,150,0.6)"; const s = 18;
  if (n.includes("home")) return <svg width={s} height={s} fill={c} viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>;
  if (n.includes("setting")) return <svg width={s} height={s} fill={c} viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>;
  if (n.includes("profile") || n.includes("user") || n.includes("account")) return <svg width={s} height={s} fill={c} viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>;
  if (n.includes("search") || n.includes("explore")) return <svg width={s} height={s} fill={c} viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>;
  if (n.includes("add") || n.includes("new") || n.includes("create")) return <svg width={s} height={s} fill={c} viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>;
  return <svg width={s} height={s} fill={c} viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg>;
}

// ── Interactive Screen Content ────────────────────────────────────────────────
function ScreenContent({ screen, state, setState, onNav }: { screen: Screen; state: ScreenState; setState: (s: ScreenState) => void; onNav: (dir: 1 | -1) => void; }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listEl = screen.els.find(e => e.t === "list");
  const hasListInput = screen.hasInput && screen.hasList;

  const addItem = (val: string) => {
    if (!val.trim()) return;
    setState({ ...state, listItems: [...state.listItems, { id: Date.now().toString(), text: val.trim(), done: false }] });
  };
  const toggleItem = (id: string) => setState({ ...state, listItems: state.listItems.map(it => it.id === id ? { ...it, done: !it.done } : it) });
  const deleteItem = (id: string) => setState({ ...state, listItems: state.listItems.filter(it => it.id !== id) });

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: screen.bg, display: "flex", flexDirection: "column", padding: "14px 14px 20px", gap: "10px", overflowY: "auto", boxSizing: "border-box", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {screen.els.map((el, i) => {
        if (el.t === "heading") return <div key={i} style={{ fontSize: 17, fontWeight: 700, color: el.fg, lineHeight: 1.3 }}>{el.content}</div>;
        if (el.t === "sub") return <div key={i} style={{ fontSize: 12, color: el.fg, lineHeight: 1.5 }}>{el.content}</div>;

        if (el.t === "input") {
          const val = state.inputValues[el.ph!] ?? "";
          return (
            <div key={i} style={{ display: "flex", gap: 6 }}>
              <input
                ref={hasListInput && i === screen.els.findIndex(e => e.t === "input") ? inputRef : undefined}
                value={val}
                onChange={e => setState({ ...state, inputValues: { ...state.inputValues, [el.ph!]: e.target.value } })}
                onKeyDown={e => { if (e.key === "Enter" && hasListInput) { addItem(val); setState({ ...state, inputValues: { ...state.inputValues, [el.ph!]: "" } }); } }}
                placeholder={el.ph}
                style={{ flex: 1, backgroundColor: el.bg, border: "1px solid rgba(128,128,128,0.2)", borderRadius: 10, padding: "10px 14px", color: el.fg || "#000", fontSize: 12, outline: "none", fontFamily: "inherit" }}
              />
              {hasListInput && (
                <button onClick={() => { addItem(val); setState({ ...state, inputValues: { ...state.inputValues, [el.ph!]: "" } }); }}
                  style={{ width: 36, height: 36, borderRadius: 10, background: screen.primary, border: "none", color: "#fff", fontSize: 18, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  +
                </button>
              )}
            </div>
          );
        }

        if (el.t === "button") return (
          <button key={i} onClick={() => onNav(1)}
            style={{ backgroundColor: el.bg, borderRadius: 10, padding: "12px 16px", color: el.fg, fontSize: 13, fontWeight: 600, textAlign: "center", border: "none", cursor: "pointer", width: "100%", fontFamily: "inherit", transition: "opacity 0.15s" }}
            onMouseOver={e => (e.currentTarget.style.opacity = "0.85")} onMouseOut={e => (e.currentTarget.style.opacity = "1")}>
            {el.content}
          </button>
        );

        if (el.t === "list") return (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {state.listItems.map(item => (
              <div key={item.id} style={{ backgroundColor: el.bg, borderRadius: 10, padding: "10px 14px", color: el.fg, fontSize: 12, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                onClick={() => toggleItem(item.id)}>
                <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${item.done ? screen.primary : "rgba(128,128,128,0.4)"}`, background: item.done ? screen.primary : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                  {item.done && <svg width={10} height={10} fill="#fff" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                </div>
                <span style={{ flex: 1, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1, transition: "all 0.15s" }}>{item.text}</span>
                <button onClick={e => { e.stopPropagation(); deleteItem(item.id); }}
                  style={{ background: "none", border: "none", color: "rgba(255,80,80,0.7)", cursor: "pointer", fontSize: 14, padding: "0 2px", lineHeight: 1 }}>×</button>
              </div>
            ))}
            {state.listItems.length === 0 && (
              <div style={{ textAlign: "center", color: el.fg + "50", fontSize: 11, padding: "12px 0" }}>
                {screen.hasInput ? "Type above and press + to add." : "No items yet."}
              </div>
            )}
          </div>
        );

        if (el.t === "toggle") {
          const on = state.toggles[String(i)] ?? false;
          return (
            <div key={i} onClick={() => setState({ ...state, toggles: { ...state.toggles, [String(i)]: !on } })}
              style={{ backgroundColor: el.bg, borderRadius: 10, padding: "10px 14px", color: el.fg, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
              <span>{el.content}</span>
              <div style={{ width: 38, height: 22, borderRadius: 11, background: on ? screen.primary : "rgba(128,128,128,0.25)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 3, left: on ? 18 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              </div>
            </div>
          );
        }

        if (el.t === "card") return (
          <div key={i} style={{ backgroundColor: el.bg, borderRadius: 10, padding: "12px 14px", color: el.fg, fontSize: 12, display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}
            onClick={() => onNav(1)}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: screen.primary + "33", flexShrink: 0 }} />
            <div><div style={{ fontWeight: 600, marginBottom: 2 }}>{el.content}</div><div style={{ opacity: 0.5, fontSize: 11 }}>Tap to open</div></div>
            <div style={{ marginLeft: "auto", opacity: 0.3, fontSize: 16 }}>›</div>
          </div>
        );
        return null;
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AppPreviewRenderer({ files, appName, snackId }: { files: GeneratedFile[]; appName?: string; snackId?: string | null; }) {
  const screens = useMemo(() => parseScreens(files), [files]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [screenStates, setScreenStates] = useState<ScreenState[]>(() => screens.map(initState));
  const [showLiveModal, setShowLiveModal] = useState(false);

  const screen = screens[activeIdx] ?? screens[0];
  const fallbackScreen: Screen = { name: "", title: "", bg: "#000", primary: "#6C63FF", navColor: "#6C63FF", fg: "#fff", els: [], hasList: false, hasInput: false };
  const state = screenStates[activeIdx] ?? initState(screen ?? fallbackScreen);

  const updateState = (s: ScreenState) => {
    const next = [...screenStates]; next[activeIdx] = s; setScreenStates(next);
  };

  const navigate = (dir: 1 | -1) => {
    const next = Math.max(0, Math.min(screens.length - 1, activeIdx + dir));
    setActiveIdx(next);
  };

  if (!screen) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#888", fontFamily: "system-ui" }}>No screens found</div>;

  const navIsLight = isLight(screen.navColor);
  const navFg = navIsLight ? "#000" : "#fff";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, padding: "16px 0", fontFamily: "system-ui, sans-serif" }}>

      {/* iPhone 15 Pro frame */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        {/* Side buttons */}
        <div style={{ position: "absolute", left: -3, top: 88, width: 3, height: 32, background: "linear-gradient(180deg,#4a4a4c,#2a2a2c)", borderRadius: "3px 0 0 3px" }} />
        <div style={{ position: "absolute", left: -3, top: 132, width: 3, height: 56, background: "linear-gradient(180deg,#4a4a4c,#2a2a2c)", borderRadius: "3px 0 0 3px" }} />
        <div style={{ position: "absolute", left: -3, top: 198, width: 3, height: 56, background: "linear-gradient(180deg,#4a4a4c,#2a2a2c)", borderRadius: "3px 0 0 3px" }} />
        <div style={{ position: "absolute", right: -3, top: 148, width: 3, height: 72, background: "linear-gradient(180deg,#4a4a4c,#2a2a2c)", borderRadius: "0 3px 3px 0" }} />

        {/* Phone body */}
        <div style={{
          width: 300,
          borderRadius: 50,
          background: "linear-gradient(145deg, #2a2a2c, #1a1a1c, #222224)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.8), 0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(108,99,255,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
          padding: "14px 14px 20px",
          paddingTop: 14,
          position: "relative",
        }}>
          {/* Screen with bezel */}
          <div style={{ borderRadius: 38, overflow: "hidden", background: "#000", position: "relative" }}>
            {/* Status bar */}
            <div style={{ backgroundColor: screen.navColor, padding: "12px 20px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
              {/* Dynamic island */}
              <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: 90, height: 24, borderRadius: 12, background: "#000", zIndex: 10 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: navFg, letterSpacing: -0.3 }}>9:41</span>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {/* Signal bars */}
                <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                  <rect x="0" y="7" width="3" height="4" rx="0.5" fill={navFg} opacity="1"/>
                  <rect x="4.5" y="4.5" width="3" height="6.5" rx="0.5" fill={navFg} opacity="1"/>
                  <rect x="9" y="2" width="3" height="9" rx="0.5" fill={navFg} opacity="1"/>
                  <rect x="13.5" y="0" width="2.5" height="11" rx="0.5" fill={navFg} opacity="0.3"/>
                </svg>
                {/* Wifi */}
                <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                  <path d="M7.5 8.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z" fill={navFg}/>
                  <path d="M3.8 5.8a5.2 5.2 0 0 1 7.4 0" stroke={navFg} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                  <path d="M1 3a8.9 8.9 0 0 1 13 0" stroke={navFg} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5"/>
                </svg>
                {/* Battery */}
                <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <div style={{ width: 22, height: 11, borderRadius: 3, border: `1.5px solid ${navFg}`, position: "relative", opacity: 0.9 }}>
                    <div style={{ position: "absolute", left: 2, top: 2, bottom: 2, width: "80%", borderRadius: 1.5, background: navFg }} />
                  </div>
                  <div style={{ width: 2, height: 5, borderRadius: "0 1px 1px 0", background: navFg, opacity: 0.5 }} />
                </div>
              </div>
            </div>

            {/* Nav header */}
            <div style={{ backgroundColor: screen.navColor, padding: "6px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              {activeIdx > 0 ? (
                <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: navFg, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 0, opacity: 0.9 }}>‹</button>
              ) : <div style={{ width: 24 }} />}
              <span style={{ fontSize: 15, fontWeight: 600, color: navFg, letterSpacing: -0.3 }}>{screen.title || appName || screen.name}</span>
              <div style={{ width: 24 }} />
            </div>

            {/* App content */}
            <div style={{ height: "calc(100vh - 310px)", minHeight: 420, maxHeight: 560, overflow: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ScreenContent screen={screen} state={state} setState={updateState} onNav={navigate} />
              </div>
              {/* Bottom tab bar */}
              {screens.length > 1 && (
                <div style={{ backgroundColor: isLight(screen.bg) ? "#F8F8F8" : "#111", borderTop: `1px solid ${isLight(screen.bg) ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)"}`, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "8px 4px 4px", flexShrink: 0 }}>
                  {screens.slice(0, 5).map((s, i) => (
                    <button key={i} onClick={() => setActiveIdx(i)}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "2px 8px", transition: "opacity 0.15s" }}>
                      <TabIcon name={s.name} active={i === activeIdx} color={screen.primary} />
                      <span style={{ fontSize: 9, fontWeight: i === activeIdx ? 600 : 400, color: i === activeIdx ? screen.primary : (isLight(screen.bg) ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.35)"), fontFamily: "system-ui", maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.name.replace(/([A-Z])/g, ' $1').trim().split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Home indicator */}
            <div style={{ backgroundColor: isLight(screen.bg) ? "#F8F8F8" : "#111", padding: "8px 0 10px", display: "flex", justifyContent: "center" }}>
              <div style={{ width: 110, height: 4, borderRadius: 2, background: isLight(screen.bg) ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.2)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Expo link */}
      {snackId && (
        <a href={`https://snack.expo.dev/${snackId}`} target="_blank" rel="noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(150,150,150,0.5)", textDecoration: "none", transition: "color 0.15s" }}
          onMouseOver={e => (e.currentTarget.style.color = "#fff")} onMouseOut={e => (e.currentTarget.style.color = "rgba(150,150,150,0.5)")}>
          <ExternalLink size={11} /> Open in Expo Snack
        </a>
      )}

      {/* ── Live Test Modal ── */}
      {showLiveModal && snackId && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowLiveModal(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 960, display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Play size={16} style={{ color: "#6C63FF" }} />
                <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>Live Preview</span>
                <span style={{ color: "#888", fontSize: 12 }}>— interact with your app below</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <a href={`https://snack.expo.dev/${snackId}`} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#888", textDecoration: "none" }}
                  onMouseOver={e => (e.currentTarget.style.color = "#fff")} onMouseOut={e => (e.currentTarget.style.color = "#888")}>
                  <ExternalLink size={12} /> Open in Expo
                </a>
                <button onClick={() => setShowLiveModal(false)}
                  style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", borderRadius: 8, padding: "6px 10px", display: "flex", alignItems: "center", gap: 5, color: "#fff", fontSize: 12 }}>
                  <X size={14} /> Close
                </button>
              </div>
            </div>
            {/* Snack iframe — wide enough to show device preview panel */}
            <iframe
              key={snackId}
              src={`https://snack.expo.dev/embedded/${snackId}?preview=true&platform=web&theme=dark&sdkVersion=50.0.0`}
              style={{ width: "100%", height: "80vh", border: "none", borderRadius: 16 }}
              allow="geolocation; camera; microphone"
              title="Live App Preview"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
