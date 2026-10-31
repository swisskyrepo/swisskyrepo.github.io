zolaTheme.trans = {

  initButton: function ({ btn, rel }) {
    const pageLanguage = document.documentElement.getAttribute("lang")
    const pageTranslations = document.head.querySelectorAll('link[rel="alternate"][hreflang]')

    let userLanguages = []
    if (pageTranslations.length < 2) return
    else if (pageTranslations.length === 2) userLanguages = [
      pageTranslations[0].getAttribute("hreflang"), pageTranslations[1].getAttribute("hreflang")]
    else if (navigator.languages) userLanguages = navigator.languages
    else if (navigator.language != undefined) userLanguages = [navigator.language]
    else if (navigator.userLanguage != undefined) userLanguages = [navigator.userLanguage]

    const pageTranslationsLinks = new Map()
    pageTranslations.forEach(function (el) {
      const hreflang = el.getAttribute("hreflang")
      const href = rel === "true" ? el.dataset.href : el.getAttribute("href")
      if (hreflang !== pageLanguage) {
        pageTranslationsLinks.set(hreflang, href)
        const hreflangcode = hreflang.split("-")[0]
        if (!pageTranslationsLinks.has(hreflangcode)) {
          pageTranslationsLinks.set(hreflangcode, href)
        }
      }
    })

    const pageTranslationLink = this.getTransLink(userLanguages, pageTranslationsLinks)
    if (undefined != pageTranslationLink) {
      btn.classList.remove("hidden")
      btn.addEventListener("click", function () {
        window.location.href = pageTranslationLink
      })
    }
  },

  getTransLink: function (userLanguages, pageTranslationsLinks) {
    for (let i = 0; i < userLanguages.length; i++) {
      const userLanguage = userLanguages[i]
      const pageTranslationLink = pageTranslationsLinks.get(userLanguage) ||
        pageTranslationsLinks.get(userLanguage.split("-")[0])
      if (undefined != pageTranslationLink) {
        return pageTranslationLink
      }
    }
  },

}
