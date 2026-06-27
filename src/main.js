const heirs = [
  { id: 1, name: 'أحمد', relation: 'ابن', share: 0.35, color: '#14b8a6' },
  { id: 2, name: 'سارة', relation: 'بنت', share: 0.175, color: '#f97316' },
  { id: 3, name: 'ليلى', relation: 'زوجة', share: 0.125, color: '#8b5cf6' },
  { id: 4, name: 'الأم', relation: 'أم', share: 0.166, color: '#06b6d4' },
];
const buildings = [
  { id: 1, name: 'المبنى الرئيسي', floors: 2, area: 210, value: 420000, divisible: false, x: 210, y: 125, w: 155, h: 115 },
  { id: 2, name: 'ملحق', floors: 1, area: 72, value: 95000, divisible: true, x: 490, y: 285, w: 92, h: 76 },
];
const plots = [
  { id: 1, heirId: 1, points: '60,70 390,70 390,250 60,270', area: 840, frontage: 31, roadAccess: true, hasBuilding: true },
  { id: 2, heirId: 2, points: '390,70 720,70 720,215 390,250', area: 420, frontage: 22, roadAccess: true, hasBuilding: false },
  { id: 3, heirId: 3, points: '60,270 390,250 390,470 60,470', area: 300, frontage: 18, roadAccess: true, hasBuilding: false },
  { id: 4, heirId: 4, points: '390,250 720,215 720,470 390,470', area: 398, frontage: 20, roadAccess: true, hasBuilding: true },
];
const layerLabels = { land: 'حدود الأرض', buildings: 'المباني', roads: 'الطرق', paths: 'الممرات', plots: 'القطع', labels: 'النصوص', dimensions: 'الأبعاد', overlay: 'Overlay' };
let selectedPlot = 1;
const visible = { land: true, buildings: true, roads: true, paths: true, plots: true, labels: true, dimensions: true, overlay: true };

