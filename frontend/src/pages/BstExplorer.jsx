import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Search, Play, Award, GraduationCap, RefreshCw, Layers, ArrowRight, HelpCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useSubjects } from "@/hooks/useQueries";
import { toast } from "sonner";

// BST Node Class
class BSTNode {
  constructor(subject) {
    this.subject = subject;
    this.id = subject.id;
    this.name = subject.name;
    this.semester = subject.semester;
    this.credits = subject.credits;
    // Alphabetical string comparison key
    this.key = subject.name.trim();
    this.left = null;
    this.right = null;
    // Graphical layout coordinates
    this.x = 0;
    this.y = 0;
  }
}

// BST Class
class BinarySearchTree {
  constructor() {
    this.root = null;
  }

  insert(subject) {
    const newNode = new BSTNode(subject);
    if (!this.root) {
      this.root = newNode;
      return;
    }
    this._insertNode(this.root, newNode);
  }

  _insertNode(node, newNode) {
    if (newNode.key.toLowerCase() < node.key.toLowerCase()) {
      if (!node.left) {
        node.left = newNode;
      } else {
        this._insertNode(node.left, newNode);
      }
    } else {
      if (!node.right) {
        node.right = newNode;
      } else {
        this._insertNode(node.right, newNode);
      }
    }
  }

  // Pre-calculate visual coordinates with responsive spacing
  calculatePositions(node, x, y, xOffset) {
    if (!node) return;
    node.x = x;
    node.y = y;
    if (node.left) {
      this.calculatePositions(node.left, x - xOffset, y + 100, xOffset * 0.5);
    }
    if (node.right) {
      this.calculatePositions(node.right, x + xOffset, y + 100, xOffset * 0.5);
    }
  }

  // Get path to a node for search animations
  searchPath(query) {
    const path = [];
    if (!this.root || !query) return path;
    
    let current = this.root;
    const lowerQuery = query.toLowerCase();

    while (current) {
      path.push(current.id);
      if (current.name.toLowerCase().includes(lowerQuery)) {
        break; // Match found (or partial match)
      }
      if (lowerQuery < current.key.toLowerCase()) {
        current = current.left;
      } else {
        current = current.right;
      }
    }
    return path;
  }

  // Traverse helpers for animated traversals
  getInOrder(node, list = []) {
    if (!node) return list;
    this.getInOrder(node.left, list);
    list.push(node);
    this.getInOrder(node.right, list);
    return list;
  }

  getPreOrder(node, list = []) {
    if (!node) return list;
    list.push(node);
    this.getPreOrder(node.left, list);
    this.getPreOrder(node.right, list);
    return list;
  }

  getPostOrder(node, list = []) {
    if (!node) return list;
    this.getPostOrder(node.left, list);
    this.getPostOrder(node.right, list);
    list.push(node);
    return list;
  }
}

