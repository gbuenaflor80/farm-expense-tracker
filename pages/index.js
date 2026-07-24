import { useState } from 'react';
import Head from 'next/head';

const CATS = [
  'Revenue',
  'Software & Subscriptions',
  'Facility & Training Space',
  'Payroll & Taxes',
  'Insurance & Benefits',
  'Training Equipment & Supplies',
  'Marketing & Admin',
  'Fuel & Transport',
  'Meals & Client Meetings',
  'Debt & Loan Payments',
  "Owner's Draw",
  'Business Transfer',
  'Professional Services',
  'Personal',
  'Other'
];

const BIZ_CATS = new Set([
  'Software & Subscriptions',
  'Facility & Training Space',
  'Payroll & Taxes',
  'Insurance & Benefits',
  'Training Equipment & Supplies',
  'Marketing & Admin',
  'Fuel & Transport',
  'Meals & Client Meetings',
  'Professional Services',
  'Other'
]);

const REV_CATS = new Set(['Revenue']);

const CAT_COLORS = {
  'Revenue': '#15803D',
  'Software & Subscriptions': '#534AB7',
  'Facility & Training Space': '#185FA5',
  'Payroll & Taxes': '#3B6D11',
  'Insurance & Benefits': '#0F6E56',
  'Training Equipment & Supplies': '#854F0B',
  'Marketing & Admin': '#993C1D',
  'Fuel & Transport': '#5F5E5A',
  'Meals & Client Meetings': '#BA7517',
  'Debt & Loan Payments': '#888780',
  "Owner's Draw": '#888780',
  'Business Transfer': '#888780',
  'Professional Services': '#633806',
  'Personal': '#888780',
  'Other': '#888780'
};

const SAMPLE = [
  {date:'06/01/2026',desc:'ZELLE FROM J SMITH',amount:200.00,direction:'credit',cat:'Revenue',isBiz:false,isRevenue:true},
  {date:'06/02/2026',desc:'SQUARE DEPOSIT',amount:450.00,direction:'credit',cat:'Revenue',isBiz:false,isRevenue:true},
  {date:'06/01/2026',desc:'REPLIT INC',amount:50.51,direction:'debit',cat:'Software & Subscriptions',isBiz:true,isRevenue:false},
  {date:'06/02/2026',desc:'GUSTO FEE',amount:88.00,direction:'debit',cat:'Payroll & Taxes',isBiz:true,isRevenue:false},
  {date:'06/02/2026',desc:'PAYMENTS Sportrock Sterling',amount:160.00,direction:'debit',cat:'Facility & Training Space',isBiz:true,isRevenue:false},
  {date:'06/03/2026',desc:'STARBUCKS STORE 07387 Sterling',amount:3.34,direction:'debit',cat:'Meals & Client Meetings',isBiz:true,isRevenue:false},
  {date:'06/04/2026',desc:'Deposit Axos Bank',amount:2000.00,direction:'credit',cat:'Business Transfer',isBiz:false,isRevenue:false},
  {date:'06/08/2026',desc:'AMAZON.COM',amount:28.61,direction:'debit',cat:'Training Equipment & Supplies',isBiz:true,isRevenue:false},
  {date:'06/09/2026',desc:'ANTHROPIC CLAUDE SUB',amount:20.00,direction:'debit',cat:'Software & Subscriptions',isBiz:true,isRevenue:false},
  {date:'06/09/2026',desc:'AUTOPAYBUS CHASE CREDIT CRD',amount:1000.00,direction:'debit',cat:'Debt & Loan Payments',isBiz:false,isRevenue:false},
  {date:'06/15/2026',desc:'NEXT INSUR GEN L',amount:18.33,direction:'debit',cat:'Insurance & Benefits',isBiz:true,isRevenue:false},
  {date:'06/15/2026',desc:'SHEETZ 2666 Sterling',amount:51.36,direction:'debit',cat:'Fuel & Transport',isBiz:true,isRevenue:false},
  {date:'06/16/2026',desc:'ZELLE FROM M GARCIA',amount:320.00,direction:'credit',cat:'Revenue',isBiz:false,isRevenue:true},
  {date:'06/23/2026',desc:'HEALTHEQUITY INC',amount:100.00,direction:'debit',cat:'Insurance & Benefits',isBiz:true,isRevenue:false},
  {date:'06/29/2026',desc:'GUSTO TAX',amount:468.61,direction:'debit',cat:'Payroll & Taxes',isBiz:true,isRevenue:false},
  {date:'06/29/2026',desc:'GUSTO NET PAYROLL',amount:2222.64,direction:'debit',cat:'Payroll & Taxes',isBiz:true,isRevenue:false},
];

