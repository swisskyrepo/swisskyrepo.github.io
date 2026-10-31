zolaTheme.analytics = {
  HashEnableKey: "#enable-analytics",
  HashDisableKey: "#disable-analytics",
  KeyValue: "t",

  enable: function ({ key }) {
    return localStorage.removeItem(key)
  },

  disable: function ({ key }) {
    return localStorage.setItem(key, this.KeyValue)
  },

  isEnabled: function ({ key, init }) {
    if (init) {
      if (window.location.hash === this.HashEnableKey) {
        // Enable only if disabled, else is already enabled
        if (localStorage.getItem(key) === this.KeyValue) {
          this.enable({ key })
          // TODO: improve alert and i18n
          alert("Analytics is now ENABLED in this browser. To disable analytics, load #disable-analytics.")
        }
      } else if (window.location.hash === this.HashDisableKey) {
        // Disable only if enabled, else is already disabled
        if (localStorage.getItem(key) !== this.KeyValue) {
          this.disable({ key })
          alert("Analytics is now DISABLED in this browser. To enable analytics, load #enable-analytics.")
        }
      }
    }
    return localStorage.getItem(key) !== this.KeyValue
  },

  initGoatCounter: function ({ src, endpoint }) {
    if (this.isEnabled({ key: "skipgc", init: true })) {
      const newScript = document.createElement("script")
      newScript.async = true
      newScript.src = src
      newScript.dataset.goatcounter = endpoint
      if (undefined != document.body) {
        document.body.appendChild(newScript)
      } else if (undefined != document.head) {
        document.head.appendChild(newScript)
      }
    }
  },

  initVercel: function ({ src }) {
    if (this.isEnabled({ key: "va-disable", init: true })) {
      if (undefined == window.va) {
        window.va = function () {
          (window.vaq = window.vaq || []).push(arguments)
        }
      }
      const newScript = document.createElement("script")
      newScript.async = true
      newScript.src = src
      if (undefined != document.body) {
        document.body.appendChild(newScript)
      } else if (undefined != document.head) {
        document.head.appendChild(newScript)
      }
    }
  },

}
