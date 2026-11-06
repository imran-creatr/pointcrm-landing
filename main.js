(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const nav = $('#nav');
  const hero = $('#hero');
  const heroPhone = $('#hero-phone');
  const stage = $('.stage');
  const stagePhone = $('.stage__phone');

  /* ---------- Масштаб телефонов под высоту контейнера ---------- */

  function fitPhones() {
    const h = isMobile() ? .86 : Math.min(1, (hero.clientHeight - 180 - 56) / 680);
    const s = Math.max(.35, Math.min(1, (stage.clientHeight - 60) / 680, (stage.clientWidth - 40) / 330));
    heroPhone.parentElement.style.setProperty('--wrap-ps', h.toFixed(3));
    // GSAP сам управляет transform этих элементов, поэтому масштаб тоже задаём через него
    if (window.gsap && !reduceMotion) {
      gsap.set(heroPhone, { scale: h });
      gsap.set(stagePhone, { scale: s });
    } else {
      heroPhone.style.setProperty('--ps', h.toFixed(3));
      stagePhone.style.setProperty('--ps', s.toFixed(3));
    }
  }
  fitPhones();

  $$('.card[data-tilt]').forEach((c) => (c.style.rotate = c.dataset.tilt + 'deg'));

  /* ---------- Разбивка заголовков на строки ---------- */

  $$('[data-split]').forEach((el) => {
    const parts = el.innerHTML.split(/<br\s*\/?>/i).map((p) => p.trim()).filter(Boolean);
    const words = el.matches('.hero__title');
    const wrap = (p) => (words ? p.split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ') : p);
    el.innerHTML = parts.map((p) => `<span class="line"><span>${wrap(p)}</span></span>`).join('');
  });

  /* ---------- Навигация ---------- */

  const burger = $('#burger');
  const menu = $('#mobile-menu');
  function setMenu(open) {
    document.documentElement.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    if (window.lenis) open ? lenis.stop() : lenis.start();
  }
  burger.addEventListener('click', () => setMenu(!document.documentElement.classList.contains('menu-open')));

  const onScrollNav = (y) => nav.classList.toggle('is-floating', y > 40);
  onScrollNav(window.scrollY);

  /* ---------- FAQ ---------- */

  $$('.qa').forEach((qa) => {
    $('.qa__q', qa).addEventListener('click', () => {
      const open = !qa.classList.contains('is-open');
      $$('.qa.is-open').forEach((o) => {
        o.classList.remove('is-open');
        $('.qa__q', o).setAttribute('aria-expanded', 'false');
      });
      qa.classList.toggle('is-open', open);
      $('.qa__q', qa).setAttribute('aria-expanded', String(open));
      setTimeout(() => window.ScrollTrigger && ScrollTrigger.refresh(), 600);
    });
  });

  /* ---------- Роли: активная карточка по наведению / тапу ---------- */

  const roles = $$('.role');
  const setRole = (r) => roles.forEach((x) => x.classList.toggle('is-active', x === r));
  roles.forEach((r) => {
    r.addEventListener('mouseenter', () => !isMobile() && setRole(r));
    r.addEventListener('click', () => setRole(r));
  });
  $('.roles__grid').addEventListener('mouseleave', () => !isMobile() && setRole(roles[0]));

  /* ---------- Без GSAP или с reduced motion — статичная страница ---------- */

  const steps = $$('.step');

  function setStep(i) {
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
  }

  if (!window.gsap || !window.ScrollTrigger || reduceMotion) {
    steps.forEach((s, i) => s.addEventListener('click', () => setStep(i)));
    window.addEventListener('scroll', () => onScrollNav(window.scrollY), { passive: true });
    window.addEventListener('resize', fitPhones);
    $$('.step__bar i').forEach((b) => b.style.setProperty('--p', 1));
    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', () => setMenu(false)));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Плавный скролл ---------- */

  if (window.Lenis) {
    window.lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on('scroll', (e) => { ScrollTrigger.update(); onScrollNav(e.scroll); });
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    window.addEventListener('scroll', () => onScrollNav(window.scrollY), { passive: true });
  }

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      setMenu(false);
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      if (window.lenis) lenis.scrollTo(target, { offset: id === '#top' ? 0 : -10, duration: 1.4 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- Hero: появление ---------- */

  const heroWords = $$('.hero__title .w');
  const heroFades = $$('[data-hero-fade]');
  const sheet = $('.sheet', heroPhone);
  const chip = $('.scan__chip', heroPhone);
  const bracket = $('.scan__bracket', heroPhone);
  const scanLine = $('.scan__line', heroPhone);

  const boot = $('.scan__boot', heroPhone);
  const feed = $('.scan__feed', heroPhone);
  const flash = $('.scan__flash', heroPhone);
  const benefitTicks = $$('.hero__benefits svg');

  gsap.set(heroWords, { yPercent: 115, rotate: 6, filter: 'blur(8px)', transformOrigin: '0% 100%' });
  gsap.set(heroFades, { autoAlpha: 0, y: 24 });
  gsap.set(heroPhone, { autoAlpha: 0, y: 180, rotationX: 32, transformPerspective: 1400 });
  gsap.set(benefitTicks, { strokeDashoffset: 16 });
  gsap.set(sheet, { yPercent: 105 });
  gsap.set(chip, { autoAlpha: 0, scale: .6, y: 8 });
  gsap.set(bracket, { autoAlpha: 0, scale: 1.25 });
  gsap.set('.nav__inner', { autoAlpha: 0, y: -20 });

  const intro = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: .1 });
  intro
    .fromTo('.hero__bg', { scale: 1.18 }, { scale: 1, duration: 2.4, ease: 'power3.out' }, 0)
    .to('.nav__inner', { autoAlpha: 1, y: 0, duration: 1.2 }, .3)
    .to(heroWords, { yPercent: 0, rotate: 0, filter: 'blur(0px)', duration: 1.2, stagger: .06 }, .35)
    .to(heroFades, { autoAlpha: 1, y: 0, duration: 1.2, stagger: .1 }, .75)
    .to(benefitTicks, { strokeDashoffset: 0, duration: .6, stagger: .12, ease: 'power2.out' }, 1.2)
    // телефон поднимается из перспективы и «включается»
    .to(heroPhone, { autoAlpha: 1, y: 0, rotationX: 0, duration: 1.7 }, .45)
    .fromTo(feed, { scale: 1.2, filter: 'blur(10px) brightness(.4)' }, { scale: 1, filter: 'blur(0px) brightness(1)', duration: 1.4, ease: 'power3.out' }, 1.05)
    .to(boot, { autoAlpha: 0, duration: .5, ease: 'power2.out' }, 1.05)
    .add(() => { if (!travelling) scanLoop.play(0); }, 1.7);

  // Цикл сканирования номера: рамка → луч → «распознан» → карточка клиента
  const scanLoop = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 2.4 });
  scanLoop
    .set(scanLine, { top: 0, autoAlpha: 0 })
    .to(bracket, { autoAlpha: 1, scale: 1, duration: .7, ease: 'expo.out' })
    .to(scanLine, { autoAlpha: 1, duration: .15 }, '<.2')
    .to(scanLine, { top: 82, duration: .7, ease: 'sine.inOut', yoyo: true, repeat: 1 }, '<')
    .to(scanLine, { autoAlpha: 0, duration: .2 })
    .to(bracket, { scale: 1.04, duration: .18, yoyo: true, repeat: 1, ease: 'power2.out' }, '<')
    .fromTo(flash, { opacity: 0 }, { opacity: 1, duration: .12, yoyo: true, repeat: 1, ease: 'power1.out' }, '<')
    .to(chip, { autoAlpha: 1, scale: 1, y: 0, duration: .6, ease: 'back.out(2.2)' }, '<')
    .to(sheet, { yPercent: 0, duration: .9, ease: 'expo.out' }, '<.15')
    .from($$('.sheet > *', heroPhone), { y: 18, autoAlpha: 0, duration: .6, stagger: .05, ease: 'power3.out' }, '<.1')
    .to({}, { duration: 3.2 })
    .to(sheet, { yPercent: 105, duration: .7, ease: 'power3.in' })
    .to(chip, { autoAlpha: 0, scale: .8, duration: .3 }, '<.2')
    .to(bracket, { autoAlpha: 0, scale: 1.15, duration: .4 }, '<');

  /* ---------- Hero: параллакс при скролле ---------- */

  const mm = gsap.matchMedia();

  mm.add('(min-width: 901px)', () => {
    gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero__bg', { yPercent: 14, scale: 1.06, ease: 'none' }, 0)
      .to('.hero__text', { y: -120, autoAlpha: .2, ease: 'none' }, 0);
  });
  mm.add('(max-width: 900px)', () => {
    gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero__bg', { yPercent: 10, ease: 'none' }, 0);
  });

  /* ---------- Общие появления ---------- */

  $$('[data-split]').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.from($$('.line > span', el), {
      yPercent: 110,
      rotate: 3,
      transformOrigin: '0% 100%',
      duration: 1.2,
      stagger: .09,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  $$('[data-reveal]').forEach((el) => {
    const scale = el.dataset.reveal === 'scale';
    gsap.from(el, {
      autoAlpha: 0,
      y: scale ? 0 : 28,
      scale: scale ? .94 : 1,
      duration: 1.2,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  /* ---------- Как работает: закреплённая секция с 5 шагами ---------- */

  let current = -1;
  const bars = $$('.step__bar i');
  const STEP_VH = () => (isMobile() ? .8 : 1.15);

  function goTo(i) {
    if (i === current) return;
    current = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
  }
  goTo(0);

  // Телефон «живёт» как приложение, всё привязано к скроллу:
  // шаг i занимает отрезок [i, i+1] таймлайна
  const cam = $('.stage__cam');
  const app = $('.app');
  const L = (c) => $('.l-' + c);
  // Приблизить камеру в zoom раз так, чтобы точка экрана на высоте f (0..1) оказалась в центре
  // Камера: приблизить в zoom раз так, чтобы точка экрана на высоте f (0..1) оказалась в центре.
  // На десктопе приближение сильное — телефон выходит за края экрана, на мобилке мягче
  const Z = (k) => () => (isMobile() ? 1 + (k - 1) * .45 : k);
  const cam$ = (k, f, dur = .35) => ({
    scale: Z(k),
    y: () => -(f - .5) * 680 * gsap.getProperty(stagePhone, 'scale') * Z(k)(),
    duration: dur,
    ease: 'power2.inOut',
  });
  const sheetUp = { yPercent: 0, duration: .3, ease: 'power3.out' };
  const sheetDown = { yPercent: 100, duration: .25, ease: 'power2.in' };

  gsap.set([L('add'), L('pay')], { yPercent: 100 });
  gsap.set(app, { xPercent: 100 });

  const appTl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
    // 01 — телефон «наезжает» на номер, потом камера спускается к карточке клиента
    .to(cam, cam$(1.75, .37, .4), 0)
    .to(cam, cam$(1.75, .76, .4), .5)
    // 01 → 02: главный экран въезжает как переход в iOS, камера уходит наверх
    .to(L('scan'), { xPercent: -30, filter: 'brightness(.55)', duration: .35, ease: 'power2.inOut' }, .95)
    .to(app, { xPercent: 0, duration: .35, ease: 'power2.inOut' }, .95)
    .to(cam, cam$(1.6, .3, .35), .95)
    // шторка услуг, камера скользит по списку вниз к итогу
    .to(L('dim'), { opacity: 1, duration: .2 }, 1.3)
    .to(L('add'), sheetUp, 1.3)
    .to(cam, cam$(1.75, .6, .3), 1.4)
    .to(cam, cam$(1.75, .82, .3), 1.72)
    // 02 → 03: шторка уходит, камера проходит по карточкам машин
    .to(L('add'), sheetDown, 2.05)
    .to(L('dim'), { opacity: 0, duration: .2 }, 2.1)
    .to(cam, cam$(1.7, .45, .3), 2.1)
    .to(cam, cam$(1.7, .78, .35), 2.5)
    // 03 → 04: шторка оплаты, камера на способах оплаты
    .to(L('dim'), { opacity: 1, duration: .2 }, 3.05)
    .to(L('pay'), sheetUp, 3.05)
    .to(cam, cam$(1.75, .8, .3), 3.1)
    // 04 → 05: оплата принята, сверху падает WhatsApp, камера поднимается к нему
    .to(L('pay'), sheetDown, 4.0)
    .to(L('dim'), { opacity: 0, duration: .2 }, 4.05)
    .to(cam, cam$(1.85, .16, .3), 4.05)
    .fromTo(L('toast'), { yPercent: -30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .3, ease: 'back.out(1.6)' }, 4.15)
    // в конце телефон отъезжает и показывается целиком
    .to(cam, cam$(1, .5, .3), 4.7);

  // Касание пальцем: точка экрана (x, y в долях) в момент at
  const tapEl = $('.tap');
  const tap = (at, x, y) => appTl
    .set(tapEl, { left: x * 100 + '%', top: y * 100 + '%' }, at)
    .fromTo(tapEl, { scale: 1.8, opacity: 0 }, { scale: 1, opacity: 1, duration: .06, immediateRender: false }, at)
    .to(tapEl, { scale: .82, duration: .04 }, at + .06)
    .to(tapEl, { scale: 2.2, opacity: 0, duration: .1 }, at + .1);
  tap(.83, .5, .91);   // «Создать заказ»
  tap(1.58, .13, .617); // отметить «Сухой туман»
  appTl.fromTo(L('check'), { opacity: 0, scale: .4 }, { opacity: 1, scale: 1, duration: .05, ease: 'back.out(3)', immediateRender: false }, 1.63)
    .to(L('check'), { opacity: 0, duration: .05 }, 2.05);
  tap(1.93, .5, .945);  // «Добавить в заказ»
  tap(2.92, .65, .573); // «Принять оплату»
  tap(3.86, .5, .928);  // «Принять 6 000 ₸»

  gsap.set(stagePhone, { transformPerspective: 1600 });
  const tiltX = gsap.quickTo(stagePhone, 'rotationX', { duration: .8, ease: 'power3.out' });
  const settle = gsap.delayedCall(.12, () => tiltX(0)).pause();

  const howST = ScrollTrigger.create({
    trigger: '.how__pin',
    start: 'top top',
    end: () => '+=' + window.innerHeight * STEP_VH() * steps.length,
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onRefresh: () => appTl.invalidate(),
    onUpdate(self) {
      // камера догоняет скролл с инерцией, телефон слегка наклоняется от скорости
      gsap.to(appTl, { progress: self.progress, duration: .7, ease: 'power3.out', overwrite: true });
      tiltX(gsap.utils.clamp(-7, 7, -self.getVelocity() / 300));
      settle.restart(true);
      const p = self.progress * steps.length;
      const i = Math.min(steps.length - 1, Math.floor(p));
      goTo(i);
      bars.forEach((b, k) => b.style.setProperty('--p', k < i ? 1 : k === i ? Math.min(1, p - i) : 0));
    },
  });

  /* ---------- Телефон из hero спускается в блок «5 шагов» ---------- */

  const phoneWrap = heroPhone.parentElement;
  const pin = $('.how__pin');

  // Где окажется центр телефона сцены в момент закрепления секции (координаты документа)
  function travelTarget() {
    const pr = pin.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const inner = $('.hero__inner');
    const wrapTop = hero.offsetTop + inner.offsetTop + phoneWrap.offsetTop;
    const wrapLeft = hero.offsetLeft + inner.offsetLeft + phoneWrap.offsetLeft;
    const s = gsap.getProperty(stagePhone, 'scale');
    const h = gsap.getProperty(heroPhone, 'scale');
    const cx = sr.left + sr.width / 2;
    const cy = howST.start + (sr.top - pr.top) + sr.height / 2;
    return { x: cx - wrapLeft - 165, y: cy - wrapTop - 340 * s, k: s / h };
  }

  // Карточка распознанного номера должна быть открыта, когда телефон «приезжает»
  let travelling = false;
  function setTravelling(on) {
    if (on === travelling) return;
    travelling = on;
    if (on) {
      scanLoop.pause();
      gsap.to(sheet, { yPercent: 0, duration: .6, ease: 'expo.out', overwrite: true });
      gsap.to(chip, { autoAlpha: 1, scale: 1, y: 0, duration: .4, overwrite: true });
      gsap.to(bracket, { autoAlpha: 1, scale: 1, duration: .4, overwrite: true });
      gsap.to($$('.sheet > *', heroPhone), { autoAlpha: 1, y: 0, duration: .4, overwrite: true });
      gsap.set(scanLine, { autoAlpha: 0 });
    } else if (intro.progress() === 1) {
      scanLoop.play(0);
    }
  }

  function handoff(landed) {
    gsap.set(phoneWrap, { autoAlpha: landed ? 0 : 1 });
    gsap.set(stagePhone, { autoAlpha: landed ? 1 : 0 });
  }
  handoff(false);

  // Полёт по дуге: x догоняет позже y, в пути телефон поворачивается и «приподнимается» тенью
  gsap.set(phoneWrap, { transformPerspective: 1400 });
  const travelTl = gsap.timeline({
    defaults: { immediateRender: false },
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: () => howST.start,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => setTravelling(self.progress > .01),
      onLeave: () => handoff(true),
      onEnterBack: () => handoff(false),
    },
  })
    .fromTo(phoneWrap, { x: 0 }, { x: () => travelTarget().x, duration: 1, ease: 'sine.in' }, 0)
    .fromTo(phoneWrap, { y: 0 }, { y: () => travelTarget().y, duration: 1, ease: 'sine.inOut' }, 0)
    .fromTo(phoneWrap, { scale: 1 }, { scale: () => travelTarget().k, duration: 1, ease: 'power1.inOut' }, 0)
    .fromTo(phoneWrap, { rotation: 0, rotationY: 0 }, { rotation: -9, rotationY: 38, duration: .5, ease: 'sine.out' }, 0)
    .to(phoneWrap, { rotation: 0, rotationY: 0, duration: .5, ease: 'sine.in' }, .5)
    .fromTo(heroPhone, { boxShadow: '0 40px 90px -10px rgba(0,0,0,.5)' }, { boxShadow: '0 90px 140px -20px rgba(18,20,26,.45)', duration: .5 }, 0)
    .to(heroPhone, { boxShadow: '0 40px 80px -10px rgba(18,20,26,.22)', duration: .5 }, .5)
    .fromTo('.hero__whiteout', { opacity: 0 }, { opacity: 1, duration: .8, ease: 'power1.in' }, .1);

  // прогресс перелёта нужен 3D-телефону (phone3d.js)
  window.PCRM = { travel: travelTl.scrollTrigger };

  steps.forEach((s, i) => {
    s.addEventListener('click', () => {
      const y = howST.start + (howST.end - howST.start) * ((i + .05) / steps.length);
      if (window.lenis) lenis.scrollTo(y, { duration: 1.2 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  /* ---------- Фичи ---------- */

  $$('.feature').forEach((f) => {
    const card = $('.card', f);
    const dir = f.classList.contains('feature--reverse') ? -1 : 1;

    // плашка «раскрывается» из скруглённого окна
    gsap.fromTo(f, { clipPath: 'inset(9% 7% 9% 7% round 64px)', y: 70 }, {
      clipPath: `inset(0% 0% 0% 0% round ${isMobile() ? 24 : 32}px)`, y: 0, ease: 'none',
      scrollTrigger: { trigger: f, start: 'top bottom', end: 'top 50%', scrub: .6 },
    });

    gsap.fromTo(card, { rotate: dir * 7, y: 90, xPercent: dir * 4 }, {
      rotate: 0, y: 0, xPercent: 0, ease: 'none',
      scrollTrigger: { trigger: f, start: 'top 95%', end: 'top 30%', scrub: .8 },
    });

    const checks = $$('.checks li', f);
    gsap.from(checks, {
      autoAlpha: 0, x: -16, duration: .9, stagger: .08, ease: 'expo.out',
      scrollTrigger: { trigger: f, start: 'top 65%' },
    });
    gsap.from($('.feature__text > p', f), {
      autoAlpha: 0, y: 20, duration: 1, ease: 'expo.out',
      scrollTrigger: { trigger: f, start: 'top 70%' },
    });

    const chartBars = $$('.bars i', f);
    if (chartBars.length) {
      gsap.from(chartBars, {
        scaleY: 0, duration: 1.1, stagger: .05, ease: 'expo.out',
        scrollTrigger: { trigger: card, start: 'top 75%' },
      });
    }
    const meters = $$('.meter i', f);
    if (meters.length) {
      gsap.from(meters, {
        scaleX: 0, duration: 1.4, stagger: .12, ease: 'expo.out',
        scrollTrigger: { trigger: card, start: 'top 75%' },
      });
    }
  });

  // Счётчики
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
  $$('[data-count]').forEach((el) => {
    const to = +el.dataset.count;
    const o = { v: 0 };
    gsap.to(o, {
      v: to, duration: 1.6, ease: 'expo.out',
      onUpdate: () => (el.textContent = fmt(o.v)),
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  gsap.from('.tile', {
    autoAlpha: 0, y: 60, rotationX: -45, transformPerspective: 900, transformOrigin: '50% 0%',
    duration: 1.2, stagger: .08, ease: 'expo.out',
    scrollTrigger: { trigger: '.modules__grid', start: 'top 85%' },
  });

  /* ---------- Роли ---------- */

  gsap.from(roles, {
    autoAlpha: 0, y: 70, rotate: (i) => (i - 1) * 2, duration: 1.2, stagger: .1, ease: 'expo.out',
    scrollTrigger: { trigger: '.roles__grid', start: 'top 82%' },
  });

  /* ---------- Сравнение ---------- */

  gsap.from('.cmp', {
    autoAlpha: 0, y: 60, duration: 1.2, stagger: .12, ease: 'expo.out',
    scrollTrigger: { trigger: '.compare__grid', start: 'top 82%' },
  });
  gsap.from('.cmp--old li', {
    autoAlpha: 0, x: -14, duration: .8, stagger: .06, ease: 'expo.out',
    scrollTrigger: { trigger: '.compare__grid', start: 'top 70%' },
  });
  gsap.from('.cmp--new li', {
    autoAlpha: 0, x: 14, duration: .8, stagger: .06, ease: 'expo.out', delay: .15,
    scrollTrigger: { trigger: '.compare__grid', start: 'top 70%' },
  });
  gsap.timeline({ scrollTrigger: { trigger: '.compare__grid', start: 'top 55%', end: 'bottom 45%', scrub: .6 } })
    .fromTo('.cmp--old', { opacity: 1, filter: 'grayscale(0)', scale: 1 }, { opacity: .55, filter: 'grayscale(1)', scale: .98, ease: 'none', immediateRender: false }, 0)
    .fromTo('.cmp--new', { scale: 1, boxShadow: '0 0 0 0 rgba(18,20,26,0)' }, { scale: 1.02, boxShadow: '0 40px 80px -20px rgba(18,20,26,.45)', ease: 'none', immediateRender: false }, 0);
  gsap.from('.cmp--new li i', {
    scale: 0, duration: .7, stagger: .06, ease: 'back.out(3)', delay: .35,
    scrollTrigger: { trigger: '.compare__grid', start: 'top 70%' },
  });

  /* ---------- FAQ ---------- */

  gsap.from('.qa', {
    autoAlpha: 0, y: 24, duration: 1, stagger: .06, ease: 'expo.out',
    scrollTrigger: { trigger: '#faq-list', start: 'top 85%' },
  });

  /* ---------- Финальный CTA ---------- */

  gsap.fromTo('.cta__block', { scale: .88, borderRadius: 64 }, {
    scale: 1, borderRadius: 24, ease: 'none',
    scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'top 30%', scrub: .6 },
  });
  gsap.fromTo('.cta__phone', { yPercent: 45, rotate: 10, xPercent: 8 }, {
    yPercent: 0, rotate: 0, xPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '.cta__block', start: 'top 90%', end: 'center 60%', scrub: .8 },
  });

  gsap.to('.cta__phone', { y: -14, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  /* ---------- Курсор: подсветка карточек и «магнитные» кнопки ---------- */

  if (window.matchMedia('(hover: hover)').matches) {
    $$('.tile, .role, .cmp').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', e.clientX - r.left + 'px');
        el.style.setProperty('--my', e.clientY - r.top + 'px');
      });
    });
    $$('.store, .btn--primary, .btn--dark').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: .5, ease: 'power3.out' });
      const my = gsap.quickTo(el, 'y', { duration: .5, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * .18);
        my((e.clientY - r.top - r.height / 2) * .3);
      });
      el.addEventListener('pointerleave', () => { mx(0); my(0); });
    });
  }

  /* ---------- Пересчёт ---------- */

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { fitPhones(); ScrollTrigger.refresh(); }, 150);
  });
  window.addEventListener('load', () => { fitPhones(); ScrollTrigger.refresh(); });
})();
