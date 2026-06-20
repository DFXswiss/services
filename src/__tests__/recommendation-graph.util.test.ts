// compliance.hook.ts (imported transitively for the RecommendationGraph* types/enums) loads a few
// @dfx.swiss/react enum values at module scope, so the mock must provide them.
jest.mock('@dfx.swiss/react', () => ({
  useApi: () => ({ call: jest.fn() }),
  PhoneCallStatus: {
    COMPLETED: 'Completed',
    UNAVAILABLE: 'Unavailable',
    SUSPICIOUS: 'Suspicious',
    USER_REJECTED: 'UserRejected',
    REPEAT: 'Repeat',
  },
  CallQueue: {
    MANUAL_CHECK_PHONE: 'ManualCheckPhone',
    MANUAL_CHECK_IP_PHONE: 'ManualCheckIpPhone',
    MANUAL_CHECK_IP_COUNTRY_PHONE: 'ManualCheckIpCountryPhone',
    MANUAL_CHECK_EXTERNAL_ACCOUNT_PHONE: 'ManualCheckExternalAccountPhone',
    UNAVAILABLE_SUSPICIOUS: 'UnavailableSuspicious',
  },
}));

import { MarkerType } from 'reactflow';
import {
  RecommendationGraph,
  RecommendationGraphEdge,
  RecommendationGraphEdgeKind,
  RecommendationGraphNode,
} from 'src/hooks/compliance.hook';
import { edgePairKey, layoutGraph, mergeFragment, reactFlowEdgeId } from '../util/recommendation-graph.util';

function node(id: number, extra: Partial<RecommendationGraphNode> = {}): RecommendationGraphNode {
  return { id, ...extra };
}

function recEdge(
  recommenderId: number,
  recommendedId: number,
  extra: Partial<RecommendationGraphEdge> = {},
): RecommendationGraphEdge {
  return {
    id: recommenderId * 1000 + recommendedId,
    kind: RecommendationGraphEdgeKind.RECOMMENDATION,
    recommenderId,
    recommendedId,
    ...extra,
  };
}

function refEdge(
  recommenderId: number,
  recommendedId: number,
  extra: Partial<RecommendationGraphEdge> = {},
): RecommendationGraphEdge {
  return {
    id: -(recommenderId * 1000 + recommendedId),
    kind: RecommendationGraphEdgeKind.USED_REF,
    recommenderId,
    recommendedId,
    ...extra,
  };
}

