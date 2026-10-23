const canvas = document.querySelector('.product-hw-canvas');

if (canvas) {
  const lazy = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    lazy.disconnect();
    const modelUrl = canvas.dataset.model;
    const modelBuf = fetch(modelUrl).then((res) => {
      if (!res.ok) throw new Error(res.statusText);
      return res.arrayBuffer();
    });
    init(
      modelBuf,
      import('three'),
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/utils/BufferGeometryUtils.js')
    );
  }, { rootMargin: '80% 0px' });
  lazy.observe(canvas);
}

async function init(modelBuf, threeMod, loaderMod, utilsMod) {
  const [THREE, { GLTFLoader }, { mergeVertices }, data] = await Promise.all([
    threeMod,
    loaderMod,
    utilsMod,
    modelBuf,
  ]);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.001, 100);
  const pivot = new THREE.Group();
  scene.add(pivot);

  const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  // Invisible fill that writes depth so back edges are hidden.
  const fillMat = new THREE.MeshBasicMaterial({
    colorWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const cameraHome = new THREE.Vector3();
  const eye = new THREE.Vector3();
  let model = null;
  let smooth = null;
  let silhouette = null;
  const pane = canvas.closest('.snap-pane') || canvas;
  const CRUISE = (Math.PI * 2) / 60;
  const FAST = CRUISE * 2.4;
  let ready = false;
  let inView = true;
  let last = 0;
  let lastTop = null;

  function frame() {
    const pull = camera.aspect >= 1
      ? Math.max(1, 1.3 / camera.aspect)
      : Math.max(1, Math.min(1.32, 0.9 / camera.aspect));
    camera.position.copy(cameraHome).multiplyScalar(pull);
    camera.lookAt(0, 0, 0);
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const dpr = renderer.getPixelRatio();
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      frame();
    }
  }

  // Curved surfaces have no feature edges, so outline them where the
  // surface turns away from the camera.
  function updateSilhouette() {
    pivot.updateMatrixWorld();
    model.worldToLocal(eye.copy(camera.position));
    const { ends, normals, count } = smooth;
    const out = silhouette.geometry.attributes.position;
    const dst = out.array;
    let n = 0;
    for (let e = 0; e < count; e++) {
      const o = e * 6;
      const dx = eye.x - ends[o];
      const dy = eye.y - ends[o + 1];
      const dz = eye.z - ends[o + 2];
      const d1 = normals[o] * dx + normals[o + 1] * dy + normals[o + 2] * dz;
      const d2 = normals[o + 3] * dx + normals[o + 4] * dy + normals[o + 5] * dz;
      if ((d1 > 0) !== (d2 > 0)) {
        dst.set(ends.subarray(o, o + 6), n * 6);
        n++;
      }
    }
    out.needsUpdate = true;
    silhouette.geometry.setDrawRange(0, n * 2);
  }

  function render() {
    resize();
    if (silhouette) updateSilhouette();
    renderer.render(scene, camera);
  }

  function collectSmoothEdges(geo, ends, normals) {
    const bare = new THREE.BufferGeometry();
    bare.setAttribute('position', geo.getAttribute('position'));
    if (geo.index) bare.setIndex(geo.index);
    const welded = mergeVertices(bare);
    const pos = welded.getAttribute('position');
    const idx = welded.index.array;
    const faces = idx.length / 3;
    const faceNormals = new Float32Array(faces * 3);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const seen = new Map();
    const pairs = [];
    const maxCos = Math.cos(THREE.MathUtils.degToRad(20));

    for (let f = 0; f < faces; f++) {
      const i0 = idx[f * 3];
      const i1 = idx[f * 3 + 1];
      const i2 = idx[f * 3 + 2];
      a.fromBufferAttribute(pos, i0);
      b.fromBufferAttribute(pos, i1).sub(a);
      c.fromBufferAttribute(pos, i2).sub(a);
      b.cross(c);
      const len = b.length();
      if (len > 0) b.divideScalar(len);
      faceNormals.set([b.x, b.y, b.z], f * 3);
      if (len === 0) continue;
      for (const [p, q] of [[i0, i1], [i1, i2], [i2, i0]]) {
        const lo = Math.min(p, q);
        const hi = Math.max(p, q);
        const key = lo * pos.count + hi;
        const prev = seen.get(key);
        if (prev === undefined) seen.set(key, f);
        else if (prev >= 0) {
          pairs.push(lo, hi, prev, f);
          seen.set(key, -1);
        }
      }
    }

    for (let i = 0; i < pairs.length; i += 4) {
      const f1 = pairs[i + 2] * 3;
      const f2 = pairs[i + 3] * 3;
      const cos =
        faceNormals[f1] * faceNormals[f2] +
        faceNormals[f1 + 1] * faceNormals[f2 + 1] +
        faceNormals[f1 + 2] * faceNormals[f2 + 2];
      if (cos < maxCos) continue;
      ends.push(
        pos.getX(pairs[i]), pos.getY(pairs[i]), pos.getZ(pairs[i]),
        pos.getX(pairs[i + 1]), pos.getY(pairs[i + 1]), pos.getZ(pairs[i + 1]),
      );
      normals.push(
        faceNormals[f1], faceNormals[f1 + 1], faceNormals[f1 + 2],
        faceNormals[f2], faceNormals[f2 + 1], faceNormals[f2 + 2],
      );
    }
  }

  function loop(now) {
    if (!inView || document.hidden || reduceMotion) {
      last = 0;
      lastTop = null;
      return;
    }
    const vh = window.innerHeight || 1;
    const top = pane.getBoundingClientRect().top;
    const lock = 1 - Math.min(1, Math.abs(top) / vh);
    const settled = lock * lock;
    const dTop = lastTop === null ? 0 : lastTop - top;
    lastTop = top;
    const dt = last ? Math.min((now - last) / 1000, 0.08) : 0;
    last = now;
    const idleSpeed = FAST + (CRUISE - FAST) * settled;
    const scrollSpin = (dTop / vh) * Math.PI * 2 * 0.18 * (1 - settled);
    pivot.rotation.y += dt * idleSpeed + scrollSpin;
    render();
    requestAnimationFrame(loop);
  }

  function start() {
    if (ready && inView && !document.hidden && !reduceMotion) requestAnimationFrame(loop);
  }

  new IntersectionObserver((entries) => {
    const was = inView;
    inView = entries[entries.length - 1].isIntersecting;
    if (inView && !was) start();
  }, { rootMargin: '15% 0px' }).observe(pane);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start();
  });

  window.addEventListener('resize', () => {
    if (ready && reduceMotion) render();
  });

  new GLTFLoader().parse(data, '', (gltf) => {
    const root = gltf.scene;
    const group = new THREE.Group();
    const ends = [];
    const normals = [];
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      const occluder = new THREE.Mesh(geo, fillMat);
      occluder.renderOrder = -1;
      group.add(occluder);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), edgeMat));
      collectSmoothEdges(geo, ends, normals);
    });

    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    group.position.sub(center);
    pivot.add(group);
    model = group;

    smooth = { ends: new Float32Array(ends), normals: new Float32Array(normals), count: ends.length / 6 };
    const silGeo = new THREE.BufferGeometry();
    silGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ends.length), 3));
    silhouette = new THREE.LineSegments(silGeo, edgeMat);
    silhouette.frustumCulled = false;
    group.add(silhouette);

    cameraHome.set(size * 0.9, size * 0.6, size * 0.9);
    camera.near = size / 100;
    camera.far = size * 10;
    camera.updateProjectionMatrix();
    frame();

    ready = true;
    render();
    start();
  });
}
