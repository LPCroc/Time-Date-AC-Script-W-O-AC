
// DTT 1.4.8
// Input modifier below:
const modifier = (text) => {
    text = TimeAndDay.Hooks.onInput(text);
    return { text };
};
modifier(text);
