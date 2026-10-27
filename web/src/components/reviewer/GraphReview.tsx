import { useState, useRef, useMemo } from 'react'
import {
  IconArrowBackUp,
  IconArrowsMaximize,
  IconBuildingSkyscraper,
  IconDownload,
  IconFileCode,
  IconFocus2,
  IconInfoCircle,
  IconMinus,
  IconPlus,
  IconSearch,
  IconTestPipe,
  IconX,
  IconAlertCircle,
  IconCheck,
  IconRefresh,
} from '@tabler/icons-react'
import type { GraphNode, GraphEdge, Finding } from '@/lib/reviewTypes'

interface GraphReviewProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  findings?: Finding[]
  projectName?: string
  projectRoot?: string
  revision?: string
  isOutdated?: boolean
  selectedNodeId?: string
  onSelectNode: (nodeId: string) => void
  onAnalyzeFile?: (file: string) => void
  onReReview?: () => void
}

export function GraphReview({
  nodes,
  edges,
  findings = [],
  projectName = 'Dự án',
  projectRoot = '',
  revision = '1',
  isOutdated = false,
  selectedNodeId,
  onSelectNode,
  onAnalyzeFile,
  onReReview,
}: GraphReviewProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 40, y: 30 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterIssueOnly, setFilterIssueOnly] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [showNodeDetails, setShowNodeDetails] = useState(true)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const activeNodeId = hoveredNodeId || selectedNodeId
  const activeNode = nodes.find((n) => n.id === activeNodeId)
  const callerNames = new Set(
    (activeNode?.calledBy || []).map((c: any) => (typeof c === 'string' ? c : c))
  )
  const calleeNames = new Set(
    (activeNode?.calls || []).map((c: any) => (typeof c === 'string' ? c : c.functionName))
  )

  const isCaller = (fnName: string) => callerNames.has(fnName)
  const isCallee = (fnName: string) => calleeNames.has(fnName)
  const isRelated = (n: any) => {
    if (!activeNodeId) return true
    if (n.id === activeNodeId) return true
    return isCaller(n.functionName) || isCallee(n.functionName)
  }

  // Findings matching the selected node
  const selectedNodeFindings = useMemo(() => {
    if (!selectedNode) return []
    return findings.filter(
      (f) =>
        f.id === selectedNode.id ||
        (f.file === selectedNode.file &&
          f.line >= selectedNode.startLine &&
          f.line <= selectedNode.endLine)
    )
  }, [selectedNode, findings])

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

  // 2. Compute dynamic tree layout: Project Root -> File Containers -> Function Nodes
  const { projectNode, fileContainers, nodePositions, firstFileWithIssue, canvasBounds } = useMemo(() => {
    const containers: Array<{
      name: string
      lang: string
      x: number
      y: number
      width: number
      height: number
      hasIssue: boolean
      issueCount: number
      highestSeverity: 'critical' | 'high' | 'medium' | 'low' | 'clean'
      nodesCount: number
    }> = []
    const positions: Record<string, { x: number; y: number; width: number; height: number; file: string }> = {}

    const containerWidth = 240
    const containerSpacing = 60
    const startX = 60
    const startY = 160
    const nodeHeight = 50
    const nodeGap = 12
    const headerHeight = 56
    const bottomPadding = 18

    let fileIdx = 0
    let firstIssueFile: string | null = null
    let maxBottomY = startY

    for (const [fileName, fileNodes] of fileGroups.entries()) {
      const count = fileNodes.length
      const containerHeight = Math.max(140, headerHeight + count * (nodeHeight + nodeGap) - nodeGap + bottomPadding)
      const containerX = startX + fileIdx * (containerWidth + containerSpacing)
      const containerY = startY

      const fileFindings = findings.filter((f) => f.file === fileName)
      const hasFileIssue = fileNodes.some((n) => n.hasIssue) || fileFindings.length > 0
      if (hasFileIssue && !firstIssueFile) {
        firstIssueFile = fileName
      }

      const issueCount = fileFindings.length || fileNodes.reduce((acc, n) => acc + (n.issueCount || 0), 0)
      let highestSeverity: 'critical' | 'high' | 'medium' | 'low' | 'clean' = 'clean'
      if (fileFindings.some((f) => f.severity === 'critical')) highestSeverity = 'critical'
      else if (fileFindings.some((f) => f.severity === 'high')) highestSeverity = 'high'
      else if (fileFindings.some((f) => f.severity === 'medium')) highestSeverity = 'medium'
      else if (fileFindings.some((f) => f.severity === 'low')) highestSeverity = 'low'
      else if (hasFileIssue) highestSeverity = 'high'

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
        issueCount,
        highestSeverity,
        nodesCount: count,
      })

      // Position each node inside container (Tree Level 3: Hàm)
      fileNodes.forEach((node, nodeIdx) => {
        const nx = containerX + 24
        const ny = containerY + headerHeight + nodeIdx * (nodeHeight + nodeGap)
        const nw = containerWidth - 36
        const nh = nodeHeight

        const pos = { x: nx, y: ny, width: nw, height: nh, file: fileName }
        positions[node.id] = pos
        if (!positions[node.functionName]) {
          positions[node.functionName] = pos
        }
      })

      if (containerY + containerHeight > maxBottomY) {
        maxBottomY = containerY + containerHeight
      }

      fileIdx++
    }

    const totalFilesWidth = Math.max(1, fileIdx) * (containerWidth + containerSpacing) - containerSpacing
    const projectWidth = 380
    const projectHeight = 76
    const projectX = Math.max(startX, startX + (totalFilesWidth - projectWidth) / 2)
    const projectY = 30

    const critCount = findings.filter((f) => f.severity === 'critical').length
    const highCount = findings.filter((f) => f.severity === 'high').length
    const medCount = findings.filter((f) => f.severity === 'medium').length

    return {
      projectNode: {
        x: projectX,
        y: projectY,
        width: projectWidth,
        height: projectHeight,
        name: projectName,
        root: projectRoot,
        revision,
        filesCount: fileGroups.size,
        nodesCount: nodes.length,
        issuesCount: findings.length,
        critCount,
        highCount,
        medCount,
      },
      fileContainers: containers,
      nodePositions: positions,
      firstFileWithIssue: firstIssueFile || (containers[0]?.name ?? 'project'),
      canvasBounds: {
        width: Math.max(projectX + projectWidth + 100, startX + totalFilesWidth + 100),
        height: maxBottomY + 100,
      },
    }
  }, [fileGroups, nodes, findings, projectName, projectRoot, revision])

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

  // 3. Compute dynamic bezier curve call edges
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
          edge.sourceNodeId === activeNodeId ||
          edge.targetNodeId === activeNodeId ||
          src.file === activeNode?.file ||
          tgt.file === activeNode?.file

        if (isSameFile) {
          x1 = src.x + src.width
          y1 = src.y + src.height / 2
          x2 = tgt.x + tgt.width
          y2 = tgt.y + tgt.height / 2
          const arc = Math.abs(y2 - y1) * 0.4 + 28
          cx1 = x1 + arc
          cy1 = y1
          cx2 = x2 + arc
          cy2 = y2
        } else if (src.x + src.width <= tgt.x) {
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
  }, [edges, nodePositions, selectedNodeId])

  // Download Standalone SVG Diagram
  const handleDownloadSvg = () => {
    if (!svgRef.current) return
    const svgEl = svgRef.current.cloneNode(true) as SVGSVGElement

    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    svgEl.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
    svgEl.removeAttribute('style')

    // Add dark background rect for standalone SVG viewer
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bgRect.setAttribute('x', '0')
    bgRect.setAttribute('y', '0')
    bgRect.setAttribute('width', String(canvasBounds.width + 100))
    bgRect.setAttribute('height', String(canvasBounds.height + 100))
    bgRect.setAttribute('fill', '#070c14')
    svgEl.insertBefore(bgRect, svgEl.firstChild)

    svgEl.setAttribute('viewBox', `0 0 ${canvasBounds.width + 100} ${canvasBounds.height + 100}`)
    svgEl.setAttribute('width', String(canvasBounds.width + 100))
    svgEl.setAttribute('height', String(canvasBounds.height + 100))

    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    styleEl.textContent = `
      text { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    `
    svgEl.insertBefore(styleEl, svgEl.firstChild)

    const serializer = new XMLSerializer()
    let source = serializer.serializeToString(svgEl)
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"')
    }
    const svgBlob = new Blob(['<?xml version="1.0" standalone="no"?>\r\n' + source], {
      type: 'image/svg+xml;charset=utf-8',
    })
    const url = URL.createObjectURL(svgBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(projectName || 'code-review').replace(/[^\w-]/g, '_')}-tree-graph.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Calculate highest severity badge on function node
  const getNodeSeverityBadge = (node: GraphNode) => {
    const nodeFindings = findings.filter(
      (f) =>
        f.id === node.id ||
        (f.file === node.file && f.line >= node.startLine && f.line <= node.endLine)
    )
    if (nodeFindings.length === 0) {
      return { label: 'SẠCH', color: '#10b981', bg: '#064e3b', border: '#059669', count: 0 }
    }
    if (nodeFindings.some((f) => f.severity === 'critical')) {
      return { label: 'CRIT', color: '#f43f5e', bg: '#881337', border: '#e11d48', count: nodeFindings.length }
    }
    if (nodeFindings.some((f) => f.severity === 'high')) {
      return { label: 'HIGH', color: '#fb923c', bg: '#7c2d12', border: '#ea580c', count: nodeFindings.length }
    }
    if (nodeFindings.some((f) => f.severity === 'medium')) {
      return { label: 'MED', color: '#facc15', bg: '#713f12', border: '#ca8a04', count: nodeFindings.length }
    }
    return { label: 'LOW', color: '#60a5fa', bg: '#1e3a8a', border: '#2563eb', count: nodeFindings.length }
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#070c14] select-none">
      {/* Top Bar inside canvas */}
      <div className="z-10 flex h-11 shrink-0 items-center justify-between border-b border-border/40 bg-[#070c14]/90 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <IconFocus2 className="size-4 text-primary" stroke={2} />
            <span>Sơ đồ cây AST & Quan hệ Gọi (SVG Tree)</span>
          </div>
          <span className="text-xs text-muted-foreground">
            · {projectNode.filesCount} tệp · {nodes.length} hàm · {edges.length} quan hệ gọi · {findings.length} lỗi
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
            {filterIssueOnly ? 'Đang lọc: Chỉ hàm có lỗi' : 'Tất cả hàm'}
          </button>

          {/* Search bar */}
          <div className="relative flex items-center">
            <IconSearch className="absolute left-2.5 size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm hàm... (Enter)"
              className="h-7 w-44 rounded-md border border-border/60 bg-muted/40 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Download SVG Button */}
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 shadow-3d-1 transition-all hover:bg-cyan-500/20 hover:border-cyan-500/60"
            title="Tải xuống sơ đồ cây dạng tệp SVG độc lập"
          >
            <IconDownload className="size-3.5" />
            <span>Tải SVG</span>
          </button>

          {/* Legend toggle */}
          <button
            type="button"
            onClick={() => setShowLegend((l) => !l)}
            className={`rounded-md p-1 border text-xs transition-colors ${
              showLegend
                ? 'border-primary/50 bg-primary/20 text-primary'
                : 'border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground'
            }`}
            title="Bật/Tắt Bảng giải thích màu sắc/ký hiệu"
          >
            <IconInfoCircle className="size-4" />
          </button>

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
              onClick={() => setZoom(1.05)}
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

        {/* Legend Box (Bảng giải thích màu sắc/ký hiệu) */}
        {showLegend && (
          <div className="absolute left-4 top-4 z-20 max-w-xs rounded-xl border border-border/60 bg-[#0d1624]/95 p-3 text-[11px] shadow-3d-3 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-border/40 pb-1.5 mb-2">
              <span className="font-bold text-foreground">Bảng Giải Thích Ký Hiệu & Màu</span>
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <IconX className="size-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-2 font-mono text-muted-foreground">
              <div>
                <div className="text-[10px] font-bold uppercase text-foreground/80 mb-1">
                  1. Phân cấp sơ đồ cây:
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-cyan-400 font-bold">🏢 Dự án</span>
                  <span>→</span>
                  <span className="text-amber-400 font-bold">📁 Tệp</span>
                  <span>→</span>
                  <span className="text-emerald-400 font-bold">⚡ Hàm</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase text-foreground/80 mb-1">
                  2. Quan hệ gọi hàm:
                </div>
                <div className="flex flex-col gap-1 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="h-0.5 w-5 bg-cyan-400" />
                    <span>Gọi nội bộ cùng tệp</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-0.5 w-5 border-t-2 border-dashed border-sky-400" />
                    <span>Gọi chéo tệp (Cross-file)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-0.5 w-5 border-t-2 border-dashed border-purple-400" />
                    <span>Gọi HTTP / Bên ngoài</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase text-foreground/80 mb-1">
                  3. Mức độ lỗi:
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                    <span>Critical</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-orange-500" />
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-yellow-500" />
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span>Sạch (0 lỗi)</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/30 pt-1 text-[9px] text-muted-foreground/70">
                💡 Nhấp vào node bất kỳ để xem chi tiết lỗi và nguyên nhân.
              </div>
            </div>
          </div>
        )}

        {/* Selected Node Details Floating Card (Xem lỗi và nguyên nhân) */}
        {selectedNode && showNodeDetails && (
          <div className="absolute right-4 bottom-4 z-20 w-96 rounded-xl border border-cyan-500/40 bg-[#0d1624]/95 p-3.5 shadow-3d-3 backdrop-blur-md font-sans">
            <div className="flex items-start justify-between border-b border-border/40 pb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    {selectedNode.functionName}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
                    {selectedNode.file}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Vị trí: dòng {selectedNode.startLine} - {selectedNode.endLine}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNodeDetails(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <IconX className="size-4" />
              </button>
            </div>

            {/* List of issues and root cause */}
            <div className="mt-2.5 max-h-56 overflow-y-auto space-y-2.5 pr-1">
              {selectedNodeFindings.length > 0 ? (
                selectedNodeFindings.map((f, idx) => (
                  <div
                    key={f.id || idx}
                    className="rounded-lg border border-border/50 bg-[#070c14]/80 p-2 text-xs space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase font-mono ${
                          f.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : f.severity === 'high'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                        }`}
                      >
                        {f.severity}
                      </span>
                      <span className="font-semibold text-foreground text-[11px] truncate">
                        {f.title}
                      </span>
                    </div>

                    <div className="text-[10px] text-muted-foreground leading-relaxed">
                      <strong className="text-foreground/90">Nguyên nhân: </strong>
                      <span>{f.rootCause || f.description}</span>
                    </div>

                    {f.evidence && (
                      <div className="rounded bg-rose-950/30 border border-rose-500/20 p-1 font-mono text-[9px] text-rose-300 overflow-x-auto">
                        <code>{f.evidence}</code>
                      </div>
                    )}

                    {f.suggestedFix && (
                      <div className="text-[10px] text-emerald-400 leading-relaxed">
                        <strong>Đề xuất: </strong>
                        <span>{f.suggestedFix}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2 text-xs text-emerald-400">
                  <IconCheck className="size-4 shrink-0" />
                  <span>Hàm này sạch, không phát hiện lỗ hổng hay vi phạm quy tắc.</span>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[10px]">
              <span className="text-muted-foreground">
                {selectedNodeFindings.length} vấn đề được gắn vào hàm
              </span>
              <button
                type="button"
                onClick={() => onAnalyzeFile?.(selectedNode.file)}
                className="flex items-center gap-1 text-cyan-400 hover:underline font-semibold"
              >
                <span>Mở mã nguồn ({selectedNode.file})</span>
              </button>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          className="h-full w-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <defs>
            {/* Arrow markers for call edges */}
            <marker id="arrow-cyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#22d3ee" />
            </marker>
            <marker id="arrow-purple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#c084fc" />
            </marker>
            <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />
            </marker>
            <marker id="arrow-emerald" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#10b981" />
            </marker>
          </defs>

          {/* ========================================================= */}
          {/* 1. TREE HIERARCHY LEVEL 1: DỰ ÁN (PROJECT ROOT NODE)     */}
          {/* ========================================================= */}
          <g>
            <rect
              x={projectNode.x}
              y={projectNode.y}
              width={projectNode.width}
              height={projectNode.height}
              rx={12}
              className="fill-[#0c1626] stroke-primary/70"
              strokeWidth={2}
            />
            {/* Project Header badge */}
            <rect
              x={projectNode.x + 12}
              y={projectNode.y + 12}
              width={26}
              height={26}
              rx={6}
              className="fill-primary/20 stroke-primary/40"
              strokeWidth={1}
            />
            <text
              x={projectNode.x + 25}
              y={projectNode.y + 29}
              textAnchor="middle"
              className="fill-primary font-bold text-sm"
            >
              🏢
            </text>

            {/* Project Name */}
            <text
              x={projectNode.x + 46}
              y={projectNode.y + 27}
              className="fill-foreground font-bold text-[13px]"
            >
              Dự án: {projectNode.name}
            </text>

            {/* Revision & Status */}
            <text
              x={projectNode.x + 46}
              y={projectNode.y + 42}
              className="fill-muted-foreground font-mono text-[10px]"
            >
              Phiên bản: {projectNode.revision} · {projectNode.filesCount} tệp · {projectNode.nodesCount} hàm
            </text>

            {/* Project Root path */}
            <text
              x={projectNode.x + 14}
              y={projectNode.y + 60}
              className="fill-cyan-400 font-mono text-[9px]"
            >
              📂 {projectNode.root.length > 55 ? '…' + projectNode.root.slice(-52) : projectNode.root}
            </text>

            {/* Issues severity summary tag on project node */}
            <g transform={`translate(${projectNode.x + projectNode.width - 110}, ${projectNode.y + 14})`}>
              <rect
                x={0}
                y={0}
                width={98}
                height={22}
                rx={6}
                className={projectNode.issuesCount > 0 ? 'fill-rose-950/80 stroke-rose-500/50' : 'fill-emerald-950/80 stroke-emerald-500/50'}
                strokeWidth={1}
              />
              <text
                x={49}
                y={15}
                textAnchor="middle"
                className={`font-mono text-[10px] font-bold ${projectNode.issuesCount > 0 ? 'fill-rose-300' : 'fill-emerald-300'}`}
              >
                {projectNode.issuesCount > 0 ? `${projectNode.issuesCount} vấn đề` : '✓ Sạch (0 lỗi)'}
              </text>
            </g>
          </g>

          {/* ========================================================= */}
          {/* 2. TREE BRANCHES: DỰ ÁN → FILE (HIERARCHY LINES)          */}
          {/* ========================================================= */}
          {fileContainers.map((fc) => {
            const px = projectNode.x + projectNode.width / 2
            const py = projectNode.y + projectNode.height
            const fx = fc.x + fc.width / 2
            const fy = fc.y
            const treeBranchD = `M ${px} ${py} C ${px} ${py + 35}, ${fx} ${fy - 35}, ${fx} ${fy}`
            return (
              <path
                key={`tree-branch-proj-${fc.name}`}
                d={treeBranchD}
                fill="none"
                stroke="#334155"
                strokeWidth={1.5}
                className="opacity-70"
              />
            )
          })}

          {/* ========================================================= */}
          {/* 3. TREE HIERARCHY LEVEL 2: TỆP (FILE CONTAINERS)          */}
          {/* ========================================================= */}
          {fileContainers.map((fc) => (
            <g key={fc.name}>
              {/* File Container Background */}
              <rect
                x={fc.x}
                y={fc.y}
                width={fc.width}
                height={fc.height}
                rx={10}
                className="fill-[#0c1626]/85 stroke-border/70"
                strokeWidth={1}
              />

              {/* Severity side indicator */}
              <rect
                x={fc.x + 8}
                y={fc.y + 12}
                width={3}
                height={16}
                rx={1.5}
                className={fc.hasIssue ? 'fill-rose-500' : 'fill-emerald-400'}
              />

              {/* File Name */}
              <text x={fc.x + 18} y={fc.y + 23} className="fill-foreground font-mono text-[11px] font-bold">
                📁 {fc.name}
              </text>
              {/* File Info */}
              <text x={fc.x + 18} y={fc.y + 37} className="fill-muted-foreground font-mono text-[9px]">
                {fc.lang}
              </text>

              {/* File Issue Badge */}
              <g transform={`translate(${fc.x + fc.width - 70}, ${fc.y + 10})`}>
                <rect
                  x={0}
                  y={0}
                  width={62}
                  height={18}
                  rx={4}
                  className={fc.hasIssue ? 'fill-rose-950/60 stroke-rose-500/40' : 'fill-emerald-950/60 stroke-emerald-500/40'}
                  strokeWidth={1}
                />
                <text
                  x={31}
                  y={12}
                  textAnchor="middle"
                  className={`font-mono text-[9px] font-semibold ${fc.hasIssue ? 'fill-rose-300' : 'fill-emerald-300'}`}
                >
                  {fc.hasIssue ? `${fc.issueCount} lỗi` : '0 lỗi'}
                </text>
              </g>

              {/* Tree vertical line inside file container */}
              <line
                x1={fc.x + 14}
                y1={fc.y + 50}
                x2={fc.x + 14}
                y2={fc.y + fc.height - 18}
                stroke="#1e293b"
                strokeWidth={1.5}
                strokeDasharray="2 2"
              />
            </g>
          ))}

          {/* ========================================================= */}
          {/* 4. TREE HIERARCHY LEVEL 3: HÀM (FUNCTION NODES)           */}
          {/* ========================================================= */}
          {nodes.map((node) => {
            const pos = nodePositions[node.id] || { x: 100, y: 100, width: 204, height: 50, file: 'file' }
            const isSelected = node.id === selectedNodeId
            const isMatched = matchedNodeIds.has(node.id)
            const caller = isCaller(node.functionName)
            const callee = isCallee(node.functionName)
            const related = isRelated(node)
            const sev = getNodeSeverityBadge(node)

            return (
              <g
                key={node.id}
                className="cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={() => {
                  onSelectNode(node.id)
                  setShowNodeDetails(true)
                }}
              >
                {/* Tree horizontal branch from file container guide line to function card */}
                <line
                  x1={pos.x - 10}
                  y1={pos.y + pos.height / 2}
                  x2={pos.x}
                  y2={pos.y + pos.height / 2}
                  stroke="#334155"
                  strokeWidth={1.5}
                />

                {/* Node Card Rectangle */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={pos.width}
                  height={pos.height}
                  rx={7}
                  className={`transition-all ${
                    isSelected
                      ? 'fill-[#132238] stroke-cyan-400 stroke-[2.5px] shadow-[0_0_16px_rgba(34,211,238,0.5)]'
                      : caller
                      ? 'fill-[#1c1a2e] stroke-amber-400 stroke-[2px]'
                      : callee
                      ? 'fill-[#102422] stroke-emerald-400 stroke-[2px]'
                      : node.hasIssue
                      ? 'fill-[#141b2b] stroke-rose-500/80 stroke-[1.5px]'
                      : isMatched
                      ? 'fill-[#0f192b] stroke-border hover:stroke-cyan-500/50'
                      : 'fill-[#0f192b]/40 stroke-border/30 opacity-40'
                  } ${!related ? 'opacity-35' : 'opacity-100'}`}
                />

                {/* Left vertical status indicator */}
                <rect
                  x={pos.x + 5}
                  y={pos.y + 7}
                  width={3}
                  height={pos.height - 14}
                  rx={1.5}
                  fill={sev.color}
                />

                {/* Function Name */}
                <text
                  x={pos.x + 14}
                  y={pos.y + 19}
                  className={`font-mono text-[11px] font-bold ${
                    node.hasIssue ? 'fill-rose-200' : 'fill-foreground'
                  }`}
                >
                  ⚡ {node.functionName.length > 17 ? node.functionName.slice(0, 15) + '…' : node.functionName}
                </text>

                {/* Function Line Range */}
                <text
                  x={pos.x + 14}
                  y={pos.y + 35}
                  className="fill-muted-foreground font-mono text-[9px]"
                >
                  {node.startLine ? `dòng ${node.startLine}-${node.endLine}` : 'toàn hàm'}
                </text>

                {/* Severity Badge in top-right of node */}
                <g transform={`translate(${pos.x + pos.width - 52}, ${pos.y + 7})`}>
                  <rect
                    x={0}
                    y={0}
                    width={46}
                    height={16}
                    rx={3}
                    fill={sev.bg}
                    stroke={sev.border}
                    strokeWidth={1}
                  />
                  <text
                    x={23}
                    y={11}
                    textAnchor="middle"
                    fill={sev.color}
                    className="font-mono text-[8px] font-bold"
                  >
                    {sev.count > 0 ? `${sev.label} (${sev.count})` : sev.label}
                  </text>
                </g>

                {/* Interaction indicator if caller or callee */}
                {caller && (
                  <text
                    x={pos.x + pos.width - 48}
                    y={pos.y + 40}
                    className="fill-amber-400 font-mono text-[8px] font-bold"
                  >
                    ▲ CALLER
                  </text>
                )}
                {callee && (
                  <text
                    x={pos.x + pos.width - 46}
                    y={pos.y + 40}
                    className="fill-emerald-400 font-mono text-[8px] font-bold"
                  >
                    ▼ CALLEE
                  </text>
                )}
              </g>
            )
          })}

          {/* ========================================================= */}
          {/* 5. AST CALL GRAPH EDGES (QUAN HỆ GỌI HÀM RIÊNG BIỆT)      */}
          {/* ========================================================= */}
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
              opacity={!activeNodeId || ce.isSelected ? 0.9 : 0.25}
            />
          ))}
        </svg>

        {/* Minimap preview in bottom-right */}
        <div className="absolute bottom-4 right-4 z-20 h-16 w-36 rounded-lg border border-border/50 bg-[#0d1624]/90 p-1.5 shadow-3d-2 backdrop-blur-md">
          <div className="flex h-full w-full items-center justify-around gap-1 rounded bg-[#070c14]/80 p-1 overflow-hidden">
            {fileContainers.slice(0, 6).map((fc) => (
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
          kéo canvas để di chuyển · cuộn chuột để zoom · nhấp node để xem lỗi & nguyên nhân · bấm &quot;Tải SVG&quot; để lưu sơ đồ
        </div>
      </div>
    </div>
  )
}
