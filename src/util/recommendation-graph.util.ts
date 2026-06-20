import { Edge, MarkerType, Node } from 'reactflow';
import {
  RecommendationGraph,
  RecommendationGraphEdge,
  RecommendationGraphEdgeKind,
  RecommendationGraphNode,
} from 'src/hooks/compliance.hook';

// react-flow node data: the stored node plus the render-time flags layoutGraph derives.
// Exported so the producer (layoutGraph) and consumer (UserNode) share the shape.
export type UserNodeData = RecommendationGraphNode & {
  isCenter: boolean;
  isExpandable: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  // already-translated in-canvas hint shown on expandable nodes (UserNode is module-scope and has no
  // translate hook, so the screen passes the translated label down via this field)
  expandLabel: string;
};

// react-flow edge id keyed by directed pair + kind.
// Synthetic ref-edge ids are negative & per-response, so the raw edge.id would collide on merge.
export function reactFlowEdgeId(
  edge: Pick<RecommendationGraphEdge, 'recommenderId' | 'recommendedId' | 'kind'>,
): string {
  return `e-${edge.recommenderId}-${edge.recommendedId}-${edge.kind}`;
}

// store key for the deduped edge store: keyed by directed pair only (kind-agnostic), so a
// recommendation can replace a previously stored used-ref edge for the same pair.
export function edgePairKey(edge: Pick<RecommendationGraphEdge, 'recommenderId' | 'recommendedId'>): string {
  return `${edge.recommenderId}-${edge.recommendedId}`;
}

export function layoutGraph(
  graph: RecommendationGraph,
  centerId: number,
  expandedIds: Set<number>,
  loadingIds: Set<number>,
  // already-translated in-canvas expand hint, passed down from the screen (which owns translate)
  expandLabel: string,
): { nodes: Node<UserNodeData>[]; edges: Edge[] } {
  // Build adjacency: recommender -> recommended[]
  const children = new Map<number, number[]>();
  const parents = new Map<number, number[]>();

  for (const edge of graph.edges) {
    const cList = children.get(edge.recommenderId) ?? [];
    cList.push(edge.recommendedId);
    children.set(edge.recommenderId, cList);
    const pList = parents.get(edge.recommendedId) ?? [];
    pList.push(edge.recommenderId);
    parents.set(edge.recommendedId, pList);
  }

  // Find the top ancestor of the center (fallback: the center itself when no parent is loaded)
  const findRoot = (id: number, visited = new Set<number>()): number => {
    visited.add(id);
    const parentList = parents.get(id) || [];
    for (const p of parentList) {
      if (!visited.has(p)) return findRoot(p, visited);
    }
    return id;
  };

  const topRoot = findRoot(centerId);

  // BFS to assign levels
  const levels = new Map<number, number>();
  const queue: number[] = [topRoot];
  levels.set(topRoot, 0);
  const ordered: number[] = [];

  while (queue.length > 0) {
    const current = queue.shift() as number;
    ordered.push(current);
    const childList = children.get(current) || [];
    for (const child of childList) {
      // the `!levels.has(child)` guard prevents a node from being enqueued (and so dequeued) twice
      if (!levels.has(child)) {
        levels.set(child, (levels.get(current) || 0) + 1);
        queue.push(child);
      }
    }
  }

  // Add any nodes not reached by BFS (disconnected / back-edges)
  for (const node of graph.nodes) {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0);
      ordered.push(node.id);
    }
  }

  // Group by level for x positioning
  const byLevel = new Map<number, number[]>();
  for (const id of ordered) {
    const level = levels.get(id) || 0;
    const lvl = byLevel.get(level) ?? [];
    lvl.push(id);
    byLevel.set(level, lvl);
  }

  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 120;
  // vertical pitch between BFS levels: a full empty level between rows so the hierarchy is readable
  const LEVEL_HEIGHT = NODE_HEIGHT * 2;
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  const nodes: Node<UserNodeData>[] = [];
  for (const [level, ids] of byLevel.entries()) {
    const totalWidth = ids.length * NODE_WIDTH;
    const startX = -totalWidth / 2;

    ids.forEach((id, index) => {
      const nodeData = nodeMap.get(id);
      if (!nodeData) return;
      nodes.push({
        id: String(id),
        type: 'user',
        position: { x: startX + index * NODE_WIDTH, y: level * LEVEL_HEIGHT },
        data: {
          ...nodeData,
          isCenter: id === centerId,
          isExpandable: !!nodeData.expandable,
          isExpanded: expandedIds.has(id),
          isLoading: loadingIds.has(id),
          expandLabel,
        },
      });
    });
  }

  const edges: Edge[] = graph.edges.map((e) => {
    const isRef = e.kind === RecommendationGraphEdgeKind.USED_REF;
    return {
      // key by directed pair + kind: synthetic ref-edge ids are negative & per-response, so e.id would collide on merge
      id: reactFlowEdgeId(e),
      source: String(e.recommenderId),
      target: String(e.recommendedId),
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: isRef,
      style: isRef
        ? { stroke: '#3b82f6', strokeDasharray: '6 4' }
        : { stroke: e.isConfirmed ? '#22c55e' : e.isConfirmed === false ? '#ef4444' : '#9ca3af' },
      label: isRef ? e.refCode : e.method,
      labelStyle: { fontSize: 10, fill: isRef ? '#3b82f6' : '#6b7280' },
    };
  });

  return { nodes, edges };
}

// Merge a freshly fetched fragment into the accumulating client store.
// Dedups nodes by id (keeping an already-set expandable flag, latest metadata otherwise)
// and edges by directed pair (a recommendation upgrades a previously stored used-ref edge,
// mirroring the server dedup).
export function mergeFragment(
  nodeStore: Map<number, RecommendationGraphNode>,
  edgeStore: Map<string, RecommendationGraphEdge>,
  fragment: RecommendationGraph,
): void {
  // intentional asymmetry: node metadata takes the latest fragment, but edges keep the first stored
  // recommendation - only a USED_REF edge is upgraded to a RECOMMENDATION on the same pair
  for (const node of fragment.nodes) {
    const existing = nodeStore.get(node.id);
    // keep an already-set expandable flag; take latest metadata otherwise
    nodeStore.set(node.id, { ...existing, ...node, expandable: !!(node.expandable || existing?.expandable) });
  }
  for (const edge of fragment.edges) {
    const key = edgePairKey(edge);
    const existing = edgeStore.get(key);
    // recommendation wins over ref-code on the same directed pair (mirrors the server dedup)
    const upgrade =
      existing?.kind === RecommendationGraphEdgeKind.USED_REF &&
      edge.kind === RecommendationGraphEdgeKind.RECOMMENDATION;
    if (!existing || upgrade) edgeStore.set(key, edge);
  }
}
