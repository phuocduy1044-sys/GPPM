import { useState, useRef, useMemo } from 'react'
import {
  IconArrowBackUp,
  IconArrowsMaximize,
  IconFocus2,
  IconMinus,
  IconPlus,
  IconSearch,
  IconTestPipe,
} from '@tabler/icons-react'
import type { GraphNode, GraphEdge } from '@/lib/reviewTypes'

interface GraphReviewProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId?: string
  onSelectNode: (nodeId: string) => void
  onAnalyzeFile?: (file: string) => void
}

export function GraphReview({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onAnalyzeFile,
}: GraphReviewProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 40, y: 30 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterIssueOnly, setFilterIssueOnly] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const callerNames = new Set(
    (selectedNode?.calledBy || []).map((c: any) => (typeof c === 'string' ? c : c))
  )
  const calleeNames = new Set(
    (selectedNode?.calls || []).map((c: any) => (typeof c === 'string' ? c : c.functionName))
  )

  const isCaller = (fnName: string) => callerNames.has(fnName)
  const isCallee = (fnName: string) => calleeNames.has(fnName)
  const isRelated = (n: any) => {
    if (!selectedNodeId) return true
    if (n.id === selectedNodeId) return true
    return isCaller(n.functionName) || isCallee(n.functionName)
  }

  // Filter nodes matching search & filter
  const matchedNodeIds = new Set(
    nodes
      .filter((n) => {
        if (filterIssueOnly && !n.hasIssue) return false
        if (searchQuery && !n.functionName.toLowerCase().includes(searchQuery.toLowerCase())) return false
        return true
      })
      .map((n) => n.id)
  )

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  // 1. Group nodes dynamically by file
  const fileGroups = useMemo(() => {
    const groups = new Map<string, GraphNode[]>()
    for (const node of nodes) {
      const fileName = node.file || 'unknown.js'
      if (!groups.has(fileName)) {
        groups.set(fileName, [])
      }
      groups.get(fileName)!.push(node)
    }
    return groups
  }, [nodes])

  // 2. Compute dynamic layout for file containers and node positions
  const { fileContainers, nodePositions, firstFileWithIssue } = useMemo(() => {
    const containers: Array<{
      name: string
      lang: string
      x: number
      y: number
      width: number
      height: number
      hasIssue: boolean
    }> = []
    const positions: Record<string, { x: number; y: number; width: number; height: number; file: string }> = {}

    const containerWidth = 220
    const containerSpacing = 50
    const startX = 40
    const startY = 100
    const nodeHeight = 44
    const nodeGap = 12
    const headerHeight = 52
    const bottomPadding = 16

    let fileIdx = 0
    let firstIssueFile: string | null = null

    for (const [fileName, fileNodes] of fileGroups.entries()) {
      const count = fileNodes.length
      const containerHeight = Math.max(130, headerHeight + count * (nodeHeight + nodeGap) - nodeGap + bottomPadding)
      const containerX = startX + fileIdx * (containerWidth + containerSpacing)
      const containerY = startY

      const hasFileIssue = fileNodes.some((n) => n.hasIssue)
      if (hasFileIssue && !firstIssueFile) {
        firstIssueFile = fileName
      }

      const lang = fileName.endsWith('.ts') || fileName.endsWith('.tsx')
        ? `TypeScript · ${count} hàm`
        : `JavaScript · ${count} hàm`

      containers.push({
        name: fileName,
        lang,
        x: containerX,
        y: containerY,
        width: containerWidth,
        height: containerHeight,
        hasIssue: hasFileIssue,
      })

      // Position each node inside container
      fileNodes.forEach((node, nodeIdx) => {
        const nx = containerX + 14
        const ny = containerY + headerHeight + nodeIdx * (nodeHeight + nodeGap)
        const nw = containerWidth - 28
        const nh = nodeHeight

        const pos = { x: nx, y: ny, width: nw, height: nh, file: fileName }
        positions[node.id] = pos
        // Also index by functionName and fn:*:name for robust edge lookup
        if (!positions[node.functionName]) {
          positions[node.functionName] = pos
        }
      })

      fileIdx++
    }

    return {
      fileContainers: containers,
      nodePositions: positions,
      firstFileWithIssue: firstIssueFile || (containers[0]?.name ?? 'auth.js'),
    }
  }, [fileGroups])

  // Helper to resolve node position by ID or name
  const getNodePos = (idOrName: string) => {
    if (nodePositions[idOrName]) return nodePositions[idOrName]
    const found = nodes.find(
      (n) => n.id === idOrName || n.functionName === idOrName || n.id.endsWith(':' + idOrName)
    )
    if (found && nodePositions[found.id]) return nodePositions[found.id]
    for (const key of Object.keys(nodePositions)) {
      if (key.endsWith(':' + idOrName) || key.endsWith('/' + idOrName)) {
        return nodePositions[key]
      }
    }
    return null
  }

  // 3. Compute dynamic bezier curve edges
  const computedEdges = useMemo(() => {
    return edges
      .map((edge) => {
        const src = getNodePos(edge.sourceNodeId)
        const tgt = getNodePos(edge.targetNodeId)
        if (!src || !tgt) return null

        let x1: number, y1: number, x2: number, y2: number
        let cx1: number, cy1: number, cx2: number, cy2: number

        const isSameFile = src.file === tgt.file
        const isSelected =
          edge.sourceNodeId === selectedNodeId ||
          edge.targetNodeId === selectedNodeId ||
          src.file === selectedNode?.file ||
          tgt.file === selectedNode?.file

        if (isSameFile) {
          // Arc out to the right within the same file container
          x1 = src.x + src.width
          y1 = src.y + src.height / 2
          x2 = tgt.x + tgt.width
          y2 = tgt.y + tgt.height / 2
          const arc = Math.abs(y2 - y1) * 0.4 + 30
          cx1 = x1 + arc
          cy1 = y1
          cx2 = x2 + arc
          cy2 = y2
        } else if (src.x + src.width <= tgt.x) {
          // Flow from left to right
          x1 = src.x + src.width
          y1 = src.y + src.height / 2
          x2 = tgt.x
          y2 = tgt.y + tgt.height / 2
          const dx = Math.max(30, (x2 - x1) * 0.45)
          cx1 = x1 + dx
          cy1 = y1
          cx2 = x2 - dx
          cy2 = y2
        } else {
          // Flow from right to left (backwards)
          x1 = src.x
          y1 = src.y + src.height / 2
          x2 = tgt.x + tgt.width
          y2 = tgt.y + tgt.height / 2
          const dx = Math.max(35, Math.abs(x1 - x2) * 0.35)
          cx1 = x1 - dx
          cy1 = y1 + (y2 > y1 ? 20 : -20)
          cx2 = x2 + dx
          cy2 = y2 + (y2 > y1 ? -20 : 20)
        }

        const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`
        const isHttp = edge.type === 'inferred_http' || edge.targetNodeId.toLowerCase().includes('http')

        return {
          id: edge.id,
          d,
          isHttp,
          isCrossFile: src.file !== tgt.file,
          isSelected,
          sourceId: edge.sourceNodeId,
          targetId: edge.targetNodeId,
        }
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)
  }, [edges, nodePositions, selectedNodeId, selectedNode])

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#070c14] select-none">
      {/* Top Bar inside canvas */}
      <div className="z-10 flex h-11 shrink-0 items-center justify-between border-b border-border/40 bg-[#070c14]/90 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <IconFocus2 className="size-4 text-primary" stroke={2} />
            <span>Graph Review</span>
          </div>
          <span className="text-xs text-muted-foreground">
            · {nodes.length} hàm · {edges.length} cạnh · {fileContainers.length} tệp
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter issues toggle */}
          <button
            type="button"
            onClick={() => setFilterIssueOnly((f) => !f)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold border transition-all ${
              filterIssueOnly
                ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                : 'border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            {filterIssueOnly ? 'Đang lọc: Chỉ lỗi' : 'Tất cả hàm'}
          </button>

          {/* Search bar */}
          <div className="relative flex items-center">
            <IconSearch className="absolute left-2.5 size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm hàm... (Enter)"
              className="h-7 w-48 rounded-md border border-border/60 bg-muted/40 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Canvas Zoom & Fit buttons */}
          <div className="flex items-center rounded-md border border-border/60 bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 0.15, 2.5))}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Phóng to"
            >
              <IconPlus className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Thu nhỏ"
            >
              <IconMinus className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1)
                setPan({ x: 40, y: 30 })
              }}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Đặt lại góc nhìn"
            >
              <IconArrowBackUp className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1.1)}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Vừa khung"
            >
              <IconArrowsMaximize className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive SVG Canvas */}
      <div
        className="relative flex-1 cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={(e) => {
          e.preventDefault()
          const delta = e.deltaY < 0 ? 0.08 : -0.08
          setZoom((z) => Math.min(Math.max(z + delta, 0.4), 2.5))
        }}
      >
        {/* Background Grid Pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {/* Legend Box */}
        <div className="absolute left-4 top-4 z-20 rounded-lg border border-border/50 bg-[#0d1522]/90 p-2.5 text-[11px] shadow-3d-2 backdrop-blur-md">
          <div className="flex flex-col gap-1.5 font-mono text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-4 bg-cyan-400" />
              <span>calls</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-cyan-400" />
              <span>calls chéo tệp</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-purple-400" />
              <span>HTTP suy đoán</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              <span>hàm có issue</span>
            </div>
          </div>
        </div>

        {/* Action button: Phân tích tệp */}
        <div className="absolute right-4 top-4 z-20">
          <button
            type="button"
            onClick={() => onAnalyzeFile?.(firstFileWithIssue)}
            className="flex items-center gap-1.5 rounded-lg border border-lime-500/40 bg-lime-500/10 px-3 py-1.5 text-xs font-semibold text-lime-400 shadow-3d-1 transition-all hover:bg-lime-500/20 hover:border-lime-500/60"
          >
            <IconTestPipe className="size-4" />
            <span>Xem mã {firstFileWithIssue}</span>
          </button>
        </div>

        <svg
          ref={svgRef}
          className="h-full w-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <defs>
            {/* Arrow marker for calls */}
            <marker id="arrow-cyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#22d3ee" />
            </marker>
            <marker id="arrow-purple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#c084fc" />
            </marker>
          </defs>

          {/* Render File Containers */}
          {fileContainers.map((fc) => (
            <g key={fc.name}>
              <rect
                x={fc.x}
                y={fc.y}
                width={fc.width}
                height={fc.height}
                rx={10}
                className="fill-[#0c1626]/80 stroke-border/70"
                strokeWidth={1}
              />
              <rect x={fc.x + 8} y={fc.y + 10} width={2.5} height={12} rx={1} className={fc.hasIssue ? 'fill-rose-500' : 'fill-amber-400'} />
              <text x={fc.x + 15} y={fc.y + 20} className="fill-foreground font-mono text-[11px] font-semibold">
                {fc.name}
              </text>
              <text x={fc.x + 15} y={fc.y + 32} className="fill-muted-foreground font-mono text-[9px]">
                {fc.lang}
              </text>
            </g>
          ))}

          {/* Render Dynamic Edges */}
          {computedEdges.map((ce) => (
            <path
              key={ce.id}
              d={ce.d}
              fill="none"
              stroke={ce.isHttp ? '#c084fc' : ce.isSelected ? '#38bdf8' : '#22d3ee'}
              strokeWidth={ce.isSelected ? 2.5 : 1.5}
              strokeDasharray={ce.isCrossFile || ce.isHttp ? '4 3' : undefined}
              markerEnd={ce.isHttp ? 'url(#arrow-purple)' : 'url(#arrow-cyan)'}
              className="transition-all"
              opacity={!selectedNodeId || ce.isSelected ? 0.9 : 0.25}
            />
          ))}

          {/* Render Function Nodes */}
          {nodes.map((node) => {
            const pos = nodePositions[node.id] || { x: 100, y: 100, width: 192, height: 44 }
            const isSelected = node.id === selectedNodeId
            const isMatched = matchedNodeIds.has(node.id)
            const caller = isCaller(node.functionName)
            const callee = isCallee(node.functionName)
            const related = isRelated(node)

            if (node.isExternal) {
              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  onClick={() => onSelectNode(node.id)}
                >
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={pos.width}
                    height={pos.height}
                    rx={6}
                    className="fill-[#130f26]/90 stroke-purple-500/80"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                  <text
                    x={pos.x + pos.width / 2}
                    y={pos.y + 17}
                    textAnchor="middle"
                    className="fill-purple-300 font-mono text-[11px] font-semibold"
                  >
                    {node.functionName}
                  </text>
                  <text
                    x={pos.x + pos.width / 2}
                    y={pos.y + 29}
                    textAnchor="middle"
                    className="fill-purple-400/70 font-mono text-[9px]"
                  >
                    bên ngoài · suy đoán
                  </text>
                </g>
              )
            }

            return (
              <g
                key={node.id}
                className="cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={() => onSelectNode(node.id)}
              >
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={pos.width}
                  height={pos.height}
                  rx={6}
                  className={`transition-all ${
                    isSelected
                      ? 'fill-[#132238] stroke-cyan-400 stroke-[2.5px] shadow-[0_0_16px_rgba(34,211,238,0.5)]'
                      : caller
                      ? 'fill-[#1c1a2e] stroke-amber-400 stroke-[2px]'
                      : callee
                      ? 'fill-[#102422] stroke-emerald-400 stroke-[2px]'
                      : node.hasIssue
                      ? 'fill-[#121c2e] stroke-rose-500/80 stroke-[1.5px]'
                      : isMatched
                      ? 'fill-[#0f192b] stroke-border hover:stroke-cyan-500/50'
                      : 'fill-[#0f192b]/40 stroke-border/30 opacity-40'
                  } ${!related ? 'opacity-35' : 'opacity-100'}`}
                />

                {/* Left vertical indicator */}
                <rect
                  x={pos.x + 4}
                  y={pos.y + 7}
                  width={2}
                  height={pos.height - 14}
                  rx={1}
                  className={node.hasIssue ? 'fill-rose-500' : 'fill-amber-400'}
                />

                {/* Function Name */}
                <text
                  x={pos.x + 12}
                  y={pos.y + 18}
                  className={`font-mono text-[11px] font-semibold ${
                    node.hasIssue ? 'fill-rose-200' : 'fill-foreground'
                  }`}
                >
                  {node.functionName.length > 20 ? node.functionName.slice(0, 18) + '…' : node.functionName}
                </text>

                {/* Function badge "fn" */}
                <text
                  x={pos.x + pos.width - 16}
                  y={pos.y + 16}
                  className="fill-muted-foreground font-mono text-[9px]"
                >
                  fn
                </text>

                {/* Line range */}
                <text
                  x={pos.x + 12}
                  y={pos.y + 31}
                  className="fill-muted-foreground font-mono text-[9px]"
                >
                  {node.startLine ? `dòng ${node.startLine}-${node.endLine}` : ''}
                </text>

                {/* Pink Issue dot indicator if issue present */}
                {node.hasIssue && (
                  <circle
                    cx={pos.x + pos.width - 7}
                    cy={pos.y + 7}
                    r={3.5}
                    className="fill-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                  />
                )}
              </g>
            )
          })}
        </svg>

        {/* Minimap preview in bottom-right */}
        <div className="absolute bottom-4 right-4 z-20 h-16 w-32 rounded-lg border border-border/50 bg-[#0d1624]/90 p-1.5 shadow-3d-2 backdrop-blur-md">
          <div className="flex h-full w-full items-center justify-around gap-1 rounded bg-[#070c14]/80 p-1 overflow-hidden">
            {fileContainers.slice(0, 5).map((fc) => (
              <span
                key={fc.name}
                className={`h-6 flex-1 rounded-xs border transition-colors ${
                  fc.hasIssue
                    ? 'border-rose-500/60 bg-rose-500/25'
                    : 'border-cyan-500/50 bg-cyan-500/20'
                }`}
                title={fc.name}
              />
            ))}
          </div>
        </div>

        {/* Bottom hint bar */}
        <div className="absolute bottom-2 left-4 z-20 text-[10px] font-mono text-muted-foreground/70">
          kéo nền · cuộn zoom · bấm hàm để focus & xem ảnh hưởng · chuột phải để mở menu
        </div>
      </div>
    </div>
  )
}
