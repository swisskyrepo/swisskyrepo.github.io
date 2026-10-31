zolaTheme.search = {

  init: function ({ scripts, arg }) {
    this.SearchFiles = scripts
    this.ElWrapper = document.querySelector(arg.w)
    this.ElResults = document.querySelector(arg.r)
    this.CursorWait = false
  },

  toggle: function () {
    this.ElWrapper.classList.remove("hidden")

    const q = prompt("Enter your search term")
    if (null == q) {
      this.ElWrapper.classList.add("hidden")
      return true
    }

    if ("undefined" === typeof (searchIndex) && "undefined" === typeof (elasticlunr)) {
      if (!this.CursorWait) {
        document.body.classList.add("cursor-progress")
        this.CursorWait = true
      }
      this.ElResults.innerHTML = "<li>Search: Please wait...</li>"
      this.SearchFiles.reduce(
        (promise, src) => promise.then(() => this.loadScript(src)),
        Promise.resolve()
      )
        .catch((error) => {
          this.showError("<li>Search file not found: <code>" + error + "</code></li>")
          if (this.CursorWait) {
            document.body.classList.remove("cursor-progress")
            this.CursorWait = false
          }
        })
        .then((t) => {
          this.index = elasticlunr.Index.load(window.searchIndex)
          this.act(q)
        })
    } else {
      this.act(q)
    }
  },

  act: function (q) {
    const results = this.index.search(q, {})
    const resultsCount = results.length
    if (resultsCount > 0) {
      const rows = ["<li><strong>" + resultsCount + "</strong> search " +
        (resultsCount === 1 ? "result" : "results") + " for <code>" + this.myEscape(q) + "</code>:</li>"]
      for (let i = 0; i < resultsCount; i++) {
        const result = results[i]
        rows.push("<li><a href=\"" + this.myEscape(result.ref) + "\">" +
          this.myEscape(result.doc.title) + "</a></li>")
      }
      this.ElResults.innerHTML = rows.join("")
    } else {
      this.showError("<li>No search results for <code>" + this.myEscape(q) + "</code>.</li>")
    }
    this.ElResults.scrollIntoViewIfNeeded()
    if (this.CursorWait) {
      document.body.classList.remove("cursor-progress")
      this.CursorWait = false
    }
  },

  showError: function (err) {
    this.ElResults.innerHTML = err
    this.ElResults.scrollIntoViewIfNeeded()
  },

  myEscape: function (code) {
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").
      replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
  },

  loadScript: function (fileName) {
    return new Promise(function (resolve, reject) {
      const newScript = document.createElement("script")
      newScript.onload = function () { return resolve(fileName) }
      newScript.onerror = function () { return reject(fileName) }
      newScript.async = true
      newScript.src = fileName
      document.head.appendChild(newScript)
    })
  },

}
