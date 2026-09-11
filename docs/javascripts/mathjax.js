window.MathJax = {
  tex: {
    inlineMath: [["\\(", "\\)"]],
    displayMath: [
      ["\\[", "\\]"],
      ["$$", "$$"],
    ],
  },
  options: {
    ignoreHtmlClass: "\\btex2jax_ignore\\b",
    processHtmlClass: "\\btex2jax_process\\b",
  },
};

document$.subscribe(() => {
  MathJax.typesetPromise();
});
