const isIndexPage = () => {
  const slug = document.body?.dataset.slug ?? ""
  return slug === "" || slug === "index"
}

const setupTagFilter = () => {
  if (!isIndexPage()) {
    return
  }

  const filterContainer = document.querySelector("#tag-filter") as HTMLElement | null
  const catalog = document.querySelector(".script-catalog") as HTMLElement | null

  if (!filterContainer || !catalog) {
    return
  }

  const cards = Array.from(catalog.querySelectorAll<HTMLElement>(".script-card"))
  if (cards.length === 0) {
    return
  }

  const tags = new Set<string>()
  for (const card of cards) {
    const raw = card.getAttribute("data-tags")
    if (!raw) continue
    raw
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .forEach((tag) => tags.add(tag))
  }

  const sortedTags = Array.from(tags).sort((a, b) => a.localeCompare(b, "ru"))

  filterContainer.querySelectorAll("button[data-tag]").forEach((button) => button.remove())

  for (const tag of sortedTags) {
    const button = document.createElement("button")
    button.type = "button"
    button.dataset.tag = tag
    button.textContent = `# ${tag}`
    filterContainer.appendChild(button)
  }

  const applyFilter = (tag: string) => {
    cards.forEach((card) => {
      const raw = card.getAttribute("data-tags") ?? ""
      const cardTags = raw.split(",").map((value) => value.trim())
      const matches = tag.length === 0 || cardTags.includes(tag)
      card.style.display = matches ? "" : "none"
    })
  }

  const clearButtonStates = () => {
    filterContainer
      .querySelectorAll("button[data-tag]")
      .forEach((button) => button.classList.remove("is-active"))
  }

  let activeTag = filterContainer.dataset.activeTag ?? ""

  if (filterContainer.dataset.filterBound !== "true") {
    filterContainer.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      if (target.matches(".filter-reset")) {
        activeTag = ""
        filterContainer.dataset.activeTag = ""
        clearButtonStates()
        applyFilter(activeTag)
        return
      }

      const tag = target.dataset.tag
      if (!tag) return

      if (activeTag === tag) {
        activeTag = ""
        filterContainer.dataset.activeTag = ""
        target.classList.remove("is-active")
      } else {
        activeTag = tag
        filterContainer.dataset.activeTag = tag
        clearButtonStates()
        target.classList.add("is-active")
      }

      applyFilter(activeTag)
    })

    filterContainer.dataset.filterBound = "true"
  }

  clearButtonStates()
  if (activeTag.length > 0) {
    const activeButton = filterContainer.querySelector<HTMLButtonElement>(
      `button[data-tag="${activeTag}"]`,
    )
    activeButton?.classList.add("is-active")
  }

  applyFilter(activeTag)
}

const scheduleSetup = (attempt = 0) => {
  if (!isIndexPage()) {
    return
  }

  const filterContainer = document.querySelector("#tag-filter")
  const catalog = document.querySelector(".script-catalog")

  if (!filterContainer || !catalog) {
    if (attempt < 5) {
      window.setTimeout(() => scheduleSetup(attempt + 1), 80)
    }
    return
  }

  setupTagFilter()
}

const runWhenReady = () => {
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        scheduleSetup()
      },
      { once: true },
    )
  } else {
    scheduleSetup()
  }
}

runWhenReady()
document.addEventListener("nav", () => scheduleSetup())