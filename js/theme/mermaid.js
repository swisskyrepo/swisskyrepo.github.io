zolaTheme.mermaid = {

  init: function ({ mermaid, s }) {
    this.Mermaid = mermaid;

    // Add data-mermaid-code attribute on all mermaid block.
    const mermaidBlocks = document.querySelectorAll(s)
    mermaidBlocks.forEach(function (element) {
      element.setAttribute("data-mermaid-code", element.innerHTML)
    })

    this.initMermaid({ isDark: zolaTheme.color.HtmlClass.contains(zolaTheme.color.DarkClass) })

    // Re-render mermaid when theme changed.
    document.body.addEventListener(zolaTheme.color.EventName, function (e) {
      zolaTheme.mermaid.rerender(mermaidBlocks, e)
    })
  },

  rerender: function (mermaidBlocks, e) {
    mermaidBlocks.forEach(function (element) {
      const mermaidCode = element.getAttribute("data-mermaid-code")
      if (mermaidCode != null) {
        element.removeAttribute("data-processed")
        element.innerHTML = mermaidCode
      }
    })
    zolaTheme.mermaid.initMermaid({ isDark: e.detail === zolaTheme.color.DarkPrefName })
  },

  initMermaid: function ({ isDark }) {
    this.Mermaid.initialize({
      theme: isDark ? "dark" : "default",
      themeVariables: {
        darkMode: isDark
      },
      startOnLoad: false,
    })
    this.Mermaid.run()
  },

}
