import { useEffect, useState } from 'react'

/** In-page links that stay under the header and highlight the section being read. */
export function SectionNav({ items, label }: { items: [id: string, title: string][]; label: string }) {
  const [active, setActive] = useState(items[0][0])
  const ids = items.map(([id]) => id).join(',')
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) setActive(visible.target.id)
    }, { rootMargin: '-30% 0px -60% 0px' })
    for (const id of ids.split(',')) { const node = document.getElementById(id); if (node) observer.observe(node) }
    return () => observer.disconnect()
  }, [ids])
  return <nav className="section-nav" aria-label={label}>
    {items.map(([id, title]) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined}>{title}</a>)}
  </nav>
}
