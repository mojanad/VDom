import { useEffect, useState } from "react";
import PropTypes from "prop-types";

// Add prop types for VirtualTree (for linter)
/**
 * @typedef {Object} VirtualTreeProps
 * @property {string} title
 * @property {Array<{id: number, name: string, selected: boolean}>} items
 * @property {boolean} [isNew]
 * @property {number[]} [highlight]
 */

const VirtualDOMDemo = () => {
  const [items, setItems] = useState([
    { id: 1, name: "Apple", selected: false },
    { id: 2, name: "Banana", selected: false },
    { id: 3, name: "Cherry", selected: false },
  ]);
  const [pendingItems, setPendingItems] = useState(null); // Hold next state until commit

  const [showDiff, setShowDiff] = useState(false);
  const [step, setStep] = useState(0);
  const [renderPhase, setRenderPhase] = useState(false);
  const [commitPhase, setCommitPhase] = useState(false);
  const [diff, setDiff] = useState({
    prev: items,
    next: items,
    changedIds: [],
  });
  const [showCodeExample, setShowCodeExample] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [isProcessActive, setIsProcessActive] = useState(false);

  const MAX_STEP = 5;

  // Utility: Find changed item ids between two arrays
  function getChangedIds(prev, next) {
    const prevMap = new Map(prev.map((item) => [item.id, item]));
    const nextMap = new Map(next.map((item) => [item.id, item]));
    const changed = [];
    // Added or toggled
    for (const item of next) {
      if (!prevMap.has(item.id)) {
        changed.push(item.id); // Added
      } else if (prevMap.get(item.id).selected !== item.selected) {
        changed.push(item.id); // Toggled
      }
    }
    // Removed
    for (const item of prev) {
      if (!nextMap.has(item.id)) {
        changed.push(item.id);
      }
    }
    return changed;
  }

  // --- Step Control Logic ---
  function startProcess(diffObj) {
    setDiff(diffObj);
    setShowDiff(true);
    setStep(1);
    setRenderPhase(true);
    setCommitPhase(false);
    setIsProcessActive(true);
    setPendingItems(diffObj.next); // Set pending items for commit phase
    // Don't update items state here - keep showing current state until commit
  }

  function nextStep() {
    setStep((prev) => {
      const next = prev + 1;
      if (next === 4) {
        setRenderPhase(false);
        setCommitPhase(true);
        // Commit the pending items to the UI only at step 4
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
        // Going back from commit phase to render phase
        setCommitPhase(false);
        setRenderPhase(true);
        // Revert to previous state and restore pending items
        if (diff.prev && diff.next) {
          setItems(diff.prev);
          setPendingItems(diff.next);
        }
      }
      return next;
    });
  }

  function resetProcess() {
    setShowDiff(false);
    setCommitPhase(false);
    setRenderPhase(false);
    setStep(0);
    setIsProcessActive(false);
    setPendingItems(null);
  }

  // Handle auto mode progression
  useEffect(() => {
    if (!isProcessActive || !isAutoMode) return;
    if (step === 0 || step > MAX_STEP) return;
    const timer = setTimeout(() => nextStep(), 800);
    return () => clearTimeout(timer);
  }, [step, isAutoMode, isProcessActive]);

  // --- Item Actions ---
  const toggleItem = (id) => {
    if (isProcessActive) return; // Prevent actions during active process
    
    const nextItems = items.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    );
    startProcess({
      prev: items,
      next: nextItems,
      changedIds: getChangedIds(items, nextItems)
    });
  };

  // --- Diff Visualization Helpers ---
  function getItemChangeType(id, prev, next) {
    const inPrev = prev.some(item => item.id === id);
    const inNext = next.some(item => item.id === id);
    if (!inPrev && inNext) return 'added';
    if (inPrev && !inNext) return 'removed';
    if (inPrev && inNext) return 'changed';
    return null;
  }

  const addItem = () => {
    if (isProcessActive) return; // Prevent actions during active process
    
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
    if (isProcessActive) return; // Prevent actions during active process
    
    const nextItems = items.filter((item) => item.id !== id);
    startProcess({
      prev: items,
      next: nextItems,
      changedIds: getChangedIds(items, nextItems),
    });
  };

  // Manual step: reset when process ends
  useEffect(() => {
    if (step > MAX_STEP) resetProcess();
  }, [step]);

  /**
   * @param {VirtualTreeProps} props
   */
  const VirtualTree = ({ title, items, isNew = false, highlight = [], prev = [], next = [] }) => (
    <div
      className={`p-5 border-2 rounded-xl shadow-lg bg-white ${
        isNew ? 'border-teal-300 shadow-teal-100' : 'border-blue-300 shadow-blue-100'
      }`}
    >
      <h3 className="font-bold mb-3 text-center text-slate-700 flex items-center justify-center gap-2 text-lg">
        {isNew ? '🆕' : '📦'} {title}
      </h3>
      <div className="bg-slate-50 p-4 rounded-lg font-mono text-sm border border-slate-200">
        <div className="text-slate-500 font-semibold">{'items: ['}</div>
        {items.map(item => {
          let icon = '';
          let color = '';
          if (highlight.includes(item.id)) {
            const type = getItemChangeType(item.id, prev, next);
            if (type === 'added') {
              icon = '🟢';
              color = 'bg-emerald-100 border border-emerald-300 text-emerald-800';
            } else if (type === 'removed') {
              icon = '🔴';
              color = 'bg-red-100 border border-red-300 text-red-800';
            } else if (type === 'changed') {
              icon = '🟡';
              color = 'bg-amber-100 border border-amber-300 text-amber-800';
            }
          }
          return (
            <div
              key={item.id}
              className={`ml-4 flex items-center gap-2 rounded-lg px-3 py-2 my-1 transition-all ${color}`}
            >
              {icon && <span className="text-lg">{icon}</span>}
              <span className="text-slate-700">{`{ id: ${item.id}, name: "${item.name}", selected: ${item.selected} }`}</span>
            </div>
          );
        })}
        <div className="text-slate-500 font-semibold">{']'}</div>
      </div>
    </div>
  );

  VirtualTree.propTypes = {
    title: PropTypes.string.isRequired,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        selected: PropTypes.bool.isRequired
      })
    ).isRequired,
    isNew: PropTypes.bool,
    highlight: PropTypes.arrayOf(PropTypes.number),
    prev: PropTypes.array,
    next: PropTypes.array,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex flex-col items-center py-10">
      <div className="w-full max-w-6xl mx-auto p-8 rounded-2xl shadow-xl bg-white border border-blue-100 mb-10">
        <h1 className="text-5xl font-extrabold mb-3 text-slate-800 tracking-tight text-center flex items-center justify-center gap-3">
          ⚛️ Virtual DOM Visualization
        </h1>
        <p className="text-slate-600 mb-8 text-center text-xl font-medium">
          Click buttons to see how React&apos;s Virtual DOM works behind the scenes
        </p>
        
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <button
            onClick={() => toggleItem(1)}
            className={`bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:ring-blue-200 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all flex items-center gap-2 hover:shadow-xl ${isProcessActive ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isProcessActive}
          >
            <span>🔄</span> Toggle Apple
          </button>
          <button
            onClick={addItem}
            className={`bg-emerald-500 hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-200 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all flex items-center gap-2 hover:shadow-xl ${isProcessActive ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isProcessActive}
          >
            <span>➕</span> Add Item
          </button>
          <button
            onClick={() => removeItem(items[items.length - 1]?.id)}
            className={`bg-red-500 hover:bg-red-600 focus:ring-4 focus:ring-red-200 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all flex items-center gap-2 hover:shadow-xl ${(items.length === 0 || isProcessActive) ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={items.length === 0 || isProcessActive}
          >
            <span>➖</span> Remove Last
          </button>
        </div>
        
        {/* Stepper Controls */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <button
            onClick={() => setIsAutoMode((prev) => !prev)}
            className={`px-6 py-3 rounded-xl font-semibold shadow-lg transition-all text-white focus:ring-4 flex items-center gap-2 hover:shadow-xl ${
              isAutoMode 
                ? 'bg-indigo-500 hover:bg-indigo-600 focus:ring-indigo-200' 
                : 'bg-slate-500 hover:bg-slate-600 focus:ring-slate-200'
            }`}
          >
            <span>{isAutoMode ? '⏩' : '⏸️'}</span> 
            {isAutoMode ? 'Switch to Manual' : 'Switch to Auto'}
          </button>
          <button
            onClick={nextStep}
            className="px-6 py-3 rounded-xl font-semibold shadow-lg transition-all bg-teal-500 hover:bg-teal-600 text-white focus:ring-4 focus:ring-teal-200 flex items-center gap-2 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isProcessActive || isAutoMode || step === 0 || step > MAX_STEP}
          >
            <span>➡️</span> Next Step
          </button>
          <button
            onClick={previousStep}
            className="px-6 py-3 rounded-xl font-semibold shadow-lg transition-all bg-amber-500 hover:bg-amber-600 text-white focus:ring-4 focus:ring-amber-200 flex items-center gap-2 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isProcessActive || isAutoMode || step <= 1}
          >
            <span>⬅️</span> Previous Step
          </button>
          <button
            onClick={resetProcess}
            className="px-6 py-3 rounded-xl font-semibold shadow-lg transition-all bg-red-500 hover:bg-red-600 text-white focus:ring-4 focus:ring-red-200 flex items-center gap-2 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isProcessActive}
          >
            <span>⏹️</span> Reset
          </button>
        </div>
      </div>

      {/* Actual UI */}
      <div className="w-full max-w-4xl mx-auto mb-10">
        <h2 className="text-3xl font-bold mb-6 text-slate-800 text-center">Your React Component</h2>
        <div className="border-2 border-blue-200 rounded-xl p-6 bg-white shadow-lg">
          <div className="item-list grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-lg border-2 font-medium text-center transition-all shadow-sm hover:shadow-md ${
                  item.selected 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                    : 'bg-blue-50 border-blue-200 text-slate-700'
                }`}
              >
                {item.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Process Steps */}
      <div className="w-full max-w-6xl mx-auto mb-10">
        <h2 className="text-3xl font-bold mb-8 text-slate-800 text-center">
          React&apos;s Two-Phase Rendering Process
        </h2>
        
        {/* Phase Headers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className={`p-8 rounded-xl text-center border-2 shadow-lg transition-all ${
            renderPhase 
              ? 'bg-blue-50 border-blue-400 shadow-blue-200 scale-105' 
              : 'bg-white border-blue-200 shadow-slate-200'
          }`}> 
            <div className="text-4xl mb-3">🧠</div>
            <div className="font-bold text-2xl text-blue-700 mb-2">RENDER PHASE</div>
            <div className="text-lg text-slate-600">Pure, interruptible computation</div>
          </div>
          <div className={`p-8 rounded-xl text-center border-2 shadow-lg transition-all ${
            commitPhase 
              ? 'bg-teal-50 border-teal-400 shadow-teal-200 scale-105' 
              : 'bg-white border-teal-200 shadow-slate-200'
          }`}> 
            <div className="text-4xl mb-3">💥</div>
            <div className="font-bold text-2xl text-teal-700 mb-2">COMMIT PHASE</div>
            <div className="text-lg text-slate-600">Synchronous DOM updates & effects</div>
          </div>
        </div>
        
        {/* Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
          {[
            { label: 'Trigger', desc: 'setState called', color: 'blue' },
            { label: 'Render', desc: 'Create new VDOM', color: 'blue' },
            { label: 'Reconcile', desc: 'Diff & create effects', color: 'blue' },
            { label: 'Commit', desc: 'Apply DOM changes', color: 'teal' },
            { label: 'Effects', desc: 'Run useEffect, refs', color: 'teal' },
          ].map((stepObj, idx) => (
            <div
              key={stepObj.label}
              className={`p-4 rounded-xl text-center text-sm font-medium shadow-lg transition-all border-2 ${
                step >= idx + 1
                  ? stepObj.color === 'blue'
                    ? 'bg-blue-50 border-blue-400 shadow-blue-200'
                    : 'bg-teal-50 border-teal-400 shadow-teal-200'
                  : 'bg-white border-slate-200 shadow-slate-200'
              }`}
            >
              <div className="text-2xl mb-2">
                {idx === 0 ? '1️⃣' : idx === 1 ? '2️⃣' : idx === 2 ? '3️⃣' : idx === 3 ? '4️⃣' : '5️⃣'}
              </div>
              <div className="font-bold text-slate-800 mb-1">{stepObj.label}</div>
              <div className="text-xs text-slate-500">{stepObj.desc}</div>
            </div>
          ))}
        </div>
        {/* Detailed Phase Information */}
        {step === 1 && (
          <div className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-lg">
            <h3 className="font-bold mb-3 text-blue-800 text-xl flex items-center gap-2">
              <span>🚀</span> Step 1: Trigger
            </h3>
            <ul className="text-base space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span><strong className="text-blue-700">setState</strong> is called (e.g., user interaction)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>React schedules an update</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Starts the render phase</span>
              </li>
            </ul>
          </div>
        )}
        {step === 2 && (
          <div className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-lg">
            <h3 className="font-bold mb-3 text-blue-800 text-xl flex items-center gap-2">
              <span>⚙️</span> Step 2: Render
            </h3>
            <ul className="text-base space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>React calls your component functions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Runs <strong className="text-blue-700">useState</strong>, <strong className="text-blue-700">useMemo</strong>, etc.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Builds a new Virtual DOM tree</span>
              </li>
            </ul>
          </div>
        )}
        {step === 3 && (
          <div className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-lg">
            <h3 className="font-bold mb-3 text-blue-800 text-xl flex items-center gap-2">
              <span>🔍</span> Step 3: Reconcile
            </h3>
            <ul className="text-base space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>React compares new and previous Virtual DOM</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Determines what changed (diffing)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Prepares a list of DOM updates</span>
              </li>
            </ul>
          </div>
        )}
        {step === 4 && (
          <div className="mb-8 p-6 bg-teal-50 border-2 border-teal-200 rounded-xl shadow-lg">
            <h3 className="font-bold mb-3 text-teal-800 text-xl flex items-center gap-2">
              <span>💾</span> Step 4: Commit
            </h3>
            <ul className="text-base space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <span>React applies changes to the real DOM</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <span>Runs layout effects (<strong className="text-teal-700">useLayoutEffect</strong>)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <span>Updates refs</span>
              </li>
            </ul>
          </div>
        )}
        {step === 5 && (
          <div className="mb-8 p-6 bg-teal-50 border-2 border-teal-200 rounded-xl shadow-lg">
            <h3 className="font-bold mb-3 text-teal-800 text-xl flex items-center gap-2">
              <span>✨</span> Step 5: Effects
            </h3>
            <ul className="text-base space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <span>React runs passive effects (<strong className="text-teal-700">useEffect</strong>)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <span>Finalizes the update cycle</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <span>UI is now fully updated</span>
              </li>
            </ul>
          </div>
        )}

        {/* Virtual DOM Diff Visualization */}
        {showDiff && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <VirtualTree
              title="Previous Virtual DOM"
              items={diff.prev}
              highlight={diff.changedIds.filter(id => diff.prev.some(item => item.id === id))}
              prev={diff.prev}
              next={diff.next}
            />
            <VirtualTree
              title="New Virtual DOM"
              items={diff.next}
              isNew={true}
              highlight={diff.changedIds.filter(id => diff.next.some(item => item.id === id))}
              prev={diff.prev}
              next={diff.next}
            />
          </div>
        )}

        {step >= 3 && step < 4 && (
          <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-lg">
            <h3 className="font-bold mb-3 text-blue-800 text-xl flex items-center gap-2">
              <span>🔍</span> Reconciliation Complete (End of Render Phase):
            </h3>
            <ul className="text-base space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Diffing algorithm found changes in highlighted elements</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Created a <strong className="text-blue-700">&quot;fiber&quot;</strong> tree with update instructions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Generated list of DOM operations needed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>Ready to commit changes to real DOM</span>
              </li>
            </ul>
          </div>
        )}

        {step >= 4 && (
          <div className="mt-8 p-6 bg-teal-50 border-2 border-teal-200 rounded-xl shadow-lg">
            <h3 className="font-bold mb-3 text-teal-800 text-xl flex items-center gap-2">
              <span>✅</span> Commit Phase Active:
            </h3>
            <ul className="text-base space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <span>DOM mutations applied synchronously</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <span>Component lifecycle methods executed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <span>useEffect callbacks scheduled</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <span>Refs updated with new DOM nodes</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Code Example Toggle Button */}
      <div className="w-full max-w-6xl mx-auto mb-8">
        <div className="text-center">
          <button
            onClick={() => setShowCodeExample((prev) => !prev)}
            className="bg-slate-600 hover:bg-slate-700 focus:ring-4 focus:ring-slate-200 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all flex items-center gap-2 mx-auto hover:shadow-xl"
          >
            <span>{showCodeExample ? '📖' : '💻'}</span>
            {showCodeExample ? 'Hide Code Example' : 'Show Code Example'}
          </button>
        </div>
      </div>

      {/* Code Example */}
      {showCodeExample && (
        <div className="w-full max-w-6xl mx-auto mb-10">
          <div className="bg-slate-800 text-white p-8 rounded-xl shadow-xl border border-slate-700">
            <h3 className="text-2xl font-semibold mb-6 text-slate-200 flex items-center gap-2">
              <span>💻</span> Two-Phase Rendering in Code:
            </h3>
            <pre className="text-sm overflow-x-auto bg-slate-900 p-6 rounded-lg border border-slate-600">
              <code className="text-slate-200">{`// RENDER PHASE (Interruptible, Pure)
function MyComponent() {
  const [count, setCount] = useState(0);
  
  // This runs during render phase
  const expensiveValue = useMemo(() => {
    return heavyCalculation(count);
  }, [count]);
  
  // Component renders - creates Virtual DOM
  return <div>{count}: {expensiveValue}</div>;
}

// COMMIT PHASE (Synchronous, Side Effects)
function MyComponent() {
  const [count, setCount] = useState(0);
  const divRef = useRef(null);
  
  // This runs during commit phase
  useEffect(() => {
    // DOM is updated, can measure/manipulate
    divRef.current.scrollIntoView();
    document.title = \`Count: \${count}\`;
  }, [count]);
  
  // This also runs during commit phase
  useLayoutEffect(() => {
    // Synchronous DOM measurements
    const height = divRef.current.offsetHeight;
    console.log('Height:', height);
  }, [count]);
  
  return <div ref={divRef}>{count}</div>;
}`}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Phase Comparison */}
      <div className="w-full max-w-6xl mx-auto mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 shadow-lg">
            <h3 className="font-bold mb-4 text-blue-800 text-xl flex items-center gap-2">
              <span>🧠</span> Render Phase
            </h3>
            <div className="text-base space-y-3 text-slate-700">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <div><strong className="text-blue-700">Can be interrupted:</strong> React can pause and resume</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <div><strong className="text-blue-700">May run multiple times:</strong> Same component might render twice</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <div><strong className="text-blue-700">Pure functions only:</strong> No side effects allowed</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <div><strong className="text-blue-700">Hooks that run:</strong> useState, useMemo, useCallback</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <div><strong className="text-blue-700">Purpose:</strong> Figure out what changed</div>
              </div>
            </div>
          </div>
          
          <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-6 shadow-lg">
            <h3 className="font-bold mb-4 text-teal-800 text-xl flex items-center gap-2">
              <span>💥</span> Commit Phase
            </h3>
            <div className="text-base space-y-3 text-slate-700">
              <div className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <div><strong className="text-teal-700">Cannot be interrupted:</strong> Runs synchronously</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <div><strong className="text-teal-700">Runs exactly once:</strong> No duplicate executions</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <div><strong className="text-teal-700">Side effects allowed:</strong> DOM manipulation, API calls</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <div><strong className="text-teal-700">Hooks that run:</strong> useEffect, useLayoutEffect</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <div><strong className="text-teal-700">Purpose:</strong> Apply changes to real DOM</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-6xl mx-auto mt-16 mb-6">
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
