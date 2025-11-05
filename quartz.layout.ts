import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import type { QuartzComponent } from "./quartz/components/types"

const EmptyFooter: QuartzComponent = () => null

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [Component.TagFilter()],
  footer: EmptyFooter,
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.Darkmode(),
    Component.Search(),
    Component.Explorer({
      title: "Скрипты",
      folderDefaultState: "open",
      folderClickBehavior: "link",
      useSavedState: false,
    }),
    Component.TagSidebar(),
  ],
  right: [],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.Darkmode(),
    Component.Search(),
    Component.Explorer({
      title: "Скрипты",
      folderDefaultState: "open",
      folderClickBehavior: "link",
      useSavedState: false,
    }),
    Component.TagSidebar(),
  ],
  right: [],
}
