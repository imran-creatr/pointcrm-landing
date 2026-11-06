/* =========================================================
   3D-телефон на Three.js
   — в hero и при перелёте в блок «5 шагов» (экран рисуется вживую)
   — в финальном CTA
   Если WebGL недоступен, остаются обычные HTML-телефоны.
   ========================================================= */
(() => {
  if (!window.THREE || !window.gsap) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;

  const $ = (s, root = document) => root.querySelector(s);
  const get = gsap.getProperty;
  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;
  const DEG = Math.PI / 180;

  // Размеры в CSS-пикселях: так 3D-модель совпадает с HTML-телефоном один в один
  const W = 330, H = 680, DEPTH = 34, R = 56;
  const SW = 310, SH = 660, SR = 46;

  /* ---------- Геометрия ---------- */

  function roundedRect(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x, y + r);
    s.lineTo(x, y + h - r);
    s.absarc(x + r, y + h - r, r, Math.PI, Math.PI / 2, true);
    s.lineTo(x + w - r, y + h);
    s.absarc(x + w - r, y + h - r, r, Math.PI / 2, 0, true);
    s.lineTo(x + w, y + r);
    s.absarc(x + w - r, y + r, r, 0, -Math.PI / 2, true);
    s.lineTo(x + r, y);
    s.absarc(x + r, y + r, r, -Math.PI / 2, -Math.PI, true);
    return s;
  }

  function planeFromShape(w, h, r) {
    const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 40);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + .5, pos.getY(i) / h + .5);
    return g;
  }

  // Мягкое «студийное» окружение для металла и стекла
  function makeEnvironment(renderer) {
    const env = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), new THREE.MeshBasicMaterial({ color: 0x15171c, side: THREE.BackSide }));
    env.add(room);
    const panel = (w, h, x, y, z, ry, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(x, y, z);
      m.rotation.y = ry;
      env.add(m);
    };
    panel(60, 18, 0, 40, -10, 0, 4);
    panel(20, 60, -48, 0, 10, Math.PI / 2, 3);
    panel(20, 60, 48, 5, 0, -Math.PI / 2, 2.2);
    panel(40, 10, 0, -30, 48, Math.PI, 1.6);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const tex = pmrem.fromScene(env, .04).texture;
    pmrem.dispose();
    return tex;
  }

  function buildPhone(screenTexture) {
    const group = new THREE.Group();

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b2d33, metalness: .85, roughness: .3 });
    const bs = 5, bt = 8;
    const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(W - bs * 2, H - bs * 2, R - bs), {
      depth: DEPTH - bt * 2, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 10, curveSegments: 40,
    });
    bodyGeo.translate(0, 0, -(DEPTH - bt * 2) / 2);
    group.add(new THREE.Mesh(bodyGeo, frameMat));

    // чёрная рамка вокруг экрана под стеклом
    const bezel = new THREE.Mesh(planeFromShape(W - 6, H - 6, R - 3), new THREE.MeshStandardMaterial({ color: 0x050506, metalness: .1, roughness: .12 }));
    bezel.position.z = DEPTH / 2 + .2;
    group.add(bezel);

    // экран
    screenTexture.encoding = THREE.sRGBEncoding;
    screenTexture.anisotropy = 8;
    const screen = new THREE.Mesh(planeFromShape(SW, SH, SR), new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }));
    screen.position.z = DEPTH / 2 + .4;
    group.add(screen);

    // стекло: блики окружения поверх экрана
    const glass = new THREE.Mesh(planeFromShape(W - 6, H - 6, R - 3), new THREE.MeshStandardMaterial({
      color: 0xffffff, metalness: 1, roughness: .06, transparent: true, opacity: .1, depthWrite: false,
    }));
    glass.position.z = DEPTH / 2 + .6;
    group.add(glass);

    // боковые кнопки
    const button = (len, x, y) => {
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(3.2, len, 4, 10), frameMat);
      b.position.set(x, y, 0);
      b.scale.z = 1.6;
      group.add(b);
    };
    button(22, -W / 2 - .8, 205);
    button(48, -W / 2 - .8, 135);
    button(48, -W / 2 - .8, 70);
    button(78, W / 2 + .8, 110);

    // камера на задней крышке — видна, когда телефон сильно повёрнут
    const bump = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(120, 120, 34), { depth: 3, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, curveSegments: 20 }), frameMat);
    bump.position.set(-90, 250, -DEPTH / 2 - 3);
    group.add(bump);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x0b0c10, metalness: .5, roughness: .1 });
    [[-118, 278], [-62, 278], [-90, 222]].forEach(([x, y]) => {
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 6, 32), lensMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(x, y, -DEPTH / 2 - 7);
      group.add(lens);
    });

    return group;
  }

  /* ---------- Сцена: камера настроена так, что 1 единица = 1 CSS-пиксель на плоскости z = 0 ---------- */

  function createStage(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    scene.environment = makeEnvironment(renderer);
    scene.add(new THREE.AmbientLight(0xffffff, .15));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(-400, 600, 900);
    scene.add(key);

    const camera = new THREE.PerspectiveCamera(24, 1, 10, 20000);
    const stage = { renderer, scene, camera, w: 1, h: 1 };
    stage.resize = (w, h) => {
      stage.w = w; stage.h = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.set(0, 0, (h / 2) / Math.tan(camera.fov * DEG / 2));
      camera.updateProjectionMatrix();
    };
    // перевести точку экрана (px от левого верхнего угла холста) в мировые координаты
    stage.place = (obj, cx, cy, scale) => {
      obj.scale.setScalar(scale);
      obj.position.set(cx - stage.w / 2, stage.h / 2 - cy, -DEPTH / 2 * scale);
    };
    return stage;
  }

  /* ---------- Живой экран сканирования (повторяет HTML-анимацию hero) ---------- */

  const heroPhone = $('#hero-phone');
  const phoneWrap = heroPhone && heroPhone.parentElement;
  const hero = $('#hero');
  if (!heroPhone) return;

  const els = {
    feed: $('.scan__feed', heroPhone),
    boot: $('.scan__boot', heroPhone),
    bracket: $('.scan__bracket', heroPhone),
    line: $('.scan__line', heroPhone),
    flash: $('.scan__flash', heroPhone),
    chip: $('.scan__chip', heroPhone),
    sheet: $('.sheet', heroPhone),
    items: [...heroPhone.querySelectorAll('.sheet > *')],
  };

  // Картинки берём из textures.js (data URI): при открытии файлом обычные
  // картинки «загрязняют» canvas, и WebGL отказывается их показывать
  const TEX = window.PCRM_TEX || {};
  const feedImg = new Image();
  feedImg.src = TEX.feed || els.feed.currentSrc || els.feed.src;

  // Если браузер всё же не разрешит использовать картинку — возвращаем HTML-телефоны
  let disabled = false;
  const usable = (canvas) => {
    try { canvas.getContext('2d').getImageData(0, 0, 1, 1); return true; } catch (e) { return false; }
  };
  function disable3d() {
    if (disabled) return;
    disabled = true;
    document.documentElement.classList.remove('has-3d');
    document.querySelectorAll('.phone3d, .cta__3d').forEach((el) => el.remove());
  }

  const scanCanvas = document.createElement('canvas');
  scanCanvas.width = SW * 2;
  scanCanvas.height = SH * 2;
  const sx = scanCanvas.getContext('2d');
  const scanTexture = new THREE.CanvasTexture(scanCanvas);

  const font = (w, s) => `${w} ${s}px Inter, system-ui, -apple-system, sans-serif`;
  const rr = (c, x, y, w, h, r) => {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };
  const bracketPath = new Path2D('M2 24V10a8 8 0 0 1 8-8h14M246 2h14a8 8 0 0 1 8 8v14M268 60v14a8 8 0 0 1-8 8h-14M24 82H10a8 8 0 0 1-8-8V60');
  const checkPath = new Path2D('M11.67 3.5L5.25 9.92L2.33 7');

  let feedChecked = false;
  function paintScan() {
    const c = sx;
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#0b0c0f';
    c.fillRect(0, 0, SW, SH);

    // картинка с камеры
    const fs = get(els.feed, 'scale') || 1;
    const bm = /brightness\(([\d.]+)\)/.exec(String(get(els.feed, 'filter')));
    c.save();
    c.translate(SW / 2, SH / 2); c.scale(fs, fs); c.translate(-SW / 2, -SH / 2);
    if (bm && +bm[1] < .99) c.filter = `brightness(${bm[1]})`;
    if (feedImg.complete && feedImg.naturalWidth) {
      c.drawImage(feedImg, -472, -164, 1254, 706);
      if (!feedChecked) { feedChecked = true; if (!usable(scanCanvas)) return disable3d(); }
    }
    c.restore();

    let g = c.createLinearGradient(0, 440, 0, SH);
    g.addColorStop(0, 'rgba(13,14,16,0)'); g.addColorStop(.45, '#0d0e10');
    c.fillStyle = g; c.fillRect(0, 440, SW, SH - 440);
    g = c.createLinearGradient(0, 0, 0, 150);
    g.addColorStop(0, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, SW, 150);

    // статус-бар и шапка
    c.fillStyle = '#000'; rr(c, 107, 10, 96, 28, 14); c.fill();
    c.fillStyle = '#fff'; c.font = font(600, 15); c.textBaseline = 'middle'; c.textAlign = 'left';
    c.fillText('9:41', 30, 24);
    c.textAlign = 'center'; c.fillText('Сканирование номера', SW / 2, 67);
    c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.arc(32, 68, 16, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(28, 64); c.lineTo(36, 72); c.moveTo(36, 64); c.lineTo(28, 72); c.stroke();

    // рамка, вспышка и луч
    const ba = +get(els.bracket, 'opacity'), bs = get(els.bracket, 'scale') || 1;
    if (ba > .01) {
      c.save();
      c.globalAlpha = ba;
      c.translate(155, 245); c.scale(bs, bs); c.translate(-135, -42);
      c.strokeStyle = '#3B82F6'; c.lineWidth = 4; c.lineCap = 'round';
      c.shadowColor = 'rgba(59,130,246,.9)'; c.shadowBlur = 8;
      c.stroke(bracketPath);
      c.shadowBlur = 0;
      const fa = +get(els.flash, 'opacity');
      if (fa > .01) {
        c.globalAlpha = ba * fa;
        c.globalCompositeOperation = 'screen';
        const rg = c.createRadialGradient(135, 42, 0, 135, 42, 130);
        rg.addColorStop(0, 'rgba(255,255,255,.8)'); rg.addColorStop(.7, 'rgba(147,197,253,.25)'); rg.addColorStop(1, 'rgba(147,197,253,0)');
        c.fillStyle = rg; rr(c, 6, 6, 258, 72, 8); c.fill();
        c.globalCompositeOperation = 'source-over';
      }
      const la = +get(els.line, 'opacity');
      if (la > .01) {
        const ly = parseFloat(get(els.line, 'top')) || 0;
        c.globalAlpha = ba * la;
        const lg = c.createLinearGradient(12, 0, 258, 0);
        lg.addColorStop(0, 'rgba(96,165,250,0)'); lg.addColorStop(.2, '#60a5fa'); lg.addColorStop(.5, '#93c5fd'); lg.addColorStop(.8, '#60a5fa'); lg.addColorStop(1, 'rgba(96,165,250,0)');
        c.shadowColor = 'rgba(96,165,250,.8)'; c.shadowBlur = 14;
        c.fillStyle = lg; c.fillRect(12, ly, 246, 2);
        c.shadowBlur = 0;
      }
      c.restore();
    }

    // «Номер распознан»
    const ca = +get(els.chip, 'opacity');
    if (ca > .01) {
      const cs = get(els.chip, 'scale') || 1, cy = get(els.chip, 'y') || 0;
      const label = 'Номер распознан · 0,8 с';
      c.save();
      c.font = font(600, 12);
      const tw = c.measureText(label).width;
      const w = 12 + 14 + 6 + tw + 12, h = 27;
      c.globalAlpha = ca;
      c.translate(SW / 2, 160 + h / 2 + cy); c.scale(cs, cs);
      c.fillStyle = '#16a34a'; rr(c, -w / 2, -h / 2, w, h, h / 2); c.fill();
      c.save(); c.translate(-w / 2 + 12, -7); c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(checkPath); c.restore();
      c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText(label, -w / 2 + 32, 1);
      c.restore();
    }

    // карточка клиента
    const sheetH = 249;
    const top = 410 + (get(els.sheet, 'yPercent') || 0) / 100 * sheetH;
    if (top < SH) {
      c.fillStyle = '#fff';
      c.beginPath();
      c.moveTo(0, SH + 40); c.lineTo(0, top + 28); c.arcTo(0, top, 28, top, 28);
      c.lineTo(SW - 28, top); c.arcTo(SW, top, SW, top + 28, 28); c.lineTo(SW, SH + 40); c.closePath(); c.fill();

      const it = (i) => ({ a: +get(els.items[i], 'opacity'), y: get(els.items[i], 'y') || 0 });
      c.textBaseline = 'middle';

      let s = it(0); c.globalAlpha = s.a; c.fillStyle = '#d9dbe0'; rr(c, 137, top + 10 + s.y, 36, 5, 2.5); c.fill();

      s = it(1); c.globalAlpha = s.a;
      const ry = top + 29 + s.y;
      c.font = font(600, 9); const kw = c.measureText('KZ').width;
      c.font = font(600, 19); const nw = c.measureText('482 KDM 02').width;
      const pw = 10 + kw + 6 + nw + 10;
      c.fillStyle = '#fff'; c.strokeStyle = '#121419'; c.lineWidth = 1.5; rr(c, 20, ry, pw, 34, 6); c.fill(); c.stroke();
      c.textAlign = 'left';
      c.fillStyle = '#3b82f6'; c.font = font(600, 9); c.fillText('KZ', 30, ry + 18);
      c.fillStyle = '#121419'; c.font = font(600, 19); c.fillText('482 KDM 02', 30 + kw + 6, ry + 18);
      c.font = font(600, 12); const tw = c.measureText('Постоянный').width;
      c.fillStyle = '#e8f7ee'; rr(c, 290 - tw - 20, ry + 5, tw + 20, 24, 12); c.fill();
      c.fillStyle = '#15803d'; c.fillText('Постоянный', 290 - tw - 10, ry + 17.5);

      s = it(2); c.globalAlpha = s.a;
      c.fillStyle = '#6b7080'; c.font = font(400, 14); c.fillText('Toyota Camry · Седан · серый', 20, top + 88 + s.y);

      s = it(3); c.globalAlpha = s.a;
      const vy = top + 110 + s.y;
      c.fillStyle = '#f5f6f8'; rr(c, 20, vy, 270, 56, 14); c.fill();
      c.fillStyle = '#121419'; c.font = font(600, 13); c.fillText('7-й визит', 32, vy + 20);
      c.fillStyle = '#6b7080'; c.font = font(400, 12); c.fillText('В прошлый раз: Комплекс', 32, vy + 37);
      c.fillStyle = '#121419'; c.font = font(600, 15); c.textAlign = 'right'; c.fillText('6 000 ₸', 278, vy + 28);

      s = it(4); c.globalAlpha = s.a;
      const by = top + 180 + s.y;
      c.fillStyle = '#3b82f6'; rr(c, 20, by, 270, 48, 14); c.fill();
      c.fillStyle = '#fff'; c.font = font(600, 16); c.textAlign = 'center'; c.fillText('Создать заказ', SW / 2, by + 24.5);
      c.globalAlpha = 1;
    }

    // экран «включается»
    const boot = +get(els.boot, 'opacity');
    if (boot > .01) { c.globalAlpha = boot; c.fillStyle = '#000'; c.fillRect(0, 0, SW, SH); c.globalAlpha = 1; }

    scanTexture.needsUpdate = true;
  }

  /* ---------- Hero: 3D-телефон поверх страницы ---------- */

  const heroCanvas = document.createElement('canvas');
  heroCanvas.className = 'phone3d';
  heroCanvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(heroCanvas);
  const heroStage = createStage(heroCanvas);
  const heroModel = buildPhone(scanTexture);
  heroModel.rotation.order = 'ZYX';
  heroStage.scene.add(heroModel);

  const inner = $('.hero__inner');
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX / window.innerWidth - .5;
    pointer.y = e.clientY / window.innerHeight - .5;
  }, { passive: true });

  function renderHero(time) {
    const wrapAlpha = +get(phoneWrap, 'opacity');
    const phoneAlpha = +get(heroPhone, 'opacity');
    const k = get(phoneWrap, 'scale') || 1;
    const h = get(heroPhone, 'scale') || 1;
    const wrapTop = hero.offsetTop + inner.offsetTop + phoneWrap.offsetTop - window.scrollY;
    const wrapLeft = hero.offsetLeft + inner.offsetLeft + phoneWrap.offsetLeft;
    const cx = wrapLeft + 165 + (get(phoneWrap, 'x') || 0);
    const cy = wrapTop + (get(phoneWrap, 'y') || 0) + k * ((get(heroPhone, 'y') || 0) + 340 * h);
    const size = 680 * h * k;

    const visible = wrapAlpha > .01 && phoneAlpha > .01 && cy + size / 2 > -50 && cy - size / 2 < window.innerHeight + 50;
    heroCanvas.style.visibility = visible ? 'visible' : 'hidden';
    if (!visible) return;

    paintScan();
    if (disabled) return;

    // пока телефон стоит в hero — лёгкий разворот к тексту и реакция на курсор;
    // к моменту посадки всё это плавно гаснет, чтобы телефон встал ровно
    const travel = window.PCRM && window.PCRM.travel ? window.PCRM.travel.progress : 0;
    const rest = 1 - Math.min(1, travel * 1.6);
    pointer.sx += (pointer.x - pointer.sx) * .06;
    pointer.sy += (pointer.y - pointer.sy) * .06;
    const idle = Math.sin(time * .8) * 2.2;
    const baseY = isMobile() ? -6 : -16;

    heroModel.rotation.x = (-(get(heroPhone, 'rotationX') || 0) + (pointer.sy * 10 + idle * .4) * rest) * DEG;
    heroModel.rotation.y = ((get(phoneWrap, 'rotationY') || 0) + (baseY + pointer.sx * 22 + idle) * rest) * DEG;
    heroModel.rotation.z = -(get(phoneWrap, 'rotation') || 0) * DEG;
    heroStage.place(heroModel, cx, cy, size / H);
    heroCanvas.style.opacity = Math.min(wrapAlpha, phoneAlpha);
    heroStage.renderer.render(heroStage.scene, heroStage.camera);
  }

  /* ---------- CTA: 3D-телефон с экраном «Новая заявка» ---------- */

  const ctaBlock = $('.cta__block');
  let ctaStage = null, ctaModel = null, ctaHost = null, ctaVisible = false;
  const ctaPose = { enter: 0 };

  if (ctaBlock) {
    ctaHost = document.createElement('div');
    ctaHost.className = 'cta__3d';
    ctaHost.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('canvas');
    ctaHost.appendChild(canvas);
    ctaBlock.appendChild(ctaHost);
    ctaStage = createStage(canvas);

    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = SW * 2; screenCanvas.height = SH * 2;
    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    const img = new Image();
    img.onload = () => {
      const c = screenCanvas.getContext('2d');
      c.fillStyle = '#fff'; c.fillRect(0, 0, screenCanvas.width, screenCanvas.height);
      const scale = screenCanvas.width / img.naturalWidth;
      c.drawImage(img, 0, 0, img.naturalWidth * scale, img.naturalHeight * scale);
      c.fillStyle = '#000'; rr(c, 214, 20, 192, 56, 28); c.fill();
      if (!usable(screenCanvas)) return disable3d();
      screenTexture.needsUpdate = true;
    };
    img.src = TEX.newOrder || 'assets/screen-new-order.png';
    ctaModel = buildPhone(screenTexture);
    ctaModel.rotation.order = 'ZYX';
    ctaStage.scene.add(ctaModel);

    new IntersectionObserver(([e]) => (ctaVisible = e.isIntersecting), { rootMargin: '100px' }).observe(ctaBlock);

    // телефон въезжает снизу, разворачиваясь из профиля
    gsap.fromTo(ctaPose, { enter: 0 }, {
      enter: 1, ease: 'none',
      scrollTrigger: { trigger: ctaBlock, start: 'top 95%', end: 'center 55%', scrub: .8 },
    });
  }

  function renderCta(time) {
    if (!ctaVisible || disabled) return;
    const w = ctaStage.w, h = ctaStage.h;
    const e = ctaPose.enter;
    const ease = 1 - Math.pow(1 - e, 3);
    const mobile = isMobile();
    // как в макете: крупный телефон, низ уходит под край плашки
    const scale = mobile ? (h * 1.05) / H : (h * 1.22) / H;
    const cx = w * .5;
    const cy = h * (mobile ? .64 : .74) + (1 - ease) * h * .6 + Math.sin(time * 1.1) * 6;
    ctaModel.rotation.z = (-10 + (1 - ease) * -14) * DEG;
    ctaModel.rotation.y = (-22 + (1 - ease) * -70 + Math.sin(time * .7) * 3 + pointer.sx * 14) * DEG;
    ctaModel.rotation.x = (8 + pointer.sy * 8) * DEG;
    ctaStage.place(ctaModel, cx, cy, scale);
    ctaStage.renderer.render(ctaStage.scene, ctaStage.camera);
  }

  /* ---------- Цикл и размеры ---------- */

  function resize() {
    heroStage.resize(window.innerWidth, window.innerHeight);
    if (ctaStage) ctaStage.resize(ctaHost.clientWidth || 1, ctaHost.clientHeight || 1);
  }
  resize();
  window.addEventListener('resize', resize);

  document.documentElement.classList.add('has-3d');

  gsap.ticker.add((time) => {
    if (disabled) return;
    renderHero(time);
    renderCta(time);
  });

  // текст на холсте появится, как только догрузится Inter
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load(font(600, 15)), document.fonts.load(font(400, 14))]).catch(() => {});
  }
})();
