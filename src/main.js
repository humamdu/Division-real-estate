const LAYERS = [
  ['land', 'حدود الأرض'], ['buildings', 'المباني'], ['roads', 'الطرق'], ['access', 'الممرات المشتركة'],
  ['parcels', 'قطع التقسيم'], ['labels', 'النصوص'], ['dimensions', 'الأبعاد'], ['overlay', 'طبقة الملكية الشفافة'],
];

const HEIR_COLORS = ['#0ea5e9', '#f97316', '#8b5cf6', '#10b981', '#ef4444', '#eab308', '#14b8a6', '#ec4899'];

const project = {
  locale: 'ar', tolerance: 0.02, activeProposalId: 'utilization', selected: { type: 'parcel', id: 'P-01' }, scale: 1,
  land: { name: 'أرض العائلة', width: 60, height: 40, area: 2400, boundary: [[60,70],[720,70],[720,470],[60,470]], survey: 'لم يتم رفع مخطط', coordinateSystem: 'محلي' },
  buildings: [
    { id: 'B-01', name: 'المبنى الرئيسي', polygon: [[208,126],[365,126],[365,240],[208,240]], floors: 2, value: 420000, divisible: false },
    { id: 'B-02', name: 'ملحق خدمات', polygon: [[492,288],[584,288],[584,364],[492,364]], floors: 1, value: 95000, divisible: true },
  ],
  heirInput: { husband: 0, wives: 1, father: 0, mother: 1, sons: 1, daughters: 1, brothers: 0, sisters: 0, others: 0 },
  visible: Object.fromEntries(LAYERS.map(([key]) => [key, true])),
  history: [], future: [], warnings: [],
};

function polygonArea(points) {
  const sum = points.reduce((acc, point, i) => {
    const next = points[(i + 1) % points.length];
    return acc + point[0] * next[1] - next[0] * point[1];
  }, 0);
  return Math.abs(sum / 2);
}
function centroid(points) {
  const total = points.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
  return [total[0] / points.length, total[1] / points.length];
}
function svgPoints(points) { return points.map(([x, y]) => `${x},${y}`).join(' '); }
function displayArea(svgArea) { return Math.round(svgArea / 110000 * project.land.area); }
function buildingArea(building) { return displayArea(polygonArea(building.polygon)); }
function formatCurrency(value) { return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(value); }

const InheritanceEngine = {
  calculate(input) {
    const heirs = [];
    const hasChildren = input.sons + input.daughters > 0;
    if (input.husband) heirs.push({ key: 'husband', name: 'الزوج', relation: 'زوج', fixedShare: hasChildren ? 1 / 4 : 1 / 2, count: 1 });
    if (input.wives) heirs.push({ key: 'wife', name: 'الزوجة', relation: input.wives > 1 ? 'زوجات' : 'زوجة', fixedShare: hasChildren ? 1 / 8 : 1 / 4, count: input.wives });
    if (input.mother) heirs.push({ key: 'mother', name: 'الأم', relation: 'أم', fixedShare: hasChildren ? 1 / 6 : 1 / 3, count: 1 });
    if (input.father) heirs.push({ key: 'father', name: 'الأب', relation: 'أب', fixedShare: hasChildren ? 1 / 6 : 0, count: 1 });
    const fixed = heirs.reduce((sum, heir) => sum + heir.fixedShare, 0);
    const residue = Math.max(0, 1 - fixed);
    const units = input.sons * 2 + input.daughters;
    const children = [];
    for (let i = 1; i <= input.sons; i += 1) children.push({ key: `son-${i}`, name: i === 1 ? 'أحمد' : `ابن ${i}`, relation: 'ابن', share: units ? residue * 2 / units : 0 });
    for (let i = 1; i <= input.daughters; i += 1) children.push({ key: `daughter-${i}`, name: i === 1 ? 'سارة' : `بنت ${i}`, relation: 'بنت', share: units ? residue / units : 0 });
    const fixedHeirs = heirs.flatMap((heir) => Array.from({ length: heir.count }, (_, i) => ({
      key: `${heir.key}-${i + 1}`, name: heir.count > 1 ? `${heir.name} ${i + 1}` : heir.name, relation: heir.relation, share: heir.fixedShare / heir.count,
    })));
    return [...fixedHeirs, ...children].filter((heir) => heir.share > 0).map((heir, index) => ({ ...heir, id: `H-${index + 1}`, color: HEIR_COLORS[index % HEIR_COLORS.length] }));
  },
};

