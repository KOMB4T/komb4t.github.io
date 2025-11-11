const userPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
const currentTheme = localStorage.getItem("theme") ?? userPref
document.documentElement.setAttribute("saved-theme", currentTheme)

const emitThemeChangeEvent = (theme: "light" | "dark") => {
  const event: CustomEventMap["themechange"] = new CustomEvent("themechange", {
    detail: { theme },
  })
  document.dispatchEvent(event)
}

const setupThemeToggle = () => {
  const themeButton = document.querySelector("#darkmode") as HTMLButtonElement | null
  if (!themeButton || themeButton.dataset.themeInit === "true") {
    return
  }

  themeButton.dataset.themeInit = "true"

  const labelEl = themeButton.querySelector(".theme-toggle-label") as HTMLElement | null
  const addCleanup = window.addCleanup?.bind(window)

  const updateThemeButton = (theme: "light" | "dark") => {
    themeButton.dataset.theme = theme
    if (labelEl) {
      const lightLabel = labelEl.dataset.labelLight ?? "Светлая тема"
      const darkLabel = labelEl.dataset.labelDark ?? "Тёмная тема"
      labelEl.textContent = theme === "dark" ? darkLabel : lightLabel
    }
  }

  const switchTheme = () => {
    const newTheme =
      document.documentElement.getAttribute("saved-theme") === "dark" ? "light" : "dark"
    document.documentElement.setAttribute("saved-theme", newTheme)
    localStorage.setItem("theme", newTheme)
    emitThemeChangeEvent(newTheme)
    updateThemeButton(newTheme)
  }

  const colorSchemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

  const themeChange = (e: MediaQueryListEvent) => {
    const newTheme = e.matches ? "dark" : "light"
    document.documentElement.setAttribute("saved-theme", newTheme)
    localStorage.setItem("theme", newTheme)
    emitThemeChangeEvent(newTheme)
    updateThemeButton(newTheme)
  }

  const currentTheme = (
    document.documentElement.getAttribute("saved-theme") === "dark" ? "dark" : "light"
  ) as "light" | "dark"
  updateThemeButton(currentTheme)

  themeButton.addEventListener("click", switchTheme)
  colorSchemeMediaQuery.addEventListener("change", themeChange)

  addCleanup?.(() => {
    themeButton.removeEventListener("click", switchTheme)
    colorSchemeMediaQuery.removeEventListener("change", themeChange)
    delete themeButton.dataset.themeInit
  })
}

const runSetup = () => {
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        setupThemeToggle()
      },
      { once: true },
    )
  } else {
    setupThemeToggle()
  }
}

runSetup()
document.addEventListener("nav", () => {
  setupThemeToggle()
})
