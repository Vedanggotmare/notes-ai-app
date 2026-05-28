export interface Highlight {
  start: number
  end: number
  color: string
}

export interface Note {
  id: string
  title: string
  content: string
  categories: string[]
  tags: string[]
  notebook: string
  createdAt: string
  updatedAt: string
  connections: string[]
  font?: string
  highlights?: Highlight[]
}

export interface Notebook {
  id: string
  name: string
  color: string
}

export interface Category {
  id: string
  name: string
  color: string
  icon: string
}

export interface GraphNode {
  id: string
  label: string
  type: 'note' | 'category' | 'tag'
  val?: number
  color?: string
  x?: number
  y?: number
}

export interface GraphLink {
  source: string
  target: string
  label?: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export type ViewMode = 'notes' | 'graph' | 'todo' | 'flow'

export type FlowShapeType = 'rect' | 'rounded' | 'diamond' | 'circle' | 'text'

export interface FlowNode {
  id: string
  type: FlowShapeType
  x: number
  y: number
  width: number
  height: number
  label: string
  fill: string
  stroke: string
}

export interface FlowEdge {
  id: string
  from: string
  to: string
  label: string
  color: string
}

export interface Flowchart {
  id: string
  name: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  createdAt: string
  updatedAt: string
}

export interface TodoItem {
  id: string
  text: string
  done: boolean
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  createdAt: string
}

export interface Reminder {
  id: string
  text: string
  datetime: string
  done: boolean
  createdAt: string
}
export type SidebarItem = 'all' | 'notebook' | 'category' | 'tag' | 'trash'

export interface SidebarSelection {
  type: SidebarItem
  value?: string
}