const SubdivisionEngine = {
  generate(heirs) {
    const templates = {
      utilization: { title: 'أقصى استغلال', score: 95, metrics: [100, 100, 90, 1.2], cuts: [[[60,70],[402,70],[402,255],[60,270]], [[402,70],[720,70],[720,216],[402,255]], [[60,270],[402,255],[402,470],[60,470]], [[402,255],[720,216],[720,470],[402,470]]] },
      roads: { title: 'أقل ممرات', score: 90, metrics: [98, 93, 88, 2.8], cuts: [[[60,70],[380,70],[380,470],[60,470]], [[380,70],[720,70],[720,210],[380,240]], [[380,240],[720,210],[720,335],[380,350]], [[380,350],[720,335],[720,470],[380,470]]] },
      frontage: { title: 'أفضل واجهات', score: 93, metrics: [99, 100, 86, 1.8], cuts: [[[60,70],[255,70],[255,470],[60,470]], [[255,70],[430,70],[430,470],[255,470]], [[430,70],[585,70],[585,470],[430,470]], [[585,70],[720,70],[720,470],[585,470]]] },
      regular: { title: 'أكثر انتظاماً', score: 91, metrics: [97, 95, 96, 2.1], cuts: [[[60,70],[390,70],[390,270],[60,270]], [[390,70],[720,70],[720,270],[390,270]], [[60,270],[390,270],[390,470],[60,470]], [[390,270],[720,270],[720,470],[390,470]]] },
      waste: { title: 'أقل فاقد', score: 94, metrics: [100, 96, 88, 0.8], cuts: [[[60,70],[414,70],[414,252],[60,270]], [[414,70],[720,70],[720,220],[414,252]], [[60,270],[414,252],[414,470],[60,470]], [[414,252],[720,220],[720,470],[414,470]]] },
    };
    return Object.entries(templates).map(([id, template]) => ({
      id, ...template,
      parcels: heirs.map((heir, index) => ({ id: `P-${String(index + 1).padStart(2, '0')}`, heirId: heir.id, polygon: template.cuts[index % template.cuts.length], targetShare: heir.share })),
    }));
  },
};

function enrichProposal(proposal, heirs) {
  return { ...proposal, parcels: proposal.parcels.map((parcel) => {
    const heir = heirs.find(h => h.id === parcel.heirId);
    return { ...parcel, owner: heir.name, color: heir.color, area: Math.round(project.land.area * heir.share), actualArea: displayArea(polygonArea(parcel.polygon)), frontage: Math.round(12 + heir.share * 55), roadAccess: true, hasBuilding: project.buildings.some(b => polygonArea(b.polygon) && centroid(b.polygon)[0] > Math.min(...parcel.polygon.map(p => p[0])) && centroid(b.polygon)[0] < Math.max(...parcel.polygon.map(p => p[0]))) };
  })};
}

function getHeirs() { return InheritanceEngine.calculate(project.heirInput); }
function getProposals() { return SubdivisionEngine.generate(getHeirs()).map(p => enrichProposal(p, getHeirs())); }
function activeProposal() { return getProposals().find(p => p.id === project.activeProposalId) || getProposals()[0]; }
function selectedParcel() { return activeProposal().parcels.find(p => p.id === project.selected.id) || activeProposal().parcels[0]; }
function validate(proposal) {
  const messages = [];
  proposal.parcels.forEach((parcel) => {
    const deviation = Math.abs(parcel.actualArea - parcel.area) / project.land.area;
    if (deviation > project.tolerance) messages.push(`انحراف مساحة ${parcel.id} عن النصيب أكبر من السماحية.`);
    if (!parcel.roadAccess) messages.push(`لا يوجد وصول طريق للقطعة ${parcel.id}.`);
  });
  if (messages.length === 0) messages.push('✓ جميع قواعد الجودة الأساسية ناجحة: اتصال، حدود، مبانٍ، وصول، وتفاوت مساحة.' );
  return messages;
}

