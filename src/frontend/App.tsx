import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

export default function App() {
  const [userFile, setUserFile] = useState<File | null>(null);
  const [exchangeFile, setExchangeFile] = useState<File | null>(null);
  const [runId, setRunId] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [unmatched, setUnmatched] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    timestampTolerance: 300,
    quantityTolerance: 0.01,
  });

  const triggerReconcile = async () => {
    if (!userFile || !exchangeFile) {
      alert('Please upload both CSV files');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userFile', userFile);
      formData.append('exchangeFile', exchangeFile);
      formData.append('timestampTolerance', config.timestampTolerance.toString());
      formData.append('quantityTolerance', config.quantityTolerance.toString());

      const res = await fetch('/reconcile', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Reconciliation failed');

      const data = await res.json();
      setRunId(data.runId);
      setSummary(data.summary);
      setUnmatched(null);
    } catch (err) {
      alert('Error processing reconciliation: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnmatched = async () => {
    if (!runId) return;
    try {
      const res = await fetch(`/report/${runId}/unmatched`);
      const data = await res.json();
      setUnmatched(data);
    } catch (err) {
      alert('Failed to fetch unmatched transactions');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 w-full h-16 bg-white border-b border-gray-200 flex items-center px-6 z-50 justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">R</div>
          <span className="text-xl font-bold tracking-tight">ReconEngine</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
          <span>Status: <span className="text-green-500">Online</span></span>
        </div>
      </nav>

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 pt-20 h-full fixed left-0">
        <div className="px-4 space-y-1">
          <SidebarItem icon="📊" label="Dashboard" active />
          <SidebarItem icon="📁" label="Report History" />
          <SidebarItem icon="⚙️" label="Global Settings" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pt-16 pl-64 h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto py-12 px-8">

          {!runId && !loading && (
            <div className="flex flex-col items-center justify-center space-y-12 py-10">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">Start Reconciliation</h2>
                <p className="text-gray-500">Upload your transaction CSVs to begin the process</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                <FileUpload
                  label="User Transactions"
                  file={userFile}
                  onChange={setUserFile}
                  description="Export from your local records"
                />
                <FileUpload
                  label="Exchange Transactions"
                  file={exchangeFile}
                  onChange={setExchangeFile}
                  description="Export from the exchange"
                />
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 w-full max-w-md space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Time Tol (s)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={config.timestampTolerance}
                      onChange={(e) => setConfig({...config, timestampTolerance: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Qty Tol (%)</label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={config.quantityTolerance}
                      onChange={(e) => setConfig({...config, quantityTolerance: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <button
                  onClick={triggerReconcile}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Reconcile Now
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-full py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-gray-500 font-medium">Processing reconciliation and flagging rows...</p>
            </div>
          )}

          {runId && !loading && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold">Reconciliation Result</h2>
                  <p className="text-gray-500">Run ID: {runId}</p>
                </div>
                <a
                  href={`/report/${runId}`}
                  className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                  download
                >
                  <span>Download Report</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </a>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <ResultCard label="Matched" value={summary?.matched} color="text-green-600" bg="bg-green-50" border="border-green-100" />
                <ResultCard label="Conflicting" value={summary?.conflicting} color="text-amber-600" bg="bg-amber-50" border="border-amber-100" />
                <ResultCard label="User Only" value={summary?.unmatchedUser} color="text-red-600" bg="bg-red-50" border="border-red-100" />
                <ResultCard label="Exchange Only" value={summary?.unmatchedExchange} color="text-red-600" bg="bg-red-50" border="border-red-100" />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg">Unmatched Transactions</h3>
                  <button
                    onClick={fetchUnmatched}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Load Details
                  </button>
                </div>
                <div className="p-0">
                  {unmatched ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                          <tr>
                            <th className="px-6 py-3">Source</th>
                            <th className="px-6 py-3">Asset</th>
                            <th className="px-6 py-3">Quantity</th>
                            <th className="px-6 py-3">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {unmatched.unmatchedUser.map((tx: any) => <TxRow key={tx._id} tx={tx} source="User" />)}
                          {unmatched.unmatchedExchange.map((tx: any) => <TxRow key={tx._id} tx={tx} source="Exchange" />)}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-400 italic">No data loaded. Click "Load Details" to inspect.</div>
                  )}
                </div>
              </div>

              <button
                onClick={() => { setRunId(''); setSummary(null); setUnmatched(null); }}
                className="text-sm text-gray-400 hover:text-gray-600 underline transition-colors"
              >
                Start new reconciliation
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: string, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all ${active ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-gray-500 hover:bg-gray-100'}`}>
      <span>{icon}</span>
      <span className="text-sm">{label}</span>
    </div>
  );
}

function FileUpload({ label, file, onChange, description }: { label: string, file: File | null, onChange: (f: File | null) => void, description: string }) {
  return (
    <div className="flex flex-col items-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-indigo-300 transition-all group">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-50 transition-colors">
        <svg className="w-6 h-6 text-gray-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.//8 0 4 4 0 018 0v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 12v4m0 0l2-2m-2 2l-2-2" /></svg>
      </div>
      <span className="font-bold text-sm mb-1">{label}</span>
      <span className="text-xs text-gray-400 mb-4 text-center">{description}</span>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="hidden"
        id={`file-${label}`}
      />
      <label
        htmlFor={`file-${label}`}
        className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${file ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-900 text-white hover:bg-black'}`}
      >
        {file ? '✓ File Selected' : 'Choose CSV'}
      </label>
      {file && <span className="mt-2 text-[10px] text-gray-400 truncate max-w-full">{file.name}</span>}
    </div>
  );
}

function ResultCard({ label, value, color, bg, border }: { label: string, value: number, color: string, bg: string, border: string }) {
  return (
    <div className={`p-6 rounded-2xl border ${border} ${bg} transition-all hover:scale-105 cursor-default`}>
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-black ${color}`}>{value || 0}</div>
    </div>
  );
}

function TxRow({ tx, source }: { tx: any, source: string }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 text-xs font-bold uppercase tracking-tighter text-gray-400">{source}</td>
      <td className="px-6 py-4 text-sm font-medium text-gray-900">{tx.asset}</td>
      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{tx.quantity}</td>
      <td className="px-6 py-4 text-sm text-gray-500">{new Date(tx.timestamp).toLocaleString()}</td>
    </tr>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
