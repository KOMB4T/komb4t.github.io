// @ts-ignore emitted script should run before DOM load without module semantics
import tagFilterScript from "./scripts/tagFilter.inline"
import { QuartzComponent, QuartzComponentConstructor } from "./types"

const TagFilter: QuartzComponent = () => null

TagFilter.beforeDOMLoaded = tagFilterScript

export default (() => TagFilter) satisfies QuartzComponentConstructor