describe('recommendation-graph.util', () => {
  describe('reactFlowEdgeId', () => {
    it('keys an edge by directed pair + kind', () => {
      expect(reactFlowEdgeId(recEdge(1, 2))).toBe('e-1-2-Recommendation');
      expect(reactFlowEdgeId(refEdge(1, 2))).toBe('e-1-2-UsedRef');
    });

    it('distinguishes direction and kind', () => {
      expect(reactFlowEdgeId(recEdge(2, 1))).not.toBe(reactFlowEdgeId(recEdge(1, 2)));
      expect(reactFlowEdgeId(recEdge(1, 2))).not.toBe(reactFlowEdgeId(refEdge(1, 2)));
    });
  });

  describe('edgePairKey', () => {
    it('keys by directed pair only (kind-agnostic)', () => {
      expect(edgePairKey(recEdge(1, 2))).toBe('1-2');
      expect(edgePairKey(refEdge(1, 2))).toBe('1-2');
    });
  });

  describe('layoutGraph', () => {
    it('finds the root, assigns BFS levels and positions children', () => {
      const graph: RecommendationGraph = {
        nodes: [node(1), node(2), node(3)],
        edges: [recEdge(1, 2), recEdge(2, 3)],
        rootId: 2,
      };

      const { nodes } = layoutGraph(graph, 2, new Set(), new Set(), 'load connections');

      const byId = new Map(nodes.map((n) => [n.id, n]));
      // root 1 at level 0, 2 at level 1, 3 at level 2
      expect(byId.get('1')?.position.y).toBe(0);
      expect(byId.get('2')?.position.y).toBe(240); // LEVEL_HEIGHT = NODE_HEIGHT(120) * 2
      expect(byId.get('3')?.position.y).toBe(480);
    });

    it('centers a single level horizontally', () => {
      const graph: RecommendationGraph = {
        nodes: [node(1), node(2)],
        edges: [],
        rootId: 1,
      };

      const { nodes } = layoutGraph(graph, 1, new Set(), new Set(), 'load connections');
      // two nodes at the same level: totalWidth = 440, startX = -220
      const xs = nodes.map((n) => n.position.x).sort((a, b) => a - b);
      expect(xs).toEqual([-220, 0]);
    });

    it('falls back to the center as root when no parent is loaded', () => {
      const graph: RecommendationGraph = {
        nodes: [node(5), node(6)],
        edges: [recEdge(5, 6)],
        rootId: 5,
      };

      const { nodes } = layoutGraph(graph, 5, new Set(), new Set(), 'load connections');
      const byId = new Map(nodes.map((n) => [n.id, n]));
      expect(byId.get('5')?.position.y).toBe(0);
      expect(byId.get('6')?.position.y).toBe(240);
    });

    it('places disconnected nodes at level 0', () => {
      const graph: RecommendationGraph = {
        nodes: [node(1), node(2), node(99)], // 99 has no edges
        edges: [recEdge(1, 2)],
        rootId: 1,
      };

      const { nodes } = layoutGraph(graph, 1, new Set(), new Set(), 'load connections');
      const byId = new Map(nodes.map((n) => [n.id, n]));
      expect(byId.get('99')?.position.y).toBe(0);
    });

    it('terminates on a cycle when finding the root', () => {
      const graph: RecommendationGraph = {
        nodes: [node(1), node(2)],
        edges: [recEdge(1, 2), recEdge(2, 1)], // cycle
        rootId: 1,
      };

      expect(() => layoutGraph(graph, 1, new Set(), new Set(), 'load connections')).not.toThrow();
      const { nodes } = layoutGraph(graph, 1, new Set(), new Set(), 'load connections');
      expect(nodes).toHaveLength(2);
    });

    it('skips edges referencing missing nodes and does not emit phantom nodes', () => {
      const graph: RecommendationGraph = {
        nodes: [node(1)], // node 2 referenced by the edge is absent from nodes
        edges: [recEdge(1, 2)],
        rootId: 1,
      };

      const { nodes } = layoutGraph(graph, 1, new Set(), new Set(), 'load connections');
      expect(nodes.map((n) => n.id)).toEqual(['1']);
    });

    it('marks the center node with isCenter', () => {
      const graph: RecommendationGraph = {
        nodes: [node(1), node(2)],
        edges: [recEdge(1, 2)],
        rootId: 2,
      };

      const { nodes } = layoutGraph(graph, 2, new Set(), new Set(), 'load connections');
      const byId = new Map(nodes.map((n) => [n.id, n]));
      expect(byId.get('2')?.data.isCenter).toBe(true);
      expect(byId.get('1')?.data.isCenter).toBe(false);
    });

    it('reflects expandable, expanded and loading node flags', () => {
      const graph: RecommendationGraph = {
        nodes: [node(1, { expandable: true }), node(2)],
        edges: [recEdge(1, 2)],
        rootId: 1,
      };

      const { nodes } = layoutGraph(graph, 1, new Set([1]), new Set([2]), 'load connections');
      const byId = new Map(nodes.map((n) => [n.id, n]));
      expect(byId.get('1')?.data.expandLabel).toBe('load connections');
      expect(byId.get('2')?.data.expandLabel).toBe('load connections');
      expect(byId.get('1')?.data.isExpandable).toBe(true);
      expect(byId.get('1')?.data.isExpanded).toBe(true);
      expect(byId.get('1')?.data.isLoading).toBe(false);
      expect(byId.get('2')?.data.isExpandable).toBe(false);
      expect(byId.get('2')?.data.isExpanded).toBe(false);
      expect(byId.get('2')?.data.isLoading).toBe(true);
    });

    it('uses the user node type and string ids', () => {
      const graph: RecommendationGraph = { nodes: [node(7)], edges: [], rootId: 7 };
      const { nodes } = layoutGraph(graph, 7, new Set(), new Set(), 'load connections');
      expect(nodes[0].type).toBe('user');
      expect(nodes[0].id).toBe('7');
    });

    describe('edge styling', () => {
      it('styles a confirmed recommendation green with the method label', () => {
        const graph: RecommendationGraph = {
          nodes: [node(1), node(2)],
          edges: [recEdge(1, 2, { isConfirmed: true, method: 'Manual' })],
          rootId: 1,
        };

        const { edges } = layoutGraph(graph, 1, new Set(), new Set(), 'load connections');
        expect(edges).toHaveLength(1);
        const e = edges[0];
        expect(e.id).toBe('e-1-2-Recommendation');
        expect(e.source).toBe('1');
        expect(e.target).toBe('2');
        expect(e.animated).toBe(false);
        expect(e.style).toEqual({ stroke: '#22c55e' });
        expect(e.label).toBe('Manual');
        expect(e.labelStyle).toEqual({ fontSize: 10, fill: '#6b7280' });
        expect(e.markerEnd).toEqual({ type: MarkerType.ArrowClosed });
      });

      it('styles a rejected recommendation red', () => {
        const graph: RecommendationGraph = {
          nodes: [node(1), node(2)],
          edges: [recEdge(1, 2, { isConfirmed: false })],
          rootId: 1,
        };

        const { edges } = layoutGraph(graph, 1, new Set(), new Set(), 'load connections');
        expect(edges[0].style).toEqual({ stroke: '#ef4444' });
      });

      it('styles a pending (undefined confirmation) recommendation gray', () => {
        const graph: RecommendationGraph = {
          nodes: [node(1), node(2)],
          edges: [recEdge(1, 2, { isConfirmed: undefined })],
          rootId: 1,
        };

        const { edges } = layoutGraph(graph, 1, new Set(), new Set(), 'load connections');
        expect(edges[0].style).toEqual({ stroke: '#9ca3af' });
      });

      it('styles a used-ref edge dashed blue and animated with the refCode label', () => {
        const graph: RecommendationGraph = {
          nodes: [node(1), node(2)],
          edges: [refEdge(1, 2, { refCode: 'ABC123', method: 'should-be-ignored' })],
          rootId: 1,
        };

        const { edges } = layoutGraph(graph, 1, new Set(), new Set(), 'load connections');
        const e = edges[0];
        expect(e.id).toBe('e-1-2-UsedRef');
        expect(e.animated).toBe(true);
        expect(e.style).toEqual({ stroke: '#3b82f6', strokeDasharray: '6 4' });
        expect(e.label).toBe('ABC123');
        expect(e.labelStyle).toEqual({ fontSize: 10, fill: '#3b82f6' });
      });
    });
  });

  describe('mergeFragment', () => {
    it('inserts new nodes and edges into the stores', () => {
      const nodeStore = new Map<number, RecommendationGraphNode>();
      const edgeStore = new Map<string, RecommendationGraphEdge>();
      const fragment: RecommendationGraph = {
        nodes: [node(1), node(2)],
        edges: [recEdge(1, 2)],
        rootId: 1,
      };

      mergeFragment(nodeStore, edgeStore, fragment);

      expect(nodeStore.size).toBe(2);
      expect(edgeStore.size).toBe(1);
      expect(edgeStore.get('1-2')).toEqual(recEdge(1, 2));
    });

    it('dedups a node by id while preserving an already-set expandable flag', () => {
      const nodeStore = new Map<number, RecommendationGraphNode>([[1, node(1, { expandable: true })]]);
      const edgeStore = new Map<string, RecommendationGraphEdge>();

      // incoming node has fresh metadata but no expandable flag
      mergeFragment(nodeStore, edgeStore, {
        nodes: [node(1, { firstname: 'New', expandable: false })],
        edges: [],
        rootId: 1,
      });

      expect(nodeStore.size).toBe(1);
      const stored = nodeStore.get(1);
      expect(stored?.expandable).toBe(true); // kept
      expect(stored?.firstname).toBe('New'); // latest metadata
    });

    it('sets expandable when the incoming node introduces it', () => {
      const nodeStore = new Map<number, RecommendationGraphNode>([[1, node(1)]]);
      const edgeStore = new Map<string, RecommendationGraphEdge>();

      mergeFragment(nodeStore, edgeStore, {
        nodes: [node(1, { expandable: true })],
        edges: [],
        rootId: 1,
      });

      expect(nodeStore.get(1)?.expandable).toBe(true);
    });

    it('dedups an edge by directed pair (keeps the first when both same kind)', () => {
      const nodeStore = new Map<number, RecommendationGraphNode>();
      const first = recEdge(1, 2, { method: 'First' });
      const edgeStore = new Map<string, RecommendationGraphEdge>([['1-2', first]]);

      mergeFragment(nodeStore, edgeStore, {
        nodes: [],
        edges: [recEdge(1, 2, { method: 'Second' })],
        rootId: 1,
      });

      expect(edgeStore.size).toBe(1);
      expect(edgeStore.get('1-2')?.method).toBe('First'); // not overwritten
    });

    it('upgrades a used-ref edge to a recommendation on the same pair', () => {
      const nodeStore = new Map<number, RecommendationGraphNode>();
      const edgeStore = new Map<string, RecommendationGraphEdge>([['1-2', refEdge(1, 2, { refCode: 'R' })]]);

      mergeFragment(nodeStore, edgeStore, {
        nodes: [],
        edges: [recEdge(1, 2, { method: 'M' })],
        rootId: 1,
      });

      expect(edgeStore.size).toBe(1);
      expect(edgeStore.get('1-2')?.kind).toBe(RecommendationGraphEdgeKind.RECOMMENDATION);
      expect(edgeStore.get('1-2')?.method).toBe('M');
    });

    it('does not downgrade a recommendation to a used-ref edge', () => {
      const nodeStore = new Map<number, RecommendationGraphNode>();
      const edgeStore = new Map<string, RecommendationGraphEdge>([['1-2', recEdge(1, 2, { method: 'M' })]]);

      mergeFragment(nodeStore, edgeStore, {
        nodes: [],
        edges: [refEdge(1, 2, { refCode: 'R' })],
        rootId: 1,
      });

      expect(edgeStore.get('1-2')?.kind).toBe(RecommendationGraphEdgeKind.RECOMMENDATION);
    });
  });
});