async function callClaude(body) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'API error ' + res.status); }
  return res.json();
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = () => rej(new Error('Could not read file'));
    r.readAsDataURL(file);
  });
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const hdr = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
  const di = hdr.findIndex(h => h.includes('date'));
  const xi = hdr.findIndex(h => ['desc','merchant','memo','name','payee','narration','description'].some(k => h.includes(k)));
  const debitIdx = hdr.findIndex(h => ['debit', 'withdrawal', 'charge'].some(k => h.includes(k)) && !h.includes('credit'));
  const creditIdx = hdr.findIndex(h => ['credit', 'deposit'].some(k => h.includes(k)));
  const amtIdx = hdr.findIndex(h => h.includes('amount'));
  if (di < 0) return null;
  const out = [];
  lines.slice(1).forEach((line, i) => {
    const cols = line.match(/("[^"]*"|[^,]+)(?=,|$)/g) || line.split(',');
    const c = n => (cols[n] || '').replace(/"/g, '').trim();

    let amount = 0, direction = null;

    if (debitIdx >= 0 || creditIdx >= 0) {
      const dVal = debitIdx >= 0 ? parseFloat(c(debitIdx).replace(/[$,\s()]/g, '')) : NaN;
      const cVal = creditIdx >= 0 ? parseFloat(c(creditIdx).replace(/[$,\s()]/g, '')) : NaN;
      if (!isNaN(dVal) && dVal > 0) { amount = dVal; direction = 'debit'; }
      else if (!isNaN(cVal) && cVal > 0) { amount = cVal; direction = 'credit'; }
    }

    if (direction === null && amtIdx >= 0) {
      const rawStr = c(amtIdx).replace(/[$,\s]/g, '');
      const isNeg = rawStr.includes('(') || rawStr.startsWith('-');
      const val = parseFloat(rawStr.replace(/[()\-]/g, ''));
      if (!isNaN(val) && val !== 0) { amount = val; direction = isNeg ? 'debit' : 'credit'; }
    }

    if (direction && amount > 0) {
      out.push({
        id: i, date: c(di), desc: c(xi >= 0 ? xi : 1), amount, direction,
        cat: direction === 'credit' ? 'Revenue' : 'Other',
        isBiz: false,
        isRevenue: direction === 'credit'
      });
    }
  });
  return out.length ? out : null;
}

async function categorize(rows, setTxns, setCatMsg) {
  const BATCH = 20;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    setCatMsg(`Categorizing ${i + 1}–${Math.min(i + BATCH, rows.length)} of ${rows.length}...`);
    const payload = slice.map(t => `${t.id}|${t.direction}|${t.desc}|$${t.amount}`).join('\n');
    try {
      const data = await callClaude({
        model: 'claude-sonnet-5', max_tokens: 800,
        system: `You categorize bank transactions for a personal fitness training business called Kinect Fitness & Recovery. Each line is: id|direction|description|amount, where direction is "debit" (money out) or "credit" (money in). Categories: ${CATS.join(', ')}.
Rules:
- credit transactions that look like client payments (Zelle, Venmo, CashApp, Square, Stripe, checks, personal names paying in) → Revenue
- credit transactions that are transfers between the owner's own accounts (e.g. Axos, other bank names, "transfer", "deposit" from another owned account) → Business Transfer
- Replit, Anthropic, Claude, software tools → Software & Subscriptions
- Sportrock, gym facilities, training venues → Facility & Training Space
- Gusto payroll, wages, tax payments → Payroll & Taxes
- HealthEquity, insurance, NEXT INSUR → Insurance & Benefits
- Amazon, training gear, equipment → Training Equipment & Supplies
- Starbucks (client meetings/admin work) → Meals & Client Meetings
- Wawa, Sheetz, fuel stations → Fuel & Transport
- AMEX payment, Chase payment → Debt & Loan Payments
- SoFi transfer → Owner's Draw (owner equity distribution, not a business expense)
- Axos → Business Transfer (transfer to a separate business savings account, not a business expense)
- Personal items → Personal
Return ONLY JSON like {"0":"Software & Subscriptions"}. Nothing else.`,
        messages: [{ role: 'user', content: `Categorize:\n${payload}` }]
      });
      const raw = data.content?.find(b => b.type === 'text')?.text || '{}';
      const cats = JSON.parse(raw.replace(/```json|```/g, '').trim());
      setTxns(prev => prev.map(t => {
        const cat = cats[String(t.id)];
        return cat && CATS.includes(cat)
          ? { ...t, cat, isBiz: BIZ_CATS.has(cat), isRevenue: REV_CATS.has(cat) }
          : t;
      }));
    } catch (e) { console.error('Cat error', e); }
  }
  setCatMsg('');
}

