import { ApiError } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactFlow, { Background, Controls, Handle, MiniMap, Position, useEdgesState, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { ComplianceUserData, RecommendationGraph, useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import {
  applyFragment,
  beginExpand,
  distinctReferrers,
  emptyGraphStore,
  endExpandError,
  GraphStore,
  layoutGraph,
  nextSkip,
  shouldExpand,
  UserNodeData,
} from 'src/util/recommendation-graph.util';

const NEIGHBOR_PAGE_SIZE = 25;

// exported for focused unit testing of keyboard/click activation (FIX E)
export function UserNode({ data }: { data: UserNodeData }): JSX.Element {
  const name = [data.firstname, data.surname].filter(Boolean).join(' ') || '-';
  const hasApproval = !!data.tradeApprovalDate;

  return (
    // role/tabIndex make the node keyboard-operable. react-flow only wires onNodeClick for the mouse,
    // so keyboard activation (Enter/Space) and the click both invoke data.onActivate(id) directly -
    // no reliance on synthesizing a bubbling DOM click.
    <div
      role="button"
      tabIndex={0}
      onClick={() => data.onActivate?.(data.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          data.onActivate?.(data.id);
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

export default function ComplianceRecommendationGraphScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const navigate = useNavigate();
  const { id } = useParams();
  const { getRecommendationGraphNeighbors, getUserData } = useCompliance();

  const centerId = id ? +id : undefined;

  const [store, setStore] = useState<GraphStore>(emptyGraphStore);
  const [isLoading, setIsLoading] = useState(true);
  // full-screen error: reserved for the INITIAL center load only (a center that can't load has no graph)
  const [error, setError] = useState<string>();

  const [selectedId, setSelectedId] = useState<number>();
  const [detail, setDetail] = useState<ComplianceUserData>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>(); // panel-scoped: failed getUserData vs empty dossier
  // panel-scoped, non-destructive error for a failed lazy-expand/pagination: a transient failure on one
  // node must NOT tear down the loaded graph + detail panel (rendered inline in the detail panel below)
  const [loadMoreError, setLoadMoreError] = useState<string>();

  const [nodes, setNodes, onNodesChange] = useNodesState<UserNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // synchronous in-flight guard: blocks a second loadNeighbors for a node before its beginExpand
  // setStore commits (store.loadingIds is the reactive guard; this covers the same-frame race).
  const inFlight = useRef(new Set<number>());
  // dossier cache so re-clicking a node does not re-fetch the full userData
  const detailCache = useRef(new Map<number, ComplianceUserData>());
  // synchronously-readable mirror of the committed store: loadNeighbors must read shouldExpand/nextSkip
  // outside the setStore updater (which does NOT run synchronously under React 18) to drive its fetch
  const storeRef = useRef(store);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  useLayoutOptions({
    title: translate('screens/compliance', 'Recommendation Network'),
    backButton: true,
    noMaxWidth: true,
  });

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

  // thin lazy-expand: the pure state machine in recommendation-graph.util drives the transitions.
  // This is the expand/pagination path (NEVER the initial center load - that has its own effect) so
  // failures surface via the non-destructive, panel-scoped loadMoreError, not the full-screen error.
  const loadNeighbors = useCallback(
    async (nodeId: number): Promise<void> => {
      // synchronous re-entrancy guard so rapid double-clicks before setStore commits can't double-fetch;
      // store.loadingIds (via shouldExpand) is the reactive guard, inFlight is the in-render-frame guard.
      if (inFlight.current.has(nodeId)) return;
      // read the guard + cursor from the synchronously-current store mirror (the setStore updater does
      // NOT run synchronously under React 18, so it cannot drive control flow). nextSkip is the per-node
      // cursor; an expand may re-include an already-known upward parent (mergeFragment dedups it) so the
      // cursor can advance over already-visible nodes - accepted for this compliance tool.
      const current = storeRef.current;
      if (!shouldExpand(current, nodeId)) return;
      const skip = nextSkip(current, nodeId);
      inFlight.current.add(nodeId);
      setStore((prev) => beginExpand(prev, nodeId));
      setLoadMoreError(undefined);
      try {
        const fragment = await getRecommendationGraphNeighbors(nodeId, skip, NEIGHBOR_PAGE_SIZE);
        setStore((prev) => applyFragment(prev, nodeId, fragment, NEIGHBOR_PAGE_SIZE));
      } catch (e) {
        setStore((prev) => endExpandError(prev, nodeId));
        setLoadMoreError((e as ApiError).message ?? translate('screens/compliance', 'Unknown error'));
      } finally {
        inFlight.current.delete(nodeId);
      }
    },
    [getRecommendationGraphNeighbors, translate],
  );

  // clicking/activating a node always inspects it (opens the detail panel); it auto-loads neighbors
  // ONLY on the node's first expansion (when it has never been loaded yet). Further pagination is
  // explicit, via the 'Load more connections' button, so re-activating a node never grows the graph.
  const handleActivate = useCallback(
    (nodeId: number): void => {
      openDetail(nodeId);
      const stored = store.nodes.get(nodeId);
      const neverLoaded = !store.loadedCount.has(nodeId);
      if (stored?.expandable && neverLoaded) void loadNeighbors(nodeId);
    },
    [openDetail, loadNeighbors, store.nodes, store.loadedCount],
  );

  // INITIAL center load (distinct from the lazy-expand path): reset the store and load the center's
  // direct (1-hop) neighbors. A failure here is fatal to the view, so it uses the full-screen `error`.
  useEffect(() => {
    if (centerId == null) return;
    setStore(emptyGraphStore());
    inFlight.current = new Set();
    detailCache.current = new Map();
    setSelectedId(undefined);
    setDetail(undefined);
    setDetailError(undefined);
    setLoadMoreError(undefined);
    setError(undefined);
    setIsLoading(true);

    let cancelled = false;
    getRecommendationGraphNeighbors(centerId, 0, NEIGHBOR_PAGE_SIZE)
      .then((fragment) => {
        if (cancelled) return;
        setStore((prev) => applyFragment(prev, centerId, fragment, NEIGHBOR_PAGE_SIZE));
        openDetail(centerId);
      })
      // full-screen error: ONLY the initial center load reaches here (the expand path uses loadMoreError)
      .catch((e: ApiError) => !cancelled && setError(e.message ?? translate('screens/compliance', 'Unknown error')))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
    // Effectively re-inits only when centerId changes: the other deps are stable references
    // (getRecommendationGraphNeighbors/getUserData are memoized on the api `call`, applyFragment is a
    // module-level util import, openDetail is a useCallback over those stable values, and translate is
    // captured in the settings-context memo). Listing them honestly satisfies react-hooks/exhaustive-deps
    // without a suppression and does not introduce a reset/refetch loop.
  }, [centerId, getRecommendationGraphNeighbors, openDetail, translate]);

  // rebuild the react-flow graph whenever the store changes (nodes/edges/expanded/loading flags)
  useEffect(() => {
    if (centerId == null) return;
    const graph: RecommendationGraph = {
      nodes: [...store.nodes.values()],
      edges: [...store.edges.values()],
      rootId: centerId,
    };
    // reuse the side-panel 'Load connections' string for the in-canvas hint so both stay in sync
    const expandLabel = translate('screens/compliance', 'Load connections');
    const layout = layoutGraph(graph, centerId, store.expandedIds, store.loadingIds, expandLabel);
    // attach the explicit activation callback so UserNode can invoke it directly from click + keydown
    setNodes(layout.nodes.map((n) => ({ ...n, data: { ...n.data, onActivate: handleActivate } })));
    setEdges(layout.edges);
  }, [store, centerId, setNodes, setEdges, translate, handleActivate]);

  const memoNodeTypes = useMemo(() => nodeTypes, []);

  if (error) return <ErrorHint message={error} />;
  if (isLoading) return <StyledLoadingSpinner size={SpinnerSize.LG} />;

  const selectedNode = selectedId != null ? store.nodes.get(selectedId) : undefined;
  const canLoadMore =
    selectedId != null &&
    !store.expandedIds.has(selectedId) &&
    (selectedNode?.expandable || store.hasMoreIds.has(selectedId));
  // all distinct ref-code referrers, deduped by usedRef and ignoring the DEFAULT_REF sentinel
  // (shared helper, also used by recommendation-panel.tsx)
  const selectedReferrers = distinctReferrers(detail?.users);

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
            <div className="font-semibold text-dfxBlue-800">
              {translate('screens/compliance', 'UserData')} #{selectedId}
            </div>
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
                disabled={store.loadingIds.has(selectedId)}
                onClick={() => void loadNeighbors(selectedId)}
              >
                {store.hasMoreIds.has(selectedId)
                  ? translate('screens/compliance', 'Load more connections')
                  : translate('screens/compliance', 'Load connections')}
              </button>
            )}
            {/* non-destructive, panel-scoped: a failed lazy-expand keeps the graph + panel intact */}
            {loadMoreError && <div className="text-sm text-red-600">{loadMoreError}</div>}
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
