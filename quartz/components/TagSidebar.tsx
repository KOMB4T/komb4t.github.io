import { pathToRoot, slugTag } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const TagSidebar: QuartzComponent = ({ allFiles, fileData }: QuartzComponentProps) => {
  const tagCounts = new Map<string, number>()

  for (const file of allFiles) {
    const tags = file.frontmatter?.tags
    if (!tags || tags.length === 0) {
      continue
    }

    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }

  if (tagCounts.size === 0) {
    return null
  }

  const slug = fileData.slug
  if (!slug) {
    return null
  }

  const baseDir = pathToRoot(slug)
  const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => a[0].localeCompare(b[0], "ru"))

  return (
    <nav class="tag-sidebar">
      <h3>Теги</h3>
      <ul>
        {sortedTags.map(([tag, count]) => (
          <li>
            <a href={`${baseDir}/tags/${slugTag(tag)}`} class="internal">
              <span class="tag-name">{tag}</span>
              <span aria-hidden="true" class="tag-count">
                {count}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

TagSidebar.css = `
.tag-sidebar {
  margin-top: 1.5rem;
  font-size: 0.92rem;
}

.tag-sidebar h3 {
  margin: 0 0 0.6rem;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--gray);
}

.tag-sidebar ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}

.tag-sidebar li a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-decoration: none;
  padding: 0.35rem 0.55rem;
  border-radius: 8px;
  color: inherit;
  border: 1px solid transparent;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.tag-sidebar li a:hover {
  border-color: var(--secondary);
  background: rgba(40, 75, 99, 0.08);
}

:root[saved-theme="dark"] .tag-sidebar li a:hover {
  background: rgba(132, 165, 157, 0.16);
}

.tag-sidebar .tag-name {
  flex: 1 1 auto;
}

.tag-sidebar .tag-count {
  font-size: 0.8rem;
  border-radius: 999px;
  background: var(--highlight);
  padding: 0.15rem 0.5rem;
  margin-left: 0.5rem;
}
`

export default (() => TagSidebar) satisfies QuartzComponentConstructor
