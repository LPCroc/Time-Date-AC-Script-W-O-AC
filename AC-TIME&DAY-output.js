// Advance/narrate time first, then let Auto-Cards analyze the final prose.
const modifier = (text) => {
  try {
    // Time system (AC-TIME&DAY)
    if (typeof TLOutput === "function") {
      const r = TLOutput(text);
      if (r && typeof r.text === "string") text = r.text;
    }

    // Auto-Cards output phase
    if (typeof AutoCards === "function") {
      const r = AutoCards("output", text);
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
