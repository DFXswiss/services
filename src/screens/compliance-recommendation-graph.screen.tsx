import { ApiError } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  Position,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { RecommendationGraph, RecommendationGraphNode, useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

function UserNode({ data }: { data: RecommendationGraphNode & { isRoot: boolean; childCount: number } }) {
  const navigate = useNavigate();
  const name = [data.firstname, data.surname].filter(Boolean).join(' ') || '-';
  const hasApproval = !!data.tradeApprovalDate;

  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-md border-2 cursor-pointer min-w-[180px] ${
        data.isRoot
          ? 'border-dfxBlue-800 bg-blue-50'
          : hasApproval
            ? 'border-green-500 bg-green-50'
            : 'border-dfxGray-300 bg-white'
      }`}
      onClick={() => navigate(`/compliance/user/${data.id}`)}
    >
      <Handle type="target" position={Position.Top} className="!bg-dfxGray-700" />
      <div className="text-xs text-dfxGray-700">#{data.id}</div>
      <div className="text-sm font-semibold text-dfxBlue-800">{name}</div>
      <div className="flex gap-2 mt-1">
        {data.kycStatus && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-dfxGray-300 text-dfxBlue-800">{data.kycStatus}</span>
        )}
        {data.kycLevel != null && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-dfxGray-300 text-dfxBlue-800">L{data.kycLevel}</span>
        )}
      </div>
      {data.childCount > 0 && (
        <div className="text-xs text-dfxGray-700 mt-1">{data.childCount} recommendations</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-dfxGray-700" />
    </div>
  );
}

const nodeTypes = { user: UserNode };

function layoutGraph(graph: RecommendationGraph): { nodes: Node[]; edges: Edge[] } {
  // Build adjacency: recommender -> recommended[]
  const children = new Map<number, number[]>();
  const parents = new Map<number, number[]>();

  for (const edge of graph.edges) {
    if (!children.has(edge.recommenderId)) children.set(edge.recommenderId, []);
    children.get(edge.recommenderId)!.push(edge.recommendedId);
    if (!parents.has(edge.recommendedId)) parents.set(edge.recommendedId, []);
    parents.get(edge.recommendedId)!.push(edge.recommenderId);
  }

  // Find root nodes (no parent) or use the provided rootId's top ancestor
  const findRoot = (id: number, visited = new Set<number>()): number => {
    visited.add(id);
    const parentList = parents.get(id) || [];
    for (const p of parentList) {
      if (!visited.has(p)) return findRoot(p, visited);
    }
    return id;
  };

  const topRoot = findRoot(graph.rootId);

  // BFS to assign levels and positions
  const levels = new Map<number, number>();
  const queue: number[] = [topRoot];
  levels.set(topRoot, 0);
  const ordered: number[] = [];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    ordered.push(current);
    const childList = children.get(current) || [];
    for (const child of childList) {
      if (!levels.has(child)) {
        levels.set(child, (levels.get(current) || 0) + 1);
        queue.push(child);
      }
    }
  }

  // Add any nodes not reached by BFS (disconnected)
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
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level)!.push(id);
  }

  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 120;
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  const nodes: Node[] = [];
  for (const [level, ids] of byLevel.entries()) {
    const totalWidth = ids.length * NODE_WIDTH;
    const startX = -totalWidth / 2;

    ids.forEach((id, index) => {
      const nodeData = nodeMap.get(id);
      if (!nodeData) return;
      nodes.push({
        id: String(id),
        type: 'user',
        position: { x: startX + index * NODE_WIDTH, y: level * NODE_HEIGHT },
        data: {
          ...nodeData,
          isRoot: id === graph.rootId,
          childCount: (children.get(id) || []).length,
        },
      });
    });
  }

  const edges: Edge[] = graph.edges.map((e) => ({
    id: `e-${e.id}`,
    source: String(e.recommenderId),
    target: String(e.recommendedId),
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: e.isConfirmed ? '#22c55e' : e.isConfirmed === false ? '#ef4444' : '#9ca3af' },
    label: e.method,
    labelStyle: { fontSize: 10, fill: '#6b7280' },
  }));

  return { nodes, edges };
}

export default function ComplianceRecommendationGraphScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const { id: userDataId } = useParams();
  const { getRecommendationGraph } = useCompliance();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [graph, setGraph] = useState<RecommendationGraph>();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useLayoutOptions({
    title: translate('screens/compliance', 'Recommendation Network'),
    backButton: true,
    noMaxWidth: true,
  });

  useEffect(() => {
    let cancelled = false;
    if (userDataId) {
      setIsLoading(true);
      getRecommendationGraph(+userDataId)
        .then((data) => {
          if (cancelled) return;
          setGraph(data);
          const layout = layoutGraph(data);
          setNodes(layout.nodes);
          setEdges(layout.edges);
        })
        .catch((e: ApiError) => !cancelled && setError(e.message ?? 'Unknown error'))
        .finally(() => !cancelled && setIsLoading(false));
    }
    return () => { cancelled = true; };
  }, [userDataId]);

  const memoNodeTypes = useMemo(() => nodeTypes, []);

  if (error) return <ErrorHint message={error} />;
  if (isLoading) return <StyledLoadingSpinner size={SpinnerSize.LG} />;

  return (
    <div className="w-full" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Stats bar */}
      <div className="flex gap-4 px-4 py-2 bg-white border-b border-dfxGray-300 text-sm text-dfxBlue-800">
        <span>Nodes: {graph?.nodes.length || 0}</span>
        <span>Edges: {graph?.edges.length || 0}</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border-2 border-dfxBlue-800 bg-blue-50 inline-block" /> Current user
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border-2 border-green-500 bg-green-50 inline-block" /> Trade approved
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border-2 border-dfxGray-300 bg-white inline-block" /> No approval
        </span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={memoNodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(n) => (n.data?.isRoot ? '#1e40af' : n.data?.tradeApprovalDate ? '#22c55e' : '#d1d5db')}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}
