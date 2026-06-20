import { ApiError } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MiniMap,
  NodeMouseHandler,
  Position,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import {
  ComplianceUserData,
  RecommendationGraph,
  RecommendationGraphEdge,
  RecommendationGraphNode,
  useCompliance,
} from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { layoutGraph, mergeFragment } from 'src/util/recommendation-graph.util';

const NEIGHBOR_PAGE_SIZE = 25;

type UserNodeData = RecommendationGraphNode & {
  isCenter: boolean;
  isExpandable: boolean;
  isExpanded: boolean;
  isLoading: boolean;
};

function UserNode({ data }: { data: UserNodeData }): JSX.Element {
  const name = [data.firstname, data.surname].filter(Boolean).join(' ') || '-';
  const hasApproval = !!data.tradeApprovalDate;

  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-md border-2 cursor-pointer min-w-[180px] ${
        data.isCenter
          ? 'border-dfxBlue-800 bg-blue-50'
          : hasApproval
            ? 'border-green-500 bg-green-50'
            : 'border-dfxGray-300 bg-white'
      }`}
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
      {data.isLoading ? (
        <div className="mt-1">
          <StyledLoadingSpinner size={SpinnerSize.SM} />
        </div>
      ) : (
        data.isExpandable &&
        !data.isExpanded && <div className="mt-1 text-xs font-semibold text-dfxBlue-800">+ load connections</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-dfxGray-700" />
    </div>
  );
}

const nodeTypes = { user: UserNode };

export default function ComplianceRecommendationGraphScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const navigate = useNavigate();
  const { id } = useParams();
  const { getRecommendationGraphNeighbors, getUserData } = useCompliance();

  const centerId = id ? +id : undefined;

  // accumulating client graph store (deduped by node id and by directed edge pair)
  const nodeStore = useRef(new Map<number, RecommendationGraphNode>());
  const edgeStore = useRef(new Map<string, RecommendationGraphEdge>());
  const expandedIds = useRef(new Set<number>()); // nodes whose neighbors are fully loaded
  const loadedCount = useRef(new Map<number, number>()); // neighbors already loaded per node (pagination cursor)
  const hasMoreIds = useRef(new Set<number>()); // nodes with further neighbors to load

  const [version, setVersion] = useState(0); // bumped after store mutations to trigger a re-layout
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const [selectedId, setSelectedId] = useState<number>();
  const [detail, setDetail] = useState<ComplianceUserData>();
  const [detailLoading, setDetailLoading] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useLayoutOptions({
    title: translate('screens/compliance', 'Recommendation Network'),
    backButton: true,
    noMaxWidth: true,
  });

  const merge = useCallback((fragment: RecommendationGraph): void => {
    mergeFragment(nodeStore.current, edgeStore.current, fragment);
  }, []);

  const loadNeighbors = useCallback(
    async (nodeId: number): Promise<void> => {
      if (loadingIds.has(nodeId) || expandedIds.current.has(nodeId)) return;
      const skip = loadedCount.current.get(nodeId) ?? 0;
      setLoadingIds((prev) => new Set(prev).add(nodeId));
      try {
        const fragment = await getRecommendationGraphNeighbors(nodeId, skip, NEIGHBOR_PAGE_SIZE);
        merge(fragment);
        loadedCount.current.set(nodeId, skip + fragment.nodes.filter((n) => n.id !== nodeId).length);
        if (fragment.hasMore) hasMoreIds.current.add(nodeId);
        else {
          hasMoreIds.current.delete(nodeId);
          expandedIds.current.add(nodeId);
        }
        setVersion((v) => v + 1);
      } catch (e) {
        setError((e as ApiError).message ?? 'Unknown error');
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(nodeId);
          return next;
        });
      }
    },
    [getRecommendationGraphNeighbors, loadingIds, merge],
  );

  const openDetail = useCallback(
    (nodeId: number): void => {
      setSelectedId(nodeId);
      setDetail(undefined);
      setDetailLoading(true);
      getUserData(nodeId)
        .then(setDetail)
        .catch(() => undefined)
        .finally(() => setDetailLoading(false));
    },
    [getUserData],
  );

  // one click does both: show the node's details AND lazily load its connected accounts
  const onNodeClick = useCallback<NodeMouseHandler>(
    (_, node) => {
      const nodeId = +node.id;
      openDetail(nodeId);
      const stored = nodeStore.current.get(nodeId);
      if ((stored?.expandable || hasMoreIds.current.has(nodeId)) && !expandedIds.current.has(nodeId)) {
        void loadNeighbors(nodeId);
      }
    },
    [openDetail, loadNeighbors],
  );

  // initial load: reset the store and load the center's direct (1-hop) neighbors
  useEffect(() => {
    if (centerId == null) return;
    nodeStore.current = new Map();
    edgeStore.current = new Map();
    expandedIds.current = new Set();
    loadedCount.current = new Map();
    hasMoreIds.current = new Set();
    setSelectedId(undefined);
    setDetail(undefined);
    setError(undefined);
    setIsLoading(true);

    let cancelled = false;
    getRecommendationGraphNeighbors(centerId, 0, NEIGHBOR_PAGE_SIZE)
      .then((fragment) => {
        if (cancelled) return;
        merge(fragment);
        loadedCount.current.set(centerId, fragment.nodes.filter((n) => n.id !== centerId).length);
        if (fragment.hasMore) hasMoreIds.current.add(centerId);
        else expandedIds.current.add(centerId);
        setVersion((v) => v + 1);
        openDetail(centerId);
      })
      .catch((e: ApiError) => !cancelled && setError(e.message ?? 'Unknown error'))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
    // re-init only when the inspected userData changes
  }, [centerId]);

  // rebuild the react-flow graph whenever the store or per-node loading state changes
  useEffect(() => {
    if (centerId == null) return;
    const graph: RecommendationGraph = {
      nodes: [...nodeStore.current.values()],
      edges: [...edgeStore.current.values()],
      rootId: centerId,
    };
    const layout = layoutGraph(graph, centerId, expandedIds.current, loadingIds);
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [version, loadingIds, centerId]);

  const memoNodeTypes = useMemo(() => nodeTypes, []);

  if (error) return <ErrorHint message={error} />;
  if (isLoading) return <StyledLoadingSpinner size={SpinnerSize.LG} />;

  const selectedNode = selectedId != null ? nodeStore.current.get(selectedId) : undefined;
  const canLoadMore =
    selectedId != null &&
    !expandedIds.current.has(selectedId) &&
    (selectedNode?.expandable || hasMoreIds.current.has(selectedId));
  const selectedReferrer = detail?.users.find((u) => u.refUserDataId);

  return (
    <div className="w-full flex" style={{ height: 'calc(100vh - 80px)' }}>
      <div className="flex-1 flex flex-col min-w-0">
        {/* Stats + legend bar */}
        <div className="flex flex-wrap gap-4 px-4 py-2 bg-white border-b border-dfxGray-300 text-sm text-dfxBlue-800">
          <span>Nodes: {nodeStore.current.size}</span>
          <span>Edges: {edgeStore.current.size}</span>
          <span className="text-dfxGray-700">click a node to show details &amp; load its connections</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-dfxBlue-800 bg-blue-50 inline-block" /> Current user
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-green-500 bg-green-50 inline-block" /> Trade approved
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-dfxGray-300 bg-white inline-block" /> No approval
          </span>
          <span className="flex items-center gap-1">
            <span className="w-6 border-t-2 border-dashed border-blue-500 inline-block" /> Ref-Code
          </span>
        </div>

        <div className="flex-1 min-h-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
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
              nodeColor={(n) => (n.data?.isCenter ? '#1e40af' : n.data?.tradeApprovalDate ? '#22c55e' : '#d1d5db')}
              zoomable
              pannable
            />
          </ReactFlow>
        </div>
      </div>

      {selectedId != null && (
        <div className="w-80 shrink-0 border-l border-dfxGray-300 bg-white overflow-auto p-4 text-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-dfxBlue-800">UserData #{selectedId}</div>
            <button className="text-dfxGray-700 hover:text-dfxBlue-800" onClick={() => setSelectedId(undefined)}>
              ✕
            </button>
          </div>

          {selectedNode && (
            <div className="space-y-1 text-dfxBlue-800">
              <div>Name: {[selectedNode.firstname, selectedNode.surname].filter(Boolean).join(' ') || '-'}</div>
              <div>
                KYC: {selectedNode.kycStatus ?? '-'}
                {selectedNode.kycLevel != null ? ` (L${selectedNode.kycLevel})` : ''}
              </div>
              <div>
                Trade approved:{' '}
                {selectedNode.tradeApprovalDate ? new Date(selectedNode.tradeApprovalDate).toLocaleDateString() : '-'}
              </div>
            </div>
          )}

          {detailLoading && (
            <div className="mt-3">
              <StyledLoadingSpinner size={SpinnerSize.SM} />
            </div>
          )}

          {detail && (
            <div className="mt-3 space-y-1 text-dfxGray-700">
              <div>Wallets: {detail.users.length}</div>
              <div>
                Ref-Codes:{' '}
                {detail.users
                  .map((u) => u.ref)
                  .filter(Boolean)
                  .join(', ') || '-'}
              </div>
              {selectedReferrer && (
                <div>
                  Referrer: {selectedReferrer.refUserName ?? '-'} #{selectedReferrer.refUserDataId} (
                  {selectedReferrer.usedRef})
                </div>
              )}
              <div>Transactions: {detail.transactions.length}</div>
              <div>KYC steps: {detail.kycSteps.length}</div>
              <div>Support issues: {detail.supportIssues?.length ?? 0}</div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {canLoadMore && (
              <button
                className="w-full px-3 py-1.5 rounded bg-dfxBlue-800 text-white text-sm disabled:opacity-50"
                disabled={loadingIds.has(selectedId)}
                onClick={() => void loadNeighbors(selectedId)}
              >
                {hasMoreIds.current.has(selectedId) ? 'Load more connections' : 'Load connections'}
              </button>
            )}
            <button
              className="w-full px-3 py-1.5 rounded border border-dfxBlue-800 text-dfxBlue-800 text-sm"
              onClick={() => navigate(`/compliance/user/${selectedId}`)}
            >
              Open full detail page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