export default function BstExplorer() {
  const subjectsQuery = useSubjects();
  const subjects = useMemo(() => subjectsQuery.data || [], [subjectsQuery.data]);
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState("");
  const [activePath, setActivePath] = useState([]);
  const [traversalList, setTraversalList] = useState([]);
  const [traversing, setTraversing] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showInfo, setShowInfo] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (subjectsQuery.isLoading) {
      setLoading(true);
      return;
    }
    if (subjects.length > 0) {
      try {
        const bst = new BinarySearchTree();
        // Insert in structured order to get a relatively balanced look
        const sorted = [...subjects].sort((a, b) => a.name.localeCompare(b.name));
        
        // Balance algorithm: insert middle element first
        const insertBalanced = (arr) => {
          if (arr.length === 0) return;
          const mid = Math.floor(arr.length / 2);
          bst.insert(arr[mid]);
          insertBalanced(arr.slice(0, mid));
          insertBalanced(arr.slice(mid + 1));
        };

        insertBalanced(sorted);
        bst.calculatePositions(bst.root, 400, 60, 180);
        setTree(bst);
      } catch (err) {
        console.error("Failed to build tree:", err);
        toast.error("Could not construct BST");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [subjects, subjectsQuery.isLoading]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!tree || !searchVal.trim()) {
      setActivePath([]);
      return;
    }
    const path = tree.searchPath(searchVal.trim());
    setActivePath(path);
    if (path.length > 0) {
      const lastId = path[path.length - 1];
      const match = subjects.find(s => s.id === lastId);
      if (match) {
        setSelectedNode(match);
        toast.success(`Found: ${match.name}!`);
      }
    } else {
      toast.error("Subject not found in tree");
    }
  };

  const runTraversalAnimation = async (type) => {
    if (!tree || traversing) return;
    setTraversing(true);
    setActivePath([]);
    setSelectedNode(null);
    setTraversalList([]);

    let list = [];
    if (type === "inorder") list = tree.getInOrder(tree.root);
    else if (type === "preorder") list = tree.getPreOrder(tree.root);
    else if (type === "postorder") list = tree.getPostOrder(tree.root);

    for (let i = 0; i < list.length; i++) {
      const node = list[i];
      setActiveNodeId(node.id);
      setTraversalList(prev => [...prev, node.name]);
      // Highlight timing
      await new Promise(resolve => setTimeout(resolve, 750));
    }

    setActiveNodeId(null);
    setTraversing(false);
    toast.success(`${type.toUpperCase()} traversal complete!`);
  };

  // Helper to draw connecting line
  const renderLines = (node) => {
    if (!node) return null;
    const lines = [];
    if (node.left) {
      const isPathLeft = activePath.includes(node.id) && activePath.includes(node.left.id);
      lines.push(
        <line
          key={`l-${node.id}-${node.left.id}`}
          x1={node.x}
          y1={node.y}
          x2={node.left.x}
          y2={node.left.y}
          stroke={isPathLeft ? "#00E5D4" : "rgba(255, 255, 255, 0.12)"}
          strokeWidth={isPathLeft ? "3.5" : "1.5"}
          className="transition-all duration-300"
          strokeDasharray={isPathLeft ? "none" : "none"}
        />
      );
      lines.push(...renderLines(node.left));
    }
    if (node.right) {
      const isPathRight = activePath.includes(node.id) && activePath.includes(node.right.id);
      lines.push(
        <line
          key={`l-${node.id}-${node.right.id}`}
          x1={node.x}
          y1={node.y}
          x2={node.right.x}
          y2={node.right.y}
          stroke={isPathRight ? "#00E5D4" : "rgba(255, 255, 255, 0.12)"}
          strokeWidth={isPathRight ? "3.5" : "1.5"}
          className="transition-all duration-300"
        />
      );
      lines.push(...renderLines(node.right));
    }
    return lines;
  };

  // Helper to draw nodes
  const renderNodes = (node) => {
    if (!node) return null;
    const list = [];
    const isActive = activePath.includes(node.id);
    const isCurrent = activeNodeId === node.id;
    const isSelected = selectedNode?.id === node.id;

    list.push(
      <g
        key={`g-${node.id}`}
        className="cursor-pointer group"
        onClick={() => setSelectedNode(node.subject)}
      >
        {/* Glow effect */}
        {(isActive || isCurrent || isSelected) && (
          <circle
            cx={node.x}
            cy={node.y}
            r="26"
            fill="none"
            stroke="#00E5D4"
            strokeWidth="5"
            className="opacity-50 blur-[4px] animate-pulse"
          />
        )}
        <circle
          cx={node.x}
          cy={node.y}
          r="19"
          fill={isCurrent ? "#00E5D4" : isSelected ? "#0F172A" : "#0D1117"}
          stroke={isCurrent ? "#FFFFFF" : isSelected ? "#00E5D4" : isActive ? "#00E5D4" : "rgba(255, 255, 255, 0.3)"}
          strokeWidth="2"
          className="transition-all duration-300 group-hover:stroke-[#00E5D4] group-hover:scale-110"
        />
        {/* Node initials */}
        <text
          x={node.x}
          y={node.y + 4}
          textAnchor="middle"
          fill={isCurrent ? "#0D1117" : "white"}
          fontSize="10px"
          fontWeight="bold"
          fontFamily="monospace"
          className="select-none pointer-events-none uppercase"
        >
          {node.name.slice(0, 3)}
        </text>
        {/* Tooltip on hover */}
        <title>{node.name} (Semester {node.semester})</title>
      </g>
    );

    if (node.left) list.push(...renderNodes(node.left));
    if (node.right) list.push(...renderNodes(node.right));
    return list;
  };

  return (
    <div className="page-enter mx-auto max-w-6xl px-6 pt-28 md:pt-32">
      <Breadcrumbs items={[{ label: "BST Explorer" }]} />
      <PageHeader
        chip="Academic Tree Visualizer"
        title={<>BST Subject <span className="text-[#00E5D4]">Explorer</span></>}
        subtitle="Explore the BIT Mesra First-Year syllabus and subjects as a Binary Search Tree."
        testid="bst-explorer"
      />

      {showInfo && (
        <div className="mt-6 p-4 bg-[#00E5D4]/10 border border-[#00E5D4]/20 rounded-2xl flex items-start gap-3.5 max-w-4xl mx-auto">
          <HelpCircle className="w-5 h-5 text-[#00E5D4] shrink-0 mt-0.5" />
          <div className="text-xs text-white/80 leading-relaxed">
            <span className="font-bold text-[#00E5D4]">What is this?</span> This interactive module takes the complete syllabus and models it as an alphabetical Binary Search Tree. Type a subject name to watch the path search algorithm branch left/right dynamically, or click <span className="font-semibold text-white">In-order Traversal</span> to display subjects in sorted order! Click any node to open notes.
            <button onClick={() => setShowInfo(false)} className="text-red-400 font-mono underline hover:text-red-300 ml-2">Dismiss</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="min-h-[400px] flex items-center justify-center text-white/60">
          <RefreshCw className="w-6 h-6 text-[#00E5D4] animate-spin mr-3" />
          Mapping the syllabus universe...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12 mt-8 items-start">
          {/* TREE CANVAS PORT */}
          <div className="lg:col-span-8 card-glass p-5 flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-4 left-4 flex gap-2 z-10">
              <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-2 py-1 rounded text-white/60">
                Root: {tree?.root?.name || "None"}
              </span>
              <span className="text-[10px] font-mono bg-[#00E5D4]/10 border border-[#00E5D4]/30 px-2 py-1 rounded text-[#00E5D4]">
                Alphabetical Indexing
              </span>
            </div>

            <div className="w-full overflow-x-auto py-4 flex justify-center">
              <svg width="800" height="420" className="max-w-full">
                {tree && renderLines(tree.root)}
                {tree && renderNodes(tree.root)}
              </svg>
            </div>

            {/* INTERACTIVE CONTROLS */}
            <div className="w-full border-t border-white/5 pt-4 mt-2 flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => runTraversalAnimation("inorder")}
                disabled={traversing}
                className="px-3.5 py-1.5 text-xs rounded-xl bg-white/5 border border-white/10 hover:border-[#00E5D4] text-white hover:text-[#00E5D4] transition"
              >
                In-order (Sorted)
              </button>
              <button
                onClick={() => runTraversalAnimation("preorder")}
                disabled={traversing}
                className="px-3.5 py-1.5 text-xs rounded-xl bg-white/5 border border-white/10 hover:border-[#00E5D4] text-white hover:text-[#00E5D4] transition"
              >
                Pre-order
              </button>
              <button
                onClick={() => runTraversalAnimation("postorder")}
                disabled={traversing}
                className="px-3.5 py-1.5 text-xs rounded-xl bg-white/5 border border-white/10 hover:border-[#00E5D4] text-white hover:text-[#00E5D4] transition"
              >
                Post-order
              </button>
              <button
                onClick={() => { setActivePath([]); setSelectedNode(null); setTraversalList([]); }}
                className="px-3.5 py-1.5 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
              >
                Reset
              </button>
            </div>
          </div>

          {/* TRAVERSAL / SELECTION INFORMATION */}
          <div className="lg:col-span-4 space-y-6">
            {/* SEARCH PORTAL */}
            <div className="card-glass p-6">
              <h3 className="font-display text-sm font-semibold text-white/95 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-[#00E5D4]" /> Traversal Path Search
              </h3>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., Mathematics"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0D1117]/60 border border-white/10 text-xs text-white focus:outline-none focus:border-[#00E5D4]"
                />
                <button type="submit" className="p-2.5 bg-[#00E5D4]/15 border border-[#00E5D4]/40 text-[#00E5D4] hover:bg-[#00E5D4]/35 rounded-xl transition">
                  <Play className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* SELECTION CARD */}
            {selectedNode ? (
              <div className="card-glass p-6 border-l-4 border-l-[#00E5D4] animate-fade-up">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-mono uppercase tracking-widest bg-white/10 border border-white/5 px-2 py-0.5 rounded text-white/60">
                    Semester {selectedNode.semester}
                  </span>
                  <span className="text-xs text-[#00E5D4] font-mono flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> {selectedNode.credits || 4} Credits
                  </span>
                </div>
                <h4 className="text-base font-bold text-white mb-2">{selectedNode.name}</h4>
                <p className="text-xs text-white/60 leading-relaxed mb-4">
                  Fully indexed academic subject node. Select below to explore all corresponding study material, mid-sem and end-sem PYQs, and module resources.
                </p>
                <Link
                  to={`/notes/subject/${selectedNode.id}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#00E5D4]/10 hover:bg-[#00E5D4]/20 border border-[#00E5D4]/40 text-[#00E5D4] rounded-xl text-xs font-semibold tracking-wider transition uppercase"
                >
                  Access Notes <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="card-glass p-6 text-center text-white/50 py-10 flex flex-col items-center justify-center">
                <GraduationCap className="w-10 h-10 text-white/25 mb-3" />
                <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-1">No Subject Selected</h4>
                <p className="text-[11px] leading-relaxed max-w-[200px]">
                  Click on any tree node above or type a search query to inspect details here.
                </p>
              </div>
            )}

            {/* LIVE TRAVERSAL LIST */}
            {traversalList.length > 0 && (
              <div className="card-glass p-6 max-h-[250px] overflow-y-auto">
                <h3 className="font-display text-sm font-semibold text-white/95 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Layers className="w-4 h-4 text-[#00E5D4]" /> Traversal Queue
                </h3>
                <div className="space-y-1.5">
                  {traversalList.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-white/80 font-mono">
                      <span className="text-[9px] text-[#00E5D4]">{idx + 1}.</span>
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
