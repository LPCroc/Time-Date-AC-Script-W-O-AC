// Runs the time system; optionally runs Auto-Cards' input phase if present.
const modifier = (text) => {
  try {
    // Time system (AC-TIME&DAY)
    if (typeof TLInput === "function") {
      const r = TLInput(text);
      if (r && typeof r.text === "string") text = r.text;
    }

    // (Optional) Auto-Cards input phase (for LSIv2 etc.)
    if (typeof AutoCards === "function") {
      const r = AutoCards("input", text);
      if (Array.isArray(r)) { text = r[0]; }
      else if (r && typeof r === "object" && typeof r.text === "string") { text = r.text; }
      else if (typeof r === "string") { text = r; }
    }

    return { text };
  } catch (_) {
    return { text };
  }
};
modifier(text);
