// Runs the time system AND Auto-Cards in context so the Configure card is created/pinned.
const modifier = (text) => {
  try {
    let stop; // Context can return { text, stop }

    // Time system (AC-TIME&DAY)
    if (typeof TLContext === "function") {
      const r = TLContext(text);
      if (r) {
        if (typeof r.text === "string") text = r.text;
        if ("stop" in r) stop = r.stop;
      }
    }

    // Auto-Cards must run here to build "Configure Auto-Cards"
    if (typeof AutoCards === "function") {
      const r = AutoCards("context", text, stop);
      if (Array.isArray(r)) { text = r[0]; stop = r[1]; }
      else if (r && typeof r === "object") {
        if (typeof r.text === "string") text = r.text;
        if ("stop" in r) stop = r.stop;
      } else if (typeof r === "string") {
        text = r;
      }
    }

    return (stop === undefined) ? { text } : { text, stop };
  } catch (_) {
    return { text };
  }
};
modifier(text);
