// ==UserScript==
// @name         [GWars] Hide enemy realty on market
// @namespace    gwars-tools
// @version      0.3.0
// @description  Reorders sold realty (struck rows) to the bottom of statlist pages and adds sorting modes for the active rows.
// @match        https://www.gwars.io/statlist.php*
// @grant        none
// @run-at       document-end
// @downloadURL  https://raw.githubusercontent.com/KOMB4T/GWarsScripts/main/%5BGWars%5DHideEnemyRealtyOnMarket.user.js
// @updateURL    https://raw.githubusercontent.com/KOMB4T/GWarsScripts/main/%5BGWars%5DHideEnemyRealtyOnMarket.user.js
// ==/UserScript==

;(function () {
  "use strict"

  const INACTIVE_ROW_CLASS = "gwars-hide-realty__inactive"
  const CONTROLS_CLASS = "gwars-hide-realty__controls"
  const STYLE_ID = "gwars-hide-realty-style"
  const STORAGE_KEY_SORT_MODE = "gwars-hide-realty-sort-mode"
  const TABLE_STATES = new WeakMap()

  const SORT_LABEL_TEXT = "Сортировка:"
  const SHOW_ALL_TEXT = "Показать все данные"
  const SEPARATOR_TEXT = "  |  "

  const SORT_MODES = [
    { value: "distance", label: "по удалённости" },
    { value: "volume", label: "по объёму" },
    { value: "price", label: "по цене" },
  ]
  const DEFAULT_SORT_MODE = "price"

  const HEADER_MARKERS = ["Объект", "Может", "Можем"]

  const MAP_LINK_PATTERN = /^\[(G|Z)\]/i
  const RED_COLOR_HINTS = ["color:red", "#ff", "red"]
  const ORANGE_COLOR_HINTS = ["#ed7c02", "#f07d02", "orange"]
  const VOLUME_COLUMN_INDEX = 1

  const init = () => {
    const tables = Array.from(document.querySelectorAll("table.withborders")).filter(
      isStatlistTable,
    )
    if (tables.length === 0) {
      return
    }

    injectStyles()
    const savedMode = getSavedSortMode()
    tables.forEach((table) => setupTable(table, savedMode))
  }

  const isStatlistTable = (table) => {
    if (!table || !table.tBodies.length) {
      return false
    }
    const headerCell = table.tBodies[0]?.querySelector("tr td.greenbg b")
    const text = headerCell?.textContent?.trim() ?? ""
    return HEADER_MARKERS.some((marker) => text.includes(marker))
  }

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) {
      return
    }
    const style = document.createElement("style")
    style.id = STYLE_ID
    style.textContent = `
      tr.${INACTIVE_ROW_CLASS} td {
        background-color: #d1d1d1 !important;
      }
      .${CONTROLS_CLASS} {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 12px;
      }
      .${CONTROLS_CLASS} select {
        font-size: 12px;
        padding: 2px 4px;
      }
    `
    document.head.appendChild(style)
  }

  const repositionStrikeRows = (state) => {
    if (!state?.strikeRows?.length) {
      return
    }
    state.strikeRows.forEach((row) => {
      row.classList.add(INACTIVE_ROW_CLASS)
      if (!row.parentElement) {
        state.tbody.appendChild(row)
      }
    })
    state.strikeRows.forEach((row) => {
      if (state.footerRow && state.footerRow.parentElement === state.tbody) {
        state.tbody.insertBefore(row, state.footerRow)
      } else {
        state.tbody.appendChild(row)
      }
    })
  }

  const getAnchorRow = (state) => {
    if (!state) {
      return null
    }
    const activeStrikeRow = state.strikeRows.find((row) => row.parentElement === state.tbody)
    if (activeStrikeRow) {
      return activeStrikeRow
    }
    if (state.footerRow && state.footerRow.parentElement === state.tbody) {
      return state.footerRow
    }
    return null
  }

  const setupTable = (table, initialMode) => {
    const tbody = table.tBodies[0]
    if (!tbody) {
      return
    }

    const allRows = Array.from(tbody.rows)
    if (allRows.length === 0) {
      return
    }

    const { headerRow, dataRows, strikeRows, footerRow } = splitRows(allRows)
    if (!headerRow) {
      return
    }

    dataRows.forEach((row, index) => {
      row.dataset.gwarsOriginalIndex = String(index)
    })

    const state = {
      tbody,
      headerRow,
      dataRows,
      strikeRows,
      footerRow,
    }
    TABLE_STATES.set(table, state)

    repositionStrikeRows(state)

    const controls = ensureControls(table)
    const mode = isValidSortMode(initialMode) ? initialMode : DEFAULT_SORT_MODE
    controls.value = mode
    applySort(table, mode)
    controls.addEventListener("change", () => {
      const nextMode = isValidSortMode(controls.value) ? controls.value : DEFAULT_SORT_MODE
      applySort(table, nextMode)
      saveSortMode(nextMode)
    })
  }

  const splitRows = (rows) => {
    let headerRow = null
    let footerRow = null
    const dataRows = []
    const strikeRows = []

    rows.forEach((row) => {
      if (row.querySelector("table")) {
        footerRow = row
        return
      }

      if (!headerRow && containsHeader(row)) {
        headerRow = row
        return
      }

      if (row.classList.contains(INACTIVE_ROW_CLASS) || row.querySelector("s")) {
        strikeRows.push(row)
        return
      }

      dataRows.push(row)
    })

    return { headerRow, dataRows, strikeRows, footerRow }
  }

  const containsHeader = (row) => {
    const boldCells = Array.from(row.querySelectorAll("b"))
    return boldCells.some((node) => {
      const text = node.textContent?.trim() ?? ""
      return HEADER_MARKERS.some((marker) => text.includes(marker))
    })
  }

  const createSortSelect = () => {
    const select = document.createElement("select")
    SORT_MODES.forEach(({ value, label }) => {
      const option = document.createElement("option")
      option.value = value
      option.textContent = label
      select.appendChild(option)
    })
    return select
  }

  const findShowAllLink = (table) => {
    const scopes = []
    if (table?.parentElement) {
      scopes.push(table.parentElement)
    }
    scopes.push(document)

    for (const scope of scopes) {
      const links = scope.querySelectorAll('a[href*="statlist.php"]')
      for (const link of links) {
        const text = link.textContent?.trim() ?? ""
        if (text === SHOW_ALL_TEXT || link.href.includes("no_island=1")) {
          return link
        }
      }
    }
    return null
  }

  const ensureControls = (table) => {
    const showAllLink = findShowAllLink(table)
    if (showAllLink) {
      const existingContainer = showAllLink.parentElement?.querySelector(`span.${CONTROLS_CLASS}`)
      if (existingContainer) {
        const existingSelect = existingContainer.querySelector("select")
        if (existingSelect) {
          return existingSelect
        }
      }
      const separator = document.createTextNode(SEPARATOR_TEXT)
      const container = document.createElement("span")
      container.className = CONTROLS_CLASS
      const label = document.createElement("span")
      label.textContent = SORT_LABEL_TEXT
      const select = createSortSelect()
      container.appendChild(label)
      container.appendChild(select)
      showAllLink.after(separator, container)
      return select
    }

    let container = table.previousElementSibling
    if (!(container instanceof HTMLElement) || !container.classList.contains(CONTROLS_CLASS)) {
      container = document.createElement("div")
      container.className = CONTROLS_CLASS
      const label = document.createElement("span")
      label.textContent = SORT_LABEL_TEXT
      const select = createSortSelect()
      container.appendChild(label)
      container.appendChild(select)
      table.parentElement?.insertBefore(container, table)
      return select
    }

    const newSelect = container.querySelector("select") ?? createSortSelect()
    if (!container.contains(newSelect)) {
      container.appendChild(newSelect)
    }
    return newSelect
  }

  const applySort = (table, mode) => {
    const state = TABLE_STATES.get(table)
    if (!state) {
      return
    }

    repositionStrikeRows(state)

    const sortedRows = state.dataRows.slice().sort((a, b) => compareRows(a, b, mode))
    const anchor = getAnchorRow(state)

    sortedRows.forEach((row) => {
      if (anchor) {
        state.tbody.insertBefore(row, anchor)
      } else {
        state.tbody.appendChild(row)
      }
    })

    repositionStrikeRows(state)
  }

  const compareRows = (a, b, mode) => {
    if (mode === "distance") {
      const groupDiff = getDistanceGroup(a) - getDistanceGroup(b)
      if (groupDiff !== 0) {
        return groupDiff
      }
      const volumeDiff = getVolume(b) - getVolume(a)
      if (volumeDiff !== 0) {
        return volumeDiff
      }
    } else if (mode === "volume") {
      const volumeDiff = getVolume(b) - getVolume(a)
      if (volumeDiff !== 0) {
        return volumeDiff
      }
    }

    const indexA = Number.parseInt(a.dataset.gwarsOriginalIndex ?? "0", 10)
    const indexB = Number.parseInt(b.dataset.gwarsOriginalIndex ?? "0", 10)
    return indexA - indexB
  }

  const getVolume = (row) => {
    const cell = row.cells?.[VOLUME_COLUMN_INDEX]
    if (!cell) {
      return 0
    }
    const number = parseInt(cell.textContent?.replace(/\D+/g, "") ?? "", 10)
    return Number.isFinite(number) ? number : 0
  }

  const getDistanceGroup = (row) => {
    const cell = row.cells?.[0]
    if (!cell) {
      return 2
    }
    const mapLink = cell.querySelector('a[href^="/map.php"]')
    if (!mapLink) {
      return 2
    }
    const text = mapLink.textContent?.trim() ?? ""
    if (!MAP_LINK_PATTERN.test(text)) {
      return 2
    }

    const inlineColor = (mapLink.getAttribute("style") || "").toLowerCase()
    const className = mapLink.className?.toLowerCase() ?? ""

    if (isRedColor(inlineColor, className, mapLink)) {
      return 0
    }
    if (isOrangeColor(inlineColor, className, mapLink)) {
      return 1
    }
    return 2
  }

  const isRedColor = (inline, className, node) => {
    if (RED_COLOR_HINTS.some((hint) => inline.includes(hint) || className.includes(hint))) {
      return true
    }
    const color = window.getComputedStyle(node).color.toLowerCase()
    return color.includes("255, 0, 0") || color === "red"
  }

  const isOrangeColor = (inline, className, node) => {
    if (ORANGE_COLOR_HINTS.some((hint) => inline.includes(hint) || className.includes(hint))) {
      return true
    }
    const color = window.getComputedStyle(node).color.toLowerCase()
    return color.includes("237, 124, 2") || color.includes("240, 125, 2")
  }

  const isValidSortMode = (mode) => SORT_MODES.some(({ value }) => value === mode)

  const getSavedSortMode = () => {
    try {
      const value = localStorage.getItem(STORAGE_KEY_SORT_MODE)
      return isValidSortMode(value) ? value : DEFAULT_SORT_MODE
    } catch (err) {
      return DEFAULT_SORT_MODE
    }
  }

  const saveSortMode = (mode) => {
    try {
      localStorage.setItem(STORAGE_KEY_SORT_MODE, mode)
    } catch (err) {
      // ignore storage issues
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true })
  } else {
    init()
  }
})()