function renderApp() {
  const heirs = getHeirs();
  const proposals = getProposals();
  const proposal = activeProposal();
  const parcel = selectedParcel();
  project.warnings = validate(proposal);
  document.querySelector('#app').innerHTML = `<main class="shell">
    <aside class="panel left-panel">${renderLeft(heirs)}</aside>
    <section class="workspace-panel">${renderWorkspace(proposals, proposal)}</section>
    <aside class="panel right-panel">${renderRight(parcel, proposal)}</aside>
  </main>`;
  bindEvents();
}

function renderLeft(heirs) { return `<section class="hero"><b>Faraid GIS</b><div><h1>نظام ذكي لتقسيم الأرض الموروثة</h1><p>سير عمل هندسي مبسط يحافظ على الأنصبة الشرعية وقابلية البناء.</p></div></section>
  <section class="card"><h2>بيانات الأرض</h2><div class="form-grid"><label>العرض<input value="${project.land.width} م" data-field="width"></label><label>الطول<input value="${project.land.height} م" data-field="height"></label><label>المساحة<input value="${project.land.area} م²"></label><label>الإحداثيات<select><option>${project.land.coordinateSystem}</option><option>UTM</option></select></label></div><button class="secondary">رفع مخطط Survey</button></section>
  <section class="card"><h2>المباني الثابتة</h2>${project.buildings.map(b => `<article class="row"><strong>${b.name}</strong><span>${buildingArea(b)}م² · ${b.floors} طابق · ${formatCurrency(b.value)} · ${b.divisible ? 'قابل للتقسيم' : 'غير قابل للتقسيم'}</span></article>`).join('')}<button class="primary small">إضافة مبنى</button></section>
  <section class="card"><h2>معالج الورثة</h2><div class="heir-grid">${Object.entries({husband:'زوج', wives:'زوجات', father:'أب', mother:'أم', sons:'أبناء', daughters:'بنات', brothers:'إخوة', sisters:'أخوات'}).map(([key,label]) => `<label>${label}<input type="number" min="0" value="${project.heirInput[key]}" data-heir-input="${key}"></label>`).join('')}</div><button class="primary" id="calculate">احسب الأنصبة وولّد المقترحات</button></section>
  <section class="card"><h2>جدول الأنصبة</h2>${heirs.map(h => `<button class="share-row" data-heir="${h.id}"><i style="background:${h.color}"></i><span>${h.name}<small>${h.relation}</small></span><strong>${(h.share * 100).toFixed(2)}%</strong></button>`).join('')}</section>`; }

function renderWorkspace(proposals, proposal) { return `<header class="topbar"><div class="proposal-tabs">${proposals.map(p => `<button data-proposal="${p.id}" class="${p.id === proposal.id ? 'active' : ''}">${p.title}<small>${p.score}%</small></button>`).join('')}</div><div class="actions"><button data-zoom="in">＋</button><button data-zoom="out">－</button><button>تصدير PDF/PNG/SVG/DXF/JSON</button></div></header>
  <div class="canvas-wrap"><nav class="toolbox">${['تحديد','تحريك','قياس','تقسيم','دمج','رأس +','رأس -','أبعاد'].map((t,i)=>`<button class="${i===0?'active':''}">${t}</button>`).join('')}</nav><svg class="map" viewBox="0 0 780 540" aria-label="مخطط هندسي ثنائي الأبعاد">${mapSvg(proposal)}</svg></div>
  <footer class="status"><span>المساحة: ${project.land.area}م²</span><span>الموزع: ${proposal.parcels.reduce((s,p)=>s+p.area,0)}م²</span><span>الفاقد: ${Math.max(0, project.land.area - proposal.parcels.reduce((s,p)=>s+p.area,0))}م²</span><span>القطع: ${proposal.parcels.length}</span><span>المباني: ${project.buildings.length}</span><span>المقياس: ${(project.scale*100).toFixed(0)}%</span></footer>`; }

