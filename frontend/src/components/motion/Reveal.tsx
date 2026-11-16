import { createElement } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useInView } from '../../hooks/useInView'

type Tag = 'div' | 'section' | 'article' | 'li' | 'p' | 'figure' | 'header' | 'span'

/** Fades and lifts its content into place the first time it is scrolled into view. */
export function Reveal({ children, as = 'div', delay = 0, variant = 'up', className = '', id, labelledBy }: {
  children: ReactNode; as?: Tag; delay?: number; variant?: 'up' | 'left' | 'right' | 'scale' | 'fade'
  className?: string; id?: string; labelledBy?: string
}) {
  const [ref, inView] = useInView<HTMLElement>()
  return createElement(as, {
    ref, id, 'aria-labelledby': labelledBy, 'data-variant': variant,
    className: `reveal${inView ? ' is-visible' : ''}${className ? ` ${className}` : ''}`,
    style: delay ? { '--reveal-delay': `${delay}ms` } as CSSProperties : undefined,
  }, children)
}