export default function KinectTracker() {
  const [txns, setTxns] = useState([]);
  const [screen, setScreen] = useState('upload');
  const [procTitle, setProcTitle] = useState('');
  const [procSub, setProcSub] = useState('');
  const [procPct, setProcPct] = useState(0);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statFilter, setStatFilter] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [catMsg, setCatMsg] = useState('');

  const reset = () => { setTxns([]); setScreen('upload'); setError(''); setSearch(''); setCatFilter(''); setStatFilter(''); };

  const handleFile = async (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    const isPDF = name.endsWith('.pdf') || file.type === 'application/pdf';
    const isCSV = name.endsWith('.csv') || file.type.includes('csv') || file.type.includes('text');
    if (!isPDF && !isCSV) { setError('Please upload a CSV or PDF file.'); return; }
    setError('');
    setFileName(file.name);
    setFileType(isPDF ? 'PDF' : 'CSV');
    if (isPDF) {
      setScreen('processing'); setProcTitle('Reading PDF...'); setProcSub('Claude is extracting your transactions — takes 10-20 seconds'); setProcPct(20);
      try {
        const b64 = await fileToBase64(file);
        setProcPct(40);
        const data = await callClaude({
          model: 'claude-sonnet-5', max_tokens: 4000,
          system: 'You read bank statements. Extract every transaction — both debits (purchases/withdrawals) and credits (deposits/incoming payments). Return ONLY a JSON array. Each object: date (string as shown), desc (clean merchant/payer name), amount (positive number), direction ("debit" or "credit"). Skip balance rows and interest.',
          messages: [{ role: 'user', content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
            { type: 'text', text: 'Extract all transactions (debits and credits) as a JSON array.' }
          ]}]
        });
        const raw = data.content?.find(b => b.type === 'text')?.text || '[]';
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
        const extracted = parsed.filter(t => t.amount > 0 && t.desc).map((t, i) => {
          const direction = t.direction === 'credit' ? 'credit' : 'debit';
          return {
            id: i, date: String(t.date || ''), desc: String(t.desc || ''),
            amount: parseFloat(t.amount) || 0, direction,
            cat: direction === 'credit' ? 'Revenue' : 'Other',
            isBiz: false,
            isRevenue: direction === 'credit'
          };
        });
        if (!extracted.length) { setError('No transactions found. Make sure this is a digital PDF from your bank.'); setScreen('upload'); return; }
        setTxns(extracted);
        setScreen('app');
        await categorize(extracted, setTxns, setCatMsg);
      } catch (e) { setError('Could not process PDF: ' + e.message); setScreen('upload'); }
    } else {
      setScreen('processing'); setProcTitle('Reading CSV...'); setProcSub('Parsing transactions...'); setProcPct(30);
      try {
        const text = await file.text();
        const rows = parseCSV(text);
        if (!rows || !rows.length) { setError('Could not find transactions. Check your CSV has Date, Description, and Amount columns.'); setScreen('upload'); return; }
        setTxns(rows);
        setScreen('app');
        await categorize(rows, setTxns, setCatMsg);
      } catch (e) { setError('Error reading CSV: ' + e.message); setScreen('upload'); }
    }
  };

  const toggle = id => setTxns(prev => prev.map(t => {
    if (t.id !== id) return t;
    return t.direction === 'credit' ? { ...t, isRevenue: !t.isRevenue } : { ...t, isBiz: !t.isBiz };
  }));

  const updateCat = (id, cat) => setTxns(prev => prev.map(t =>
    t.id === id ? { ...t, cat, isBiz: BIZ_CATS.has(cat), isRevenue: REV_CATS.has(cat) } : t
  ));

  const filtered = txns.filter(t => {
    if (search && !t.desc.toLowerCase().includes(search.toLowerCase()) && !t.cat.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter && t.cat !== catFilter) return false;
    if (statFilter === 'b' && !t.isBiz) return false;
    if (statFilter === 'r' && !t.isRevenue) return false;
    if (statFilter === 'x' && (t.isBiz || t.isRevenue)) return false;
    return true;
  });

  const markAll = include => setTxns(prev => prev.map(t => {
    if (!filtered.find(f => f.id === t.id)) return t;
    return t.direction === 'credit' ? { ...t, isRevenue: include } : { ...t, isBiz: include };
  }));

  const biz = txns.filter(t => t.isBiz);
  const rev = txns.filter(t => t.isRevenue);
  const excluded = txns.filter(t => !t.isBiz && !t.isRevenue);
  const bizTotal = biz.reduce((s, t) => s + t.amount, 0);
  const revTotal = rev.reduce((s, t) => s + t.amount, 0);
  const excludedTotal = excluded.reduce((s, t) => s + t.amount, 0);
  const netIncome = revTotal - bizTotal;
  const allCats = [...new Set(txns.map(t => t.cat))].sort();
  const breakdown = Object.entries(biz.reduce((acc, t) => { acc[t.cat] = (acc[t.cat] || 0) + t.amount; return acc; }, {})).sort((a, b) => b[1] - a[1]);
  const maxBk = breakdown[0]?.[1] || 1;

  const exportCSV = (rows, fname) => {
    const typeOf = t => t.isRevenue ? 'Revenue' : t.isBiz ? 'Business Expense' : 'Excluded';
    const csv = ['Date,Description,Amount,Category,Type', ...rows.map(t => `"${t.date}","${t.desc}",${t.amount.toFixed(2)},"${t.cat}","${typeOf(t)}"`).join('\n')];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv.join('\n')], { type: 'text/csv' }));
    a.download = fname; a.click();
  };

  const printSummary = () => {
    const catRows = breakdown.map(([c, a]) => `<tr><td>${c}</td><td style="text-align:right">$${a.toFixed(2)}</td></tr>`).join('');
    const txRows = biz.map(t => `<tr><td>${t.date}</td><td>${t.desc}</td><td>${t.cat}</td><td style="text-align:right">$${t.amount.toFixed(2)}</td></tr>`).join('');
    const revRows = rev.map(t => `<tr><td>${t.date}</td><td>${t.desc}</td><td style="text-align:right">$${t.amount.toFixed(2)}</td></tr>`).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Kinect P&L Summary</title><style>body{font-family:Georgia,serif;padding:32px;font-size:13px}h1{font-size:22px;margin-bottom:4px}h2{font-size:14px;margin:24px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}table{width:100%;border-collapse:collapse}th,td{padding:7px 10px;border:1px solid #ddd;text-align:left}th{background:#f5f5f0}.pnl{margin:16px 0;padding:16px;background:#f9fafb;border-radius:8px}.pnl div{display:flex;justify-content:space-between;padding:4px 0;font-size:15px}.pnl .net{font-weight:bold;font-size:20px;border-top:2px solid #1a3a5c;margin-top:8px;padding-top:10px;color:#1a3a5c}</style></head><body><h1>💪 Kinect Fitness & Recovery — P&L Summary</h1><p style="color:#666;font-size:12px">Exported ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p><div class="pnl"><div><span>Revenue</span><span>$${revTotal.toFixed(2)}</span></div><div><span>Business Expenses</span><span>-$${bizTotal.toFixed(2)}</span></div><div class="net"><span>Net Income</span><span>$${netIncome.toFixed(2)}</span></div></div><h2>Revenue (${rev.length})</h2><table><tr><th>Date</th><th>Description</th><th style="text-align:right">Amount</th></tr>${revRows}</table><h2>Expenses by Category</h2><table><tr><th>Category</th><th>Total</th></tr>${catRows}</table><h2>All Business Expenses (${biz.length})</h2><table><tr><th>Date</th><th>Description</th><th>Category</th><th style="text-align:right">Amount</th></tr>${txRows}</table></body></html>`);
    w.document.close(); w.print();
  };

  // Styles
  const C = { navy: '#1a3a5c', blue: '#2563eb', lightBlue: '#eff6ff', accent: '#f59e0b', red: '#dc2626', redLight: '#fef2f2', green: '#16a34a', greenLight: '#f0fdf4', gray: '#6b7280', border: '#e5e7eb', bg: '#f9fafb', white: '#ffffff' };

  return (
    <>
      <Head>
        <title>Kinect Fitness & Recovery — Expense Tracker</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ fontFamily: 'Inter, sans-serif', background: C.bg, minHeight: '100vh' }}>

        {/* HEADER */}
        <div style={{ background: C.navy, padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>💪</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>Kinect Fitness & Recovery</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Business Expense Tracker</div>
            </div>
          </div>
          {screen === 'app' && (
            <button onClick={reset} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
              ↩ New file
            </button>
          )}
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>

          {error && (
            <div style={{ background: C.redLight, border: `1px solid #fca5a5`, borderRadius: 8, padding: '12px 16px', fontSize: 13, color: C.red, marginBottom: '1rem' }}>{error}</div>
          )}

          {/* UPLOAD */}
          {screen === 'upload' && (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              style={{ background: C.white, border: `2px dashed ${C.blue}`, borderRadius: 12, padding: '3rem 2rem', textAlign: 'center', marginBottom: '1.5rem' }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Upload your bank statement</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '12px 0' }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 99, background: C.greenLight, color: C.green, border: `1px solid #86efac` }}>✓ CSV</span>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 99, background: C.lightBlue, color: C.blue, border: `1px solid #93c5fd` }}>✓ PDF</span>
              </div>
              <div style={{ fontSize: 14, color: C.gray, marginBottom: 4 }}>Drag & drop here, or click to choose a file</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>Works with NBKC, USAA, Chase, BofA, Capital One and most banks</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 8, background: C.navy, color: C.white, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  📂 Choose file (CSV or PDF)
                  <input type="file" accept=".csv,.pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                </label>
                <button
                  onClick={() => { setTxns(SAMPLE.map((t, i) => ({ ...t, id: i }))); setFileName('Sample — June 2026'); setFileType('CSV'); setScreen('app'); }}
                  style={{ fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 8, border: `1px solid #86efac`, background: C.greenLight, color: C.green, cursor: 'pointer' }}
                >
                  💪 Load sample data
                </button>
              </div>
            </div>
          )}

          {/* PROCESSING */}
          {screen === 'processing' && (
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '3rem 2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: 44, height: 44, border: `3px solid ${C.lightBlue}`, borderTopColor: C.blue, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{procTitle}</div>
              <div style={{ fontSize: 13, color: C.gray, marginBottom: 16 }}>{procSub}</div>
              <div style={{ background: C.border, borderRadius: 99, height: 6, maxWidth: 320, margin: '0 auto', overflow: 'hidden' }}>
                <div style={{ height: 6, borderRadius: 99, background: C.blue, width: procPct + '%', transition: 'width 0.4s' }} />
              </div>
            </div>
          )}

          {/* APP */}
          {screen === 'app' && (
            <>
              {/* P&L SUMMARY */}
              <div style={{ background: C.navy, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', color: C.white }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>Profit & Loss Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Revenue</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#4ade80' }}>${revTotal.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Business Expenses</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#f87171' }}>${bizTotal.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Net Income</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: netIncome >= 0 ? '#4ade80' : '#f87171' }}>${netIncome.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Excluded</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>${excludedTotal.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* TOOLBAR */}
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: '1rem', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="text" placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ fontSize: 13, padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, height: 34, width: 180 }} />
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                  style={{ fontSize: 13, padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, height: 34 }}>
                  <option value="">All categories</option>
                  {allCats.map(c => <option key={c}>{c}</option>)}
                </select>
                <select value={statFilter} onChange={e => setStatFilter(e.target.value)}
                  style={{ fontSize: 13, padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, height: 34 }}>
                  <option value="">All items</option>
                  <option value="b">Business expenses</option>
                  <option value="r">Revenue</option>
                  <option value="x">Excluded</option>
                </select>
                {catMsg && <span style={{ fontSize: 12, color: C.gray, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, border: `2px solid ${C.lightBlue}`, borderTopColor: C.blue, borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  {catMsg}
                </span>}
                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                  <button onClick={() => markAll(true)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: `1px solid #86efac`, background: C.greenLight, color: C.green, cursor: 'pointer', fontWeight: 500 }}>✓ Include all (filtered)</button>
                  <button onClick={() => markAll(false)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: `1px solid #fca5a5`, background: C.redLight, color: C.red, cursor: 'pointer', fontWeight: 500 }}>✕ Exclude all (filtered)</button>
                </div>
              </div>

              {/* TABLE */}
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: '1rem' }}>
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.lightBlue }}>
                  <div style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, marginRight: 8, background: fileType === 'PDF' ? C.lightBlue : C.greenLight, color: fileType === 'PDF' ? C.blue : C.green, border: `1px solid ${fileType === 'PDF' ? '#93c5fd' : '#86efac'}` }}>{fileType}</span>
                    {fileName}
                  </div>
                  <div style={{ fontSize: 12, color: C.gray }}>{filtered.length} of {txns.length} transactions</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ background: C.bg }}>
                        {[['Include', 46], ['Type', 70], ['Date', 80], ['Description', null], ['Amount', 90], ['Category', 175]].map(([h, w]) => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.gray, borderBottom: `1px solid ${C.border}`, width: w || undefined }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: C.gray }}>No transactions match your filters</td></tr>
                      ) : filtered.map(t => {
                        const included = t.direction === 'credit' ? t.isRevenue : t.isBiz;
                        const onColor = t.direction === 'credit' ? C.green : C.blue;
                        return (
                          <tr key={t.id} style={{ background: included ? C.white : C.bg, opacity: included ? 1 : 0.45 }}>
                            <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>
                              <button onClick={() => toggle(t.id)}
                                style={{ width: 38, height: 21, borderRadius: 99, border: 'none', cursor: 'pointer', position: 'relative', padding: 0, background: included ? onColor : '#d1d5db', transition: 'background 0.2s' }}
                                aria-label={included ? 'Mark excluded' : 'Mark included'}>
                                <span style={{ position: 'absolute', width: 15, height: 15, borderRadius: '50%', background: C.white, top: 3, left: included ? 20 : 3, transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                              </button>
                            </td>
                            <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: t.direction === 'credit' ? C.greenLight : C.redLight, color: t.direction === 'credit' ? C.green : C.red }}>
                                {t.direction === 'credit' ? 'Revenue' : 'Expense'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, fontSize: 12, color: C.gray, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.date}</td>
                            <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={t.desc}>{t.desc}</td>
                            <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, textAlign: 'right', fontWeight: 600 }}>${t.amount.toFixed(2)}</td>
                            <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>
                              <select value={t.cat} onChange={e => updateCat(t.id, e.target.value)}
                                style={{ fontSize: 12, padding: '4px 6px', borderRadius: 5, border: `1px solid ${C.border}`, background: C.bg, width: '100%' }}>
                                {CATS.map(c => <option key={c}>{c}</option>)}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <p style={{ fontSize: 12, color: C.gray, marginBottom: '1rem' }}>💡 Toggle = included in P&L (green for revenue, blue for business expense). Gray = excluded. Change category dropdown to re-classify.</p>

              {/* BREAKDOWN */}
              {breakdown.length > 0 && (
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: 700, color: C.navy, marginBottom: 14, fontSize: 14 }}>Business expense breakdown</div>
                  {breakdown.map(([c, a]) => (
                    <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ minWidth: 200, fontSize: 13, color: C.gray, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</div>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.border, overflow: 'hidden' }}>
                        <div style={{ height: 6, borderRadius: 3, background: CAT_COLORS[c] || '#888', width: Math.round(a / maxBk * 100) + '%' }} />
                      </div>
                      <div style={{ minWidth: 80, textAlign: 'right', fontSize: 13, fontWeight: 600, color: C.navy }}>${a.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* EXPORT */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '2rem' }}>
                <button onClick={() => exportCSV(biz, 'kinect_business_expenses.csv')}
                  style={{ fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 8, border: 'none', background: C.navy, color: C.white, cursor: 'pointer' }}>
                  ⬇ Export business expenses (CSV)
                </button>
                <button onClick={() => exportCSV(rev, 'kinect_revenue.csv')}
                  style={{ fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 8, border: `1px solid #86efac`, background: C.greenLight, color: C.green, cursor: 'pointer' }}>
                  ⬇ Export revenue (CSV)
                </button>
                <button onClick={printSummary}
                  style={{ fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 8, border: `1px solid #fcd34d`, background: '#fffbeb', color: '#92400e', cursor: 'pointer' }}>
                  🖨 Print P&L summary
                </button>
                <button onClick={() => exportCSV(txns, 'kinect_all_transactions.csv')}
                  style={{ fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.navy, cursor: 'pointer' }}>
                  ⬇ Export all transactions
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