function heirFor(plot) { return heirs.find(heir => heir.id === plot.heirId); }
function selected() { return plots.find(plot => plot.id === selectedPlot); }
function render() {
  const totalArea = 2400;
  const distributed = plots.reduce((sum, plot) => sum + plot.area, 0);
  const currentPlot = selected();
  const currentHeir = heirFor(currentPlot);
  document.querySelector('#app').innerHTML = `
    <main class="app-shell">
      <aside class="panel data-panel">
        <section class="brand"><span>REA</span><div><h1>تقسيم المواريث العقارية</h1><p>واجهة عربية مبسطة لتقسيم أرض موروثة هندسياً وشرعياً.</p></div></section>
        <section class="card"><h2>بيانات الأرض</h2><div class="grid two"><label>المساحة<input value="2400 م²" /></label><label>الأبعاد<input value="60 × 40 م" /></label><label>الشكل<select><option>مضلع</option><option>مستطيل</option></select></label><label>الحدود<input value="شارع شمالي" /></label></div><button class="ghost">رفع مخطط اختياري</button></section>
        <section class="card"><h2>المباني</h2>${buildings.map(building => `<div class="building-row"><b>${building.name}</b><span>${building.area}م² · ${building.floors} طابق · ${building.divisible ? 'قابل للتقسيم' : 'ثابت'}</span></div>`).join('')}<button>إضافة مبنى</button></section>
        <section class="card"><h2>الورثة</h2><div class="heir-inputs">${['زوج','زوجة','أب','أم','أبناء','بنات','الإخوة','بقية الورثة'].map(item => `<button>${item}</button>`).join('')}</div><button class="primary">احسب الأنصبة</button></section>
        <section class="card shares"><h2>جدول الأنصبة</h2>${heirs.map(heir => `<button data-heir="${heir.id}"><i style="background:${heir.color}"></i><span>${heir.name}</span><strong>${(heir.share * 100).toFixed(1)}%</strong></button>`).join('')}</section>
      </aside>
      <section class="canvas-area">
        <header class="topbar"><div class="proposals">${['أفضل استغلال','أفضل واجهات','أقل ممرات','أقل فاقد','أكثر انتظاماً'].map((proposal, index) => `<button class="${index === 0 ? 'active' : ''}">${proposal}</button>`).join('')}</div><button class="export">⬇ PDF PNG SVG DXF JSON</button></header>
        <div class="workspace"><div class="toolbar">${['↖','✥','⌁','＋','⌫','✂','▣','⛶'].map((tool, index) => `<button class="${index === 0 ? 'active' : ''}">${tool}</button>`).join('')}</div><svg viewBox="0 0 780 540" class="map" role="img" aria-label="مخطط تقسيم الأرض">${mapSvg()}</svg></div>
        <footer class="status"><span>إجمالي المساحة: ${totalArea}م²</span><span>الموزعة: ${distributed}م²</span><span>الفاقد: ${totalArea - distributed}م²</span><span>القطع: ${plots.length}</span><span>المباني: ${buildings.length}</span><span>الممرات: 2</span></footer>
      </section>
      <aside class="panel props-panel"><section class="card"><h2>الطبقات</h2>${Object.keys(layerLabels).map(key => `<button class="layer" data-layer="${key}">${visible[key] ? '👁' : '◌'} ${layerLabels[key]}</button>`).join('')}</section><section class="card"><h2>خصائص القطعة المحددة</h2><dl><dt>اسم الوريث</dt><dd>${currentHeir.name}</dd><dt>النسبة</dt><dd>${(currentHeir.share * 100).toFixed(2)}%</dd><dt>المساحة</dt><dd>${currentPlot.area}م²</dd><dt>الواجهة</dt><dd>${currentPlot.frontage}م</dd><dt>عدد الأضلاع</dt><dd>${currentPlot.points.split(' ').length}</dd><dt>وجود مبنى</dt><dd>${currentPlot.hasBuilding ? 'نعم' : 'لا'}</dd><dt>اتصال بالطريق</dt><dd>${currentPlot.roadAccess ? 'متصل' : 'غير متصل'}</dd><dt>إمكانية البناء</dt><dd>صالحة مبدئياً</dd></dl></section><section class="card warnings"><h2>التحقق الفوري</h2><p>✓ كل القطع متصلة.</p><p>✓ لا توجد تقاطعات بين القطع.</p><p>✓ كل قطعة لها وصول عبر طريق أو ممر.</p><p>! الفاقد غير موزع بالكامل ويحتاج اعتماداً.</p></section></aside>
    </main>`;
  bindEvents();
}
function mapSvg() {
  return `${visible.roads ? '<rect x="35" y="30" width="710" height="28" rx="8" class="road"/>' : ''}${visible.land ? '<polygon points="60,70 720,70 720,470 60,470" class="land"/>' : ''}${visible.plots ? plots.map(plot => `<polygon data-plot="${plot.id}" points="${plot.points}" class="plot ${plot.id === selectedPlot ? 'selected' : ''}" fill="${heirFor(plot).color}"/>`).join('') : ''}${visible.overlay ? plots.map(plot => `<polygon points="${plot.points}" fill="${heirFor(plot).color}" opacity="0.34"/>`).join('') : ''}${visible.paths ? '<path d="M390 70 L390 470 M60 270 L720 215" class="path"/>' : ''}${visible.buildings ? buildings.map(building => `<g><rect x="${building.x}" y="${building.y}" width="${building.w}" height="${building.h}" class="building"/><text x="${building.x + 10}" y="${building.y + 25}">${building.name}</text></g>`).join('') : ''}${visible.labels ? plots.map(plot => { const [x, y] = plot.points.split(' ')[0].split(',').map(Number); return `<text x="${x + 45}" y="${y + 70}" class="label">قطعة ${plot.id} · ${heirFor(plot).name} · ${plot.area}م² · ${(heirFor(plot).share * 100).toFixed(1)}%</text>`; }).join('') : ''}${visible.dimensions ? '<text x="365" y="505" class="dim">60 م</text><text x="18" y="275" class="dim" transform="rotate(-90 18 275)">40 م</text>' : ''}`;
}
function bindEvents() {
  document.querySelectorAll('[data-plot]').forEach(node => node.addEventListener('click', () => { selectedPlot = Number(node.dataset.plot); render(); }));
  document.querySelectorAll('[data-heir]').forEach(node => node.addEventListener('click', () => { selectedPlot = plots.find(plot => plot.heirId === Number(node.dataset.heir))?.id || selectedPlot; render(); }));
  document.querySelectorAll('[data-layer]').forEach(node => node.addEventListener('click', () => { const key = node.dataset.layer; visible[key] = !visible[key]; render(); }));
}

render();
