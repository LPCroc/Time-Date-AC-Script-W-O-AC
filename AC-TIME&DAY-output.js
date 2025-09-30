
// DTT 1.4.8
// Output modifier below:
const modifier = (text) => {
    text = TimeAndDay.Hooks.onOutput(text);
    return { text };
};
modifier(text);