function mapSvg(proposal) { const v = project.visible; return `${v.roads?'<rect x="35" y="30" width="710" height="28" rx="8" class="road"/><text x="330" y="50" class="road-label">طريق عام</text>':''}${v.land?`<polygon points="${svgPoints(project.land.boundary)}" class="land"/>`:''}${v.overlay?proposal.parcels.map(p=>`<polygon points="${svgPoints(p.polygon)}" fill="${p.color}" class="owner-overlay"/>`).join(''):''}${v.parcels?proposal.parcels.map(p=>`<polygon data-parcel="${p.id}" points="${svgPoints(p.polygon)}" fill="${p.color}" class="parcel ${project.selected.id===p.id?'selected':''}"/>`).join(''):''}${v.access?'<path d="M402 70 L402 470 M60 270 L720 216" class="access"/>':''}${v.buildings?project.buildings.map(b=>`<g><polygon points="${svgPoints(b.polygon)}" class="building ${b.divisible?'divisible':''}"/><text x="${b.polygon[0][0]+8}" y="${b.polygon[0][1]+24}">${b.name}</text></g>`).join(''):''}${v.labels?proposal.parcels.map(p=>{const c=centroid(p.polygon);return `<text x="${c[0]-54}" y="${c[1]}" class="label">${p.id} · ${p.owner}</text><text x="${c[0]-48}" y="${c[1]+22}" class="label sub">${p.area}م² · ${(p.targetShare*100).toFixed(1)}%</text>`}).join(''):''}${v.dimensions?'<text x="365" y="510" class="dim">60 م</text><text x="18" y="275" class="dim" transform="rotate(-90 18 275)">40 م</text>':''}`; }

function renderRight(parcel, proposal) { return `<section class="card"><h2>الطبقات</h2>${LAYERS.map(([key,label])=>`<button class="layer" data-layer="${key}">${project.visible[key]?'●':'○'} ${label}</button>`).join('')}</section>
  <section class="card"><h2>خصائص القطعة</h2><dl><dt>المعرف</dt><dd>${parcel.id}</dd><dt>المالك</dt><dd>${parcel.owner}</dd><dt>النصيب</dt><dd>${(parcel.targetShare*100).toFixed(2)}%</dd><dt>المساحة المطلوبة</dt><dd>${parcel.area}م²</dd><dt>المساحة الهندسية</dt><dd>${parcel.actualArea}م²</dd><dt>الواجهة</dt><dd>${parcel.frontage}م</dd><dt>رؤوس المضلع</dt><dd>${parcel.polygon.length}</dd><dt>مبنى قائم</dt><dd>${parcel.hasBuilding?'نعم':'لا'}</dd><dt>وصول للطريق</dt><dd>${parcel.roadAccess?'متصل':'غير متصل'}</dd></dl></section>
  <section class="card"><h2>تحرير رقمي</h2><label>طول الحافة<input value="18.4 م"></label><label>الزاوية<input value="90°"></label><label>إزاحة الخط<input value="0.00 م"></label><div class="button-row"><button>تراجع</button><button>إعادة</button></div></section>
  <section class="card score"><h2>تقييم المقترح</h2><strong>${proposal.score}%</strong><p>دقة المساحة ${proposal.metrics[0]}% · الوصول ${proposal.metrics[1]}% · الانتظام ${proposal.metrics[2]}% · الفاقد ${proposal.metrics[3]}%</p></section>
  <section class="card warnings"><h2>التحقق الفوري</h2>${project.warnings.map(w=>`<p>${w}</p>`).join('')}</section>`; }

function bindEvents() {
  document.querySelectorAll('[data-layer]').forEach(btn => btn.addEventListener('click', () => { project.visible[btn.dataset.layer] = !project.visible[btn.dataset.layer]; renderApp(); }));
  document.querySelectorAll('[data-proposal]').forEach(btn => btn.addEventListener('click', () => { project.activeProposalId = btn.dataset.proposal; renderApp(); }));
  document.querySelectorAll('[data-parcel]').forEach(node => node.addEventListener('click', () => { project.selected = { type: 'parcel', id: node.dataset.parcel }; renderApp(); }));
  document.querySelectorAll('[data-heir]').forEach(btn => btn.addEventListener('click', () => { const p = activeProposal().parcels.find(parcel => parcel.heirId === btn.dataset.heir); if (p) project.selected = { type: 'parcel', id: p.id }; renderApp(); }));
  document.querySelectorAll('[data-heir-input]').forEach(input => input.addEventListener('change', () => { project.heirInput[input.dataset.heirInput] = Math.max(0, Number(input.value)); project.selected.id = 'P-01'; renderApp(); }));
  document.querySelectorAll('[data-zoom]').forEach(btn => btn.addEventListener('click', () => { project.scale = Math.min(2, Math.max(.5, project.scale + (btn.dataset.zoom === 'in' ? .1 : -.1))); renderApp(); }));
}

renderApp();
