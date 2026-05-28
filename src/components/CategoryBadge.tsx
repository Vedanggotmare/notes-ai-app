import { getCategories } from '../lib/storage'

const categories = getCategories()

interface Props {
  name: string
}

export function CategoryBadge({ name }: Props) {
  const cat = categories.find(c => c.name === name)
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: (cat?.color ?? '#888') + '33', color: cat?.color ?? '#888' }}
    >
      {cat?.icon && <span>{cat.icon}</span>}
      {name}
    </span>
  )
}
