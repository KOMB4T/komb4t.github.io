import { joinSegments, QUARTZ, FullSlug } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"
import { BuildCtx } from "../../util/ctx"
import { createRequire } from "module"

const require = createRequire(import.meta.url)

let sharpModule: any
function getSharp() {
  if (!sharpModule) {
    try {
      sharpModule = require("sharp")
    } catch {
      throw new Error(
        "Optional dependency 'sharp' is required for Favicon emitter. Install it with `npm install sharp`.",
      )
    }
  }

  return sharpModule.default ?? sharpModule
}

export const Favicon: QuartzEmitterPlugin = () => ({
  name: "Favicon",
  async *emit({ argv }) {
    const iconPath = joinSegments(QUARTZ, "static", "icon.png")

    const sharp = getSharp()
    const faviconContent = sharp(iconPath).resize(48, 48).toFormat("png")

    yield write({
      ctx: { argv } as BuildCtx,
      slug: "favicon" as FullSlug,
      ext: ".ico",
      content: faviconContent,
    })
  },
  async *partialEmit() {},
})
