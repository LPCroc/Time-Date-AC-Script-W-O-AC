
// DTT 1.4.8
// Context modifier below:
const modifier = (text) => {
    text = TimeAndDay.Hooks.onContext(text);
    return { text };
};
modifier(text);
