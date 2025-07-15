import { useEffect, useState } from "react";
import PropTypes from "prop-types";

const VirtualDOMDemo = () => {
  const [items, setItems] = useState([
    { id: 1, name: "Apple", selected: false },
  ]);
  const [pendingItems, setPendingItems] = useState(null);
  const [showDiff, setShowDiff] = useState(true); // Show by default
  const [step, setStep] = useState(0);
  const [renderPhase, setRenderPhase] = useState(false);
  const [commitPhase, setCommitPhase] = useState(false);
  const [diff, setDiff] = useState({
    prev: items,
    next: items,
    changedIds: [],
  });
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [isProcessActive, setIsProcessActive] = useState(false);

  const MAX_STEP = 5;

  // Utility functions
  function getChangedIds(prev, next) {
    const prevMap = new Map(prev.map((item) => [item.id, item]));
    const nextMap = new Map(next.map((item) => [item.id, item]));
    const changed = [];
    for (const item of next) {
      if (!prevMap.has(item.id)) {
        changed.push(item.id);
      } else if (prevMap.get(item.id).selected !== item.selected) {
        changed.push(item.id);
      }
    }
    for (const item of prev) {
      if (!nextMap.has(item.id)) {
        changed.push(item.id);
      }
    }
    return changed;
  }

  function startProcess(diffObj) {
    setDiff(diffObj);
    setShowDiff(true);
    setStep(1);
    setRenderPhase(true);
    setCommitPhase(false);
    setIsProcessActive(true);
    setPendingItems(diffObj.next);
    // DON'T update items here! Keep showing current state until commit
  }

  function nextStep() {
    setStep((prev) => {
      const next = prev + 1;
      if (next === 4) {
        setRenderPhase(false);
        setCommitPhase(true);
        // Only NOW do we update the actual UI (Commit phase)
        if (pendingItems) {
          setItems(pendingItems);
        }
        setPendingItems(null);
      }
      if (next > MAX_STEP) {
        resetProcess();
        return 0;
      }
      return next;
    });
  }

  function previousStep() {
    setStep((prev) => {
      const next = Math.max(1, prev - 1);
      if (prev >= 4 && next <= 3) {
        setCommitPhase(false);
        setRenderPhase(true);
        if (diff.prev && diff.next) {
          setItems(diff.prev);
          setPendingItems(diff.next);
        }
      }
      return next;
    });
  }

  function resetProcess() {
    setShowDiff(true); // Keep showing diff
    setCommitPhase(false);
    setRenderPhase(false);
    setStep(0);
    setIsProcessActive(false);
    setPendingItems(null);
  }

  useEffect(() => {
    if (!isProcessActive || !isAutoMode) return;
    if (step === 0 || step > MAX_STEP) return;
    const timer = setTimeout(() => nextStep(), 800);
    return () => clearTimeout(timer);
  }, [step, isAutoMode, isProcessActive]);

  // Item actions
  const toggleItem = (id) => {
    if (isProcessActive) return;
    const nextItems = items.map((item) =>
      item.id === id ? { ...item, selected: !item.selected } : item
    );
    startProcess({
      prev: items,
      next: nextItems,
      changedIds: getChangedIds(items, nextItems),
    });
  };

  const addItem = () => {
    if (isProcessActive) return;
    const newItem = {
      id: Date.now(),
      name: `Item ${items.length + 1}`,
      selected: false,
    };
    const nextItems = [...items, newItem];
    startProcess({
      prev: items,
      next: nextItems,
      changedIds: getChangedIds(items, nextItems),
    });
  };

  const removeItem = (id) => {
    if (isProcessActive) return;
    const nextItems = items.filter((item) => item.id !== id);
    startProcess({
      prev: items,
      next: nextItems,
      changedIds: getChangedIds(items, nextItems),
    });
  };

  useEffect(() => {
    if (step > MAX_STEP) resetProcess();
  }, [step]);

  // Render helper functions
  const renderFiberTree = (items, treeType) => {
    const isWorkInProgress = treeType === "workInProgress";
    const treeColor = isWorkInProgress ? "text-purple-600" : "text-blue-600";

    return (
      <div className="space-y-2">
        <div className={`${treeColor} font-semibold`}>FiberRootNode</div>
        <div className="ml-4">
          <div className={`${treeColor}`}>└─ App (HostRoot)</div>
          <div className="ml-6 space-y-1">
            {items.map((item, index) => (
              <div key={item.id} className="space-y-1">
                <div
                  className={`flex items-center gap-2 ${
                    diff.changedIds.includes(item.id)
                      ? "bg-yellow-100 px-2 py-1 rounded"
                      : ""
                  }`}
                >
                  <span className={treeColor}>
                    {index === 0 ? "└─" : "├─"} div#{item.id}
                  </span>
                  {diff.changedIds.includes(item.id) && (
                    <span className="text-xs bg-yellow-200 px-1 rounded text-yellow-800">
                      {isWorkInProgress ? "NEW" : "OLD"}
                    </span>
                  )}
                </div>
                <div className="ml-6 text-slate-500 text-xs">
                  {isWorkInProgress && (
                    <>
                      <br />
                      pendingProps:{" "}
                      {`{name: "${item.name}", selected: ${item.selected}}`},
                      <br />
                      effectTag:{" "}
                      {diff.changedIds.includes(item.id)
                        ? '"UPDATE"'
                        : '"NO_WORK"'}
                      ,
                    </>
                  )}
                  {!isWorkInProgress && (
                    <>
                      <br />
                      memoizedProps:{" "}
                      {`{name: "${item.name}", selected: ${item.selected}}`},
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDetailedFiberNode = () => {
    const firstItem = diff.next[0] || diff.prev[0];
    if (!firstItem) return "No items to display";

    const isChanged = diff.changedIds.includes(firstItem.id);

    return `// Fiber node for div#${firstItem.id} (${firstItem.name})
const fiberNode = {
  // Component identification
  type: "div",                    // DOM element type
  key: ${firstItem.id},                     // React key for reconciliation
  elementType: "div",             // Original element type
  
  // Tree structure (linked list)
  child: null,                    // First child fiber
  sibling: fiberNode,             // Next sibling fiber  
  return: parentFiber,            // Parent fiber (return pointer)
  
  // Props and state
  pendingProps: {                 // New props being applied
    name: "${firstItem.name}",
    selected: ${firstItem.selected},
    className: "${firstItem.selected ? "selected" : "unselected"}"
  },
  memoizedProps: {                // Props from previous render
    name: "${firstItem.name}",
    selected: ${!firstItem.selected},
    className: "${!firstItem.selected ? "selected" : "unselected"}"
  },
  memoizedState: null,            // Component state (null for DOM)
  
  // Work and effects
  updateQueue: ${
    isChanged ? "updateQueue" : "null"
  },              // Pending updates queue
  effectTag: ${
    isChanged ? '"UPDATE"' : '"NO_WORK"'
  },                 // What work needs doing
  nextEffect: ${
    isChanged ? "nextFiber" : "null"
  },                // Next fiber with effects
  firstEffect: null,              // First child with effects
  lastEffect: null,               // Last child with effects
  
  // Scheduling and priority
  lanes: 0b${
    isChanged ? "0010" : "0000"
  },                   // Update priority lanes
  childLanes: 0b0000,             // Children's priority lanes
  expirationTime: ${
    isChanged ? Date.now() + 5000 : 0
  },           // When work expires
  
  // Double buffering
  alternate: currentFiberNode,    // Corresponding node in other tree
  
  // Fiber-specific fields
  tag: 5,                         // HostComponent (DOM element)
  mode: 0,                        // Concurrent/Legacy mode
  flags: ${isChanged ? "4" : "0"},                         // Side effect flags
  index: 0,                       // Index in parent's children
  ref: null,                      // React ref
  
  // Internal React fields
  _debugID: ${Math.floor(
    Math.random() * 10000
  )},                   // Debug identifier
  _debugSource: {                 // Source location info
    fileName: "App.jsx",
    lineNumber: 42
  },
  _debugOwner: null,              // Component that created this
  _debugHookTypes: null           // Hook types for debugging
};`;
  };

  function getItemChangeType(id, prev, next) {
    const inPrev = prev.some((item) => item.id === id);
    const inNext = next.some((item) => item.id === id);
    if (!inPrev && inNext) return "added";
    if (inPrev && !inNext) return "removed";
    if (inPrev && inNext) return "changed";
    return null;
  }

  const VirtualTree = ({
    title,
    items,
    isNew = false,
    highlight = [],
    prev = [],
    next = [],
  }) => (
    <div
      className={`p-4 border-2 rounded-xl shadow-lg bg-white ${
        isNew
          ? "border-teal-300 shadow-teal-100"
          : "border-blue-300 shadow-blue-100"
      }`}
    >
      <h3 className="font-bold mb-3 text-center text-slate-700 flex items-center justify-center gap-2 text-lg">
        {isNew ? "🆕" : "📦"} {title}
      </h3>
      <div className="bg-slate-50 p-3 rounded-lg font-mono text-sm border border-slate-200 max-h-48 overflow-y-auto">
        <div className="text-slate-500 font-semibold">{"items: ["}</div>
        {items.map((item) => {
          let icon = "";
          let color = "";
          if (highlight.includes(item.id)) {
            const type = getItemChangeType(item.id, prev, next);
            if (type === "added") {
              icon = "🟢";
              color =
                "bg-emerald-100 border border-emerald-300 text-emerald-800";
            } else if (type === "removed") {
              icon = "🔴";
              color = "bg-red-100 border border-red-300 text-red-800";
            } else if (type === "changed") {
              icon = "🟡";
              color = "bg-amber-100 border border-amber-300 text-amber-800";
            }
          }
          return (
            <div
              key={item.id}
              className={`ml-4 flex items-center gap-2 rounded-lg px-3 py-1 my-1 transition-all ${color}`}
            >
              {icon && <span className="text-lg">{icon}</span>}
              <span className="text-slate-700 text-xs">{`{ id: ${item.id}, name: "${item.name}", selected: ${item.selected} }`}</span>
            </div>
          );
        })}
        <div className="text-slate-500 font-semibold">{"]"}</div>
      </div>
    </div>
  );

  VirtualTree.propTypes = {
    title: PropTypes.string.isRequired,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        selected: PropTypes.bool.isRequired,
      })
    ).isRequired,
    isNew: PropTypes.bool,
    highlight: PropTypes.arrayOf(PropTypes.number),
    prev: PropTypes.array,
    next: PropTypes.array,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 py-6">
      {/* Header */}
      <div className="w-full max-w-7xl mx-auto px-4 mb-6">
        <h1 className="text-4xl font-extrabold mb-2 text-slate-800 tracking-tight text-center flex items-center justify-center gap-3">
          ⚛️ React Virtual DOM
        </h1>
        <p className="text-slate-600 mb-6 text-center text-lg">
          Interactive visualization of React&apos;s rendering process
        </p>

        {/* Controls - Compact Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
            <button
              onClick={() => toggleItem(1)}
              className={`bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow transition-all flex items-center gap-1 text-sm ${
                isProcessActive ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isProcessActive}
            >
              <span>🔄</span> Toggle Apple
            </button>
            <button
              onClick={addItem}
              className={`bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold shadow transition-all flex items-center gap-1 text-sm ${
                isProcessActive ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isProcessActive}
            >
              <span>➕</span> Add Item
            </button>
            <button
              onClick={() => removeItem(items[items.length - 1]?.id)}
              className={`bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold shadow transition-all flex items-center gap-1 text-sm ${
                items.length === 0 || isProcessActive
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              disabled={items.length === 0 || isProcessActive}
            >
              <span>➖</span> Remove Last
            </button>
          </div>

          <div className="flex flex-wrap gap-2 justify-center lg:justify-end">
            <button
              onClick={() => setIsAutoMode((prev) => !prev)}
              className={`px-4 py-2 rounded-lg font-semibold shadow transition-all text-white flex items-center gap-1 text-sm ${
                isAutoMode
                  ? "bg-indigo-500 hover:bg-indigo-600"
                  : "bg-slate-500 hover:bg-slate-600"
              }`}
            >
              <span>{isAutoMode ? "⏩" : "⏸️"}</span>
              {isAutoMode ? "Auto" : "Manual"}
            </button>
            <button
              onClick={nextStep}
              className="px-4 py-2 rounded-lg font-semibold shadow transition-all bg-teal-500 hover:bg-teal-600 text-white flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                !isProcessActive || isAutoMode || step === 0 || step > MAX_STEP
              }
            >
              <span>➡️</span> Next
            </button>
            <button
              onClick={previousStep}
              className="px-4 py-2 rounded-lg font-semibold shadow transition-all bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isProcessActive || isAutoMode || step <= 1}
            >
              <span>⬅️</span> Prev
            </button>
            <button
              onClick={resetProcess}
              className="px-4 py-2 rounded-lg font-semibold shadow transition-all bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isProcessActive}
            >
              <span>⏹️</span> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="w-full max-w-7xl mx-auto px-4 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Component UI */}
        <div className="xl:col-span-1">
          <div
            className={`bg-white rounded-xl shadow-lg border p-4 mb-6 transition-all ${
              renderPhase
                ? "border-amber-300 bg-amber-50"
                : commitPhase
                ? "border-teal-300 bg-teal-50"
                : "border-blue-100"
            }`}
          >
            <h3 className="text-lg font-bold mb-4 text-slate-800 text-center flex items-center justify-center gap-2">
              React Component
              {renderPhase && (
                <span className="text-xs font-normal text-amber-600 bg-amber-100 px-2 py-1 rounded">
                  Render Phase
                </span>
              )}
              {commitPhase && (
                <span className="text-xs font-normal text-teal-600 bg-teal-100 px-2 py-1 rounded">
                  Commit Phase
                </span>
              )}
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border-2 font-medium text-center transition-all shadow-sm text-sm ${
                    item.selected
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-blue-50 border-blue-200 text-slate-700"
                  } ${renderPhase ? "opacity-75" : "opacity-100"}`}
                >
                  {item.name}
                </div>
              ))}
              {/* Show pending changes during render phase */}
              {renderPhase &&
                pendingItems &&
                pendingItems.length > items.length && (
                  <div className="p-3 rounded-lg border-2 border-dashed border-amber-400 font-medium text-center text-sm bg-amber-50 text-amber-700 opacity-60">
                    {pendingItems[pendingItems.length - 1].name} (Pending)
                  </div>
                )}
              {renderPhase &&
                pendingItems &&
                pendingItems.length < items.length && (
                  <div className="p-3 rounded-lg border-2 border-dashed border-red-400 font-medium text-center text-sm bg-red-50 text-red-700 opacity-60">
                    Removing:{" "}
                    {
                      items.find(
                        (item) => !pendingItems.some((p) => p.id === item.id)
                      )?.name
                    }{" "}
                    (Pending)
                  </div>
                )}
            </div>
          </div>

          {/* Process Steps - Compact */}
          <div className="bg-white rounded-xl shadow-lg border border-blue-100 p-4">
            <h3 className="text-lg font-bold mb-3 text-slate-800 text-center">
              Render Process
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: "Trigger", desc: "setState called", color: "blue" },
                { label: "Render", desc: "Create new VDOM", color: "blue" },
                { label: "Reconcile", desc: "Diff & effects", color: "blue" },
                { label: "Commit", desc: "Apply DOM changes", color: "teal" },
                { label: "Effects", desc: "Run useEffect", color: "teal" },
              ].map((stepObj, idx) => (
                <div
                  key={stepObj.label}
                  className={`p-2 rounded-lg text-center text-xs font-medium shadow transition-all border ${
                    step >= idx + 1
                      ? stepObj.color === "blue"
                        ? "bg-blue-50 border-blue-300 text-blue-800"
                        : "bg-teal-50 border-teal-300 text-teal-800"
                      : "bg-white border-slate-200 text-slate-500"
                  }`}
                >
                  <div className="font-bold">{stepObj.label}</div>
                  <div className="text-xs opacity-75">{stepObj.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Fiber Visualization */}
        <div className="xl:col-span-2">
          {showDiff && (
            <div className="space-y-6">
              {/* Fiber Trees - Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Current Fiber Tree */}
                <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-4">
                  <h4 className="text-lg font-bold mb-3 text-blue-800 flex items-center gap-2">
                    <span>🌳</span> Current Fiber Tree
                    {step > 0 && step < 4 && (
                      <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        Reading
                      </span>
                    )}
                    {step === 0 && (
                      <span className="text-xs font-normal text-slate-500 bg-green-100 px-2 py-1 rounded">
                        Ready
                      </span>
                    )}
                  </h4>
                  <div className="bg-slate-50 p-3 rounded-lg font-mono text-xs border border-slate-200 max-h-64 overflow-y-auto">
                    {renderFiberTree(diff.prev, "current")}
                  </div>
                </div>

                {/* Work-in-Progress Fiber Tree */}
                <div className="bg-white rounded-xl shadow-lg border border-purple-200 p-4">
                  <h4 className="text-lg font-bold mb-3 text-purple-800 flex items-center gap-2">
                    <span>🔨</span> Work-in-Progress
                    {step >= 2 && step < 4 && (
                      <span className="text-xs font-normal text-slate-500 bg-amber-100 px-2 py-1 rounded">
                        Building
                      </span>
                    )}
                    {step >= 4 && (
                      <span className="text-xs font-normal text-green-600 bg-green-100 px-2 py-1 rounded">
                        Complete
                      </span>
                    )}
                    {step < 2 && (
                      <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        Waiting
                      </span>
                    )}
                  </h4>
                  <div className="bg-slate-50 p-3 rounded-lg font-mono text-xs border border-slate-200 max-h-64 overflow-y-auto">
                    {step >= 2 ? (
                      renderFiberTree(diff.next, "workInProgress")
                    ) : (
                      <div className="text-slate-400 italic text-center py-8">
                        Not yet created...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Virtual DOM Diff */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <VirtualTree
                  title="Previous Virtual DOM"
                  items={diff.prev}
                  highlight={diff.changedIds.filter((id) =>
                    diff.prev.some((item) => item.id === id)
                  )}
                  prev={diff.prev}
                  next={diff.next}
                />
                <VirtualTree
                  title="New Virtual DOM"
                  items={diff.next}
                  isNew={true}
                  highlight={diff.changedIds.filter((id) =>
                    diff.next.some((item) => item.id === id)
                  )}
                  prev={diff.prev}
                  next={diff.next}
                />
              </div>

              {/* Detailed Fiber Node - Collapsed by default, expandable */}
              <div className="bg-white rounded-xl shadow-lg border border-purple-200 p-4">
                <h4 className="text-lg font-bold mb-3 text-purple-800 flex items-center gap-2">
                  <span>🔍</span> Detailed Fiber Node
                  {step >= 2 && (
                    <span className="text-xs font-normal text-slate-500 bg-green-100 px-2 py-1 rounded">
                      Active
                    </span>
                  )}
                  {step < 2 && (
                    <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      Preview
                    </span>
                  )}
                </h4>
                <div className="bg-slate-900 text-white p-4 rounded-lg border border-slate-700 font-mono text-xs overflow-x-auto max-h-48 overflow-y-auto">
                  <pre>{renderDetailedFiberNode()}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-7xl mx-auto mt-12 mb-6 px-4">
        <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-slate-200">
          <div className="flex items-center justify-center gap-2 text-slate-600 mb-2">
            <span>⚡</span>
            <span className="font-semibold">Powered by</span>
            <a
              href="https://linkedin.com/in/mojanad"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Mahmoud Magdy
            </a>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <span>💼</span>
            <a
              href="https://linkedin.com/in/mojanad"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <span>LinkedIn: @mojanad</span>
              <span className="text-xs">↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualDOMDemo; 