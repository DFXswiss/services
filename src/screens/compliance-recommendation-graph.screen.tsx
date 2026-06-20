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
import { DEFAULT_REF } from 'src/util/compliance-helpers';
import { layoutGraph, mergeFragment, UserNodeData } from 'src/util/recommendation-graph.util';

const NEIGHBOR_PAGE_SIZE = 25;

function UserNode({ data }: { data: UserNodeData }): JSX.Element {
  const name = [data.firstname, data.surname].filter(Boolean).join(' ') || '-';
  const hasApproval = !!data.tradeApprovalDate;

  return (
    // role/tabIndex/onKeyDown make the node keyboard-operable: react-flow only wires onNodeClick for
    // the mouse, so Enter/Space synthesizes a bubbling click that reaches its node wrapper and runs
    // the same expand-and-open-detail handler.
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.currentTarget.click();
        }
      }}
      className={`px-4 py-3 rounded-lg shadow-md border-2 cursor-pointer min-w-[180px] focus:outline-none focus-visible:ring-2 focus-visible:ring-dfxBlue-800 ${
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
        !data.isExpanded && <div className="mt-1 text-xs font-semibold text-dfxBlue-800">{data.expandLabel}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-dfxGray-700" />
    </div>
  );
}

const nodeTypes = { user: UserNode };

// accumulating client graph store (deduped by node id and by directed edge pair). Held in React
// state and replaced immutably on merge so every render-visible value stays reactive.
interface GraphStore {
  nodes: Map<number, RecommendationGraphNode>;
  edges: Map<string, RecommendationGraphEdge>;
  expandedIds: Set<number>; // nodes whose neighbors are fully loaded
  loadedCount: Map<number, number>; // neighbors already loaded per node (pagination cursor)
  hasMoreIds: Set<number>; // nodes with further neighbors to load
}

function emptyStore(): GraphStore {
  return {
    nodes: new Map(),
    edges: new Map(),
    expandedIds: new Set(),
    loadedCount: new Map(),
    hasMoreIds: new Set(),
  };
}

export default function ComplianceRecommendationGraphScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const navigate = useNavigate();
  const { id } = useParams();
  const { getRecommendationGraphNeighbors, getUserData } = useCompliance();

  const centerId = id ? +id : undefined;

  const [store, setStore] = useState<GraphStore>(emptyStore);
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set()); // drives the per-node spinner only
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const [selectedId, setSelectedId] = useState<number>();
  const [detail, setDetail] = useState<ComplianceUserData>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>(); // panel-scoped: failed getUserData vs empty dossier

  const [nodes, setNodes, onNodesChange] = useNodesState<UserNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // in-flight re-entrancy guard only: keeps loadNeighbors out of loadingIds state dependencies
  const inFlight = useRef(new Set<number>());
  // dossier cache so re-clicking a node does not re-fetch the full userData
  const detailCache = useRef(new Map<number, ComplianceUserData>());

  useLayoutOptions({
    title: translate('screens/compliance', 'Recommendation Network'),
    backButton: true,
    noMaxWidth: true,
  });

  // merge a fragment into a fresh copy of the store (immutable replacement keeps state reactive)
  const applyFragment = useCallback((prev: GraphStore, nodeId: number, fragment: RecommendationGraph): GraphStore => {
    const nodes = new Map(prev.nodes);
    const edges = new Map(prev.edges);
    mergeFragment(nodes, edges, fragment);
    const expandedIds = new Set(prev.expandedIds);
    const hasMoreIds = new Set(prev.hasMoreIds);
    const loadedCount = new Map(prev.loadedCount);
    // advance the cursor by NEIGHBOR_PAGE_SIZE (the requested page size), which matches the server's
    // slice window - so a dropped/merged userData id in the response can't stall 'Load more'
    loadedCount.set(nodeId, (prev.loadedCount.get(nodeId) ?? 0) + NEIGHBOR_PAGE_SIZE);
    if (fragment.hasMore) {
      hasMoreIds.add(nodeId);
    } else {
      hasMoreIds.delete(nodeId);
      expandedIds.add(nodeId);
    }
    return { nodes, edges, expandedIds, hasMoreIds, loadedCount };
  }, []);

  const openDetail = useCallback(
    (nodeId: number): void => {
      setSelectedId(nodeId);
      setDetailError(undefined);
      const cached = detailCache.current.get(nodeId);
      if (cached) {
        setDetail(cached);
        setDetailLoading(false);
        return;
      }
      setDetail(undefined);
      setDetailLoading(true);
      getUserData(nodeId)
        .then((data) => {
          detailCache.current.set(nodeId, data);
          setDetail(data);
        })
        // surface the failure (panel-scoped) so a failed fetch is distinguishable from an empty dossier
        .catch((e: ApiError) => setDetailError(e.message ?? translate('screens/compliance', 'Unknown error')))
        .finally(() => setDetailLoading(false));
    },
    [getUserData, translate],
  );

  const loadNeighbors = useCallback(
    async (nodeId: number): Promise<void> => {
      if (inFlight.current.has(nodeId)) return;
      inFlight.current.add(nodeId);
      setLoadingIds((prev) => new Set(prev).add(nodeId));
      try {
        const skip = store.loadedCount.get(nodeId) ?? 0;
        const fragment = await getRecommendationGraphNeighbors(nodeId, skip, NEIGHBOR_PAGE_SIZE);
        setStore((prev) => applyFragment(prev, nodeId, fragment));
      } catch (e) {
        setError((e as ApiError).message ?? translate('screens/compliance', 'Unknown error'));
      } finally {
        inFlight.current.delete(nodeId);
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(nodeId);
          return next;
        });
      }
    },
    [getRecommendationGraphNeighbors, applyFragment, store.loadedCount, translate],
  );

  // clicking a node always inspects it (opens the detail panel); it auto-loads neighbors ONLY on the
  // node's first expansion (when it has never been loaded yet). Further pagination is explicit, via
  // the 'Load more connections' button, so re-clicking a node to inspect it never grows the graph.
  const onNodeClick = useCallback<NodeMouseHandler>(
    (_, node) => {
      const nodeId = +node.id;
      openDetail(nodeId);
      const stored = store.nodes.get(nodeId);
      const neverLoaded = !store.loadedCount.has(nodeId);
      if (stored?.expandable && neverLoaded) {
        void loadNeighbors(nodeId);
      }
    },
    [openDetail, loadNeighbors, store.nodes, store.loadedCount],
  );

  // initial load: reset the store and load the center's direct (1-hop) neighbors
  useEffect(() => {
    if (centerId == null) return;
    setStore(emptyStore());
    inFlight.current = new Set();
    detailCache.current = new Map();
    setSelectedId(undefined);
    setDetail(undefined);
    setDetailError(undefined);
    setError(undefined);
    setIsLoading(true);

    let cancelled = false;
    getRecommendationGraphNeighbors(centerId, 0, NEIGHBOR_PAGE_SIZE)
      .then((fragment) => {
        if (cancelled) return;
        setStore((prev) => applyFragment(prev, centerId, fragment));
        openDetail(centerId);
      })
      .catch((e: ApiError) => !cancelled && setError(e.message ?? translate('screens/compliance', 'Unknown error')))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
    // Effectively re-inits only when centerId changes: the other deps are stable references
    // (getRecommendationGraphNeighbors/getUserData are memoized on the api `call`, applyFragment is a
    // useCallback([]), openDetail is a useCallback over those stable values, and translate is captured
    // in the settings-context memo). Listing them honestly satisfies react-hooks/exhaustive-deps
    // without a suppression and does not introduce a reset/refetch loop.
  }, [centerId, getRecommendationGraphNeighbors, applyFragment, openDetail, translate]);

  // rebuild the react-flow graph whenever the store or per-node loading state changes
  useEffect(() => {
    if (centerId == null) return;
    const graph: RecommendationGraph = {
      nodes: [...store.nodes.values()],
      edges: [...store.edges.values()],
      rootId: centerId,
    };
    // reuse the side-panel 'Load connections' string for the in-canvas hint so both stay in sync
    const expandLabel = translate('screens/compliance', 'Load connections');
    const layout = layoutGraph(graph, centerId, store.expandedIds, loadingIds, expandLabel);
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [store, loadingIds, centerId, setNodes, setEdges, translate]);

  const memoNodeTypes = useMemo(() => nodeTypes, []);

  if (error) return <ErrorHint message={error} />;
  if (isLoading) return <StyledLoadingSpinner size={SpinnerSize.LG} />;

  const selectedNode = selectedId != null ? store.nodes.get(selectedId) : undefined;
  const canLoadMore =
    selectedId != null &&
    !store.expandedIds.has(selectedId) &&
    (selectedNode?.expandable || store.hasMoreIds.has(selectedId));
  // all distinct ref-code referrers, deduped by usedRef and ignoring the DEFAULT_REF sentinel
  // (same dedup as recommendation-panel.tsx)
  const selectedReferrers = Array.from(
    new Map(
      (detail?.users ?? []).filter((u) => u.usedRef && u.usedRef !== DEFAULT_REF).map((u) => [u.usedRef, u]),
    ).values(),
  );

  return (
    <div className="w-full flex" style={{ height: 'calc(100vh - 80px)' }}>
      <div className="flex-1 flex flex-col min-w-0">
        {/* Stats + legend bar */}
        <div className="flex flex-wrap gap-4 px-4 py-2 bg-white border-b border-dfxGray-300 text-sm text-dfxBlue-800">
          <span>
            {translate('screens/compliance', 'Nodes')}: {store.nodes.size}
          </span>
          <span>
            {translate('screens/compliance', 'Edges')}: {store.edges.size}
          </span>
          <span className="text-dfxGray-700">
            {translate('screens/compliance', 'Click a node to show details and load its connections')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-dfxBlue-800 bg-blue-50 inline-block" />{' '}
            {translate('screens/compliance', 'Current user')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-green-500 bg-green-50 inline-block" />{' '}
            {translate('screens/compliance', 'Trade approved')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-dfxGray-300 bg-white inline-block" />{' '}
            {translate('screens/compliance', 'No approval')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-6 border-t-2 border-dashed border-blue-500 inline-block" />{' '}
            {translate('screens/compliance', 'Ref-Code')}
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
            <button
              className="text-dfxGray-700 hover:text-dfxBlue-800"
              aria-label={translate('screens/compliance', 'Close')}
              title={translate('screens/compliance', 'Close')}
              onClick={() => setSelectedId(undefined)}
            >
              ✕
            </button>
          </div>

          {selectedNode && (
            <div className="space-y-1 text-dfxBlue-800">
              <div>
                {translate('screens/compliance', 'Name')}:{' '}
                {[selectedNode.firstname, selectedNode.surname].filter(Boolean).join(' ') || '-'}
              </div>
              <div>
                {translate('screens/compliance', 'KYC')}: {selectedNode.kycStatus ?? '-'}
                {selectedNode.kycLevel != null ? ` (L${selectedNode.kycLevel})` : ''}
              </div>
              <div>
                {translate('screens/compliance', 'Trade approved')}:{' '}
                {selectedNode.tradeApprovalDate ? new Date(selectedNode.tradeApprovalDate).toLocaleDateString() : '-'}
              </div>
            </div>
          )}

          {detailLoading && (
            <div className="mt-3">
              <StyledLoadingSpinner size={SpinnerSize.SM} />
            </div>
          )}

          {detailError && <div className="mt-3 text-sm text-red-600">{detailError}</div>}

          {detail && (
            <div className="mt-3 space-y-1 text-dfxGray-700">
              <div>
                {translate('screens/compliance', 'Wallets')}: {detail.users.length}
              </div>
              <div>
                {translate('screens/compliance', 'Ref-Codes')}:{' '}
                {detail.users
                  .map((u) => u.ref)
                  .filter(Boolean)
                  .join(', ') || '-'}
              </div>
              {selectedReferrers.map((u) => (
                <div key={u.usedRef}>
                  {translate('screens/compliance', 'Referrer')}: {u.refUserName ?? '-'}{' '}
                  {u.refUserDataId ? `#${u.refUserDataId}` : ''} ({u.usedRef})
                </div>
              ))}
              <div>
                {translate('screens/compliance', 'Transactions')}: {detail.transactions.length}
              </div>
              <div>
                {translate('screens/compliance', 'KYC steps')}: {detail.kycSteps.length}
              </div>
              <div>
                {translate('screens/compliance', 'Support issues')}: {detail.supportIssues?.length ?? 0}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {canLoadMore && (
              <button
                className="w-full px-3 py-1.5 rounded bg-dfxBlue-800 text-white text-sm disabled:opacity-50"
                disabled={loadingIds.has(selectedId)}
                onClick={() => void loadNeighbors(selectedId)}
              >
                {store.hasMoreIds.has(selectedId)
                  ? translate('screens/compliance', 'Load more connections')
                  : translate('screens/compliance', 'Load connections')}
              </button>
            )}
            <button
              className="w-full px-3 py-1.5 rounded border border-dfxBlue-800 text-dfxBlue-800 text-sm"
              onClick={() => navigate(`/compliance/user/${selectedId}`)}
            >
              {translate('screens/compliance', 'Open full detail page')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
