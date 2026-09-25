(() => {
  "use strict";

  const header = document.querySelector("[data-header]");
  const hero = document.querySelector("[data-hero-cinema]");
  const heroLogo = document.querySelector("[data-hero-logo]");
  const heroCrown = document.querySelector("[data-hero-crown]");
  const heroCopy = document.querySelector("[data-hero-copy]");
  const heroCaption = document.querySelector("[data-hero-caption]");
  const story = document.querySelector("[data-story]");
  const storyScenes = [...document.querySelectorAll("[data-story-scene]")];
  const storyIndex = document.querySelector("[data-story-index]");
  const storyProgress = document.querySelector("[data-story-progress]");
  const work = document.querySelector("[data-work]");
  const workTrack = document.querySelector("[data-work-track]");
  const channels = document.querySelector("[data-channels]");
  const finale = document.querySelector("[data-finale]");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 20);
  setHeader();
  addEventListener("scroll", setHeader, { passive: true });

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  if (reduced || !gsap || !ScrollTrigger) {
    document.body.classList.add("motion-fallback");
    storyScenes.forEach((scene) => scene.classList.add("is-active"));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis) {
    try {
      const lenis = new window.Lenis({
        duration: 1.08,
        smoothWheel: true,
        wheelMultiplier: .92,
        touchMultiplier: 1
      });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } catch (_) {
      // Native scrolling remains the fallback.
    }
  }

  const threeState = { progress: 0, pointerX: 0, pointerY: 0 };

  if (hero && heroLogo && heroCrown && heroCopy && heroCaption) {
    const heroTl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.05,
        onUpdate: (self) => { threeState.progress = self.progress; }
      }
    });

    heroTl
      .to(heroLogo, { scale: 4.8, yPercent: -16, opacity: 0, duration: 1.15 }, 0)
      .fromTo(heroCrown,
        { scale: .34, opacity: 0, rotate: -8 },
        { scale: 1, opacity: .94, rotate: 0, duration: .62 },
        .16
      )
      .to(heroCrown, { scale: 1.2, yPercent: -14, opacity: .16, duration: .56 }, .72)
      .fromTo(heroCopy,
        { y: 70, opacity: 0 },
        { y: 0, opacity: 1, duration: .5 },
        .46
      )
      .to(heroCopy, { y: -42, opacity: .25, duration: .5 }, .92)
      .fromTo(heroCaption,
        { x: 34, opacity: 0 },
        { x: 0, opacity: 1, duration: .4 },
        .56
      )
      .to(heroCaption, { opacity: .15, duration: .25 }, 1.05);
  }

  if (story && storyScenes.length) {
    let activeScene = -1;

    const activateScene = (index) => {
      if (index === activeScene) return;
      activeScene = index;

      storyScenes.forEach((scene, i) => {
        if (i === index) {
          scene.classList.add("is-active");
          gsap.fromTo(scene,
            { opacity: 0, y: 56, scale: .985 },
            { opacity: 1, y: 0, scale: 1, duration: .72, ease: "power3.out", overwrite: true }
          );
        } else {
          scene.classList.remove("is-active");
          gsap.to(scene, {
            opacity: 0,
            y: i < index ? -44 : 44,
            scale: .985,
            duration: .42,
            ease: "power2.out",
            overwrite: true
          });
        }
      });

      if (storyIndex) storyIndex.textContent = String(index + 1).padStart(2, "0");
    };

    activateScene(0);

    ScrollTrigger.create({
      trigger: story,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const index = Math.min(
          storyScenes.length - 1,
          Math.floor(self.progress * storyScenes.length)
        );
        activateScene(index);
        if (storyProgress) storyProgress.style.width = (self.progress * 100).toFixed(2) + "%";
      }
    });
  }

  if (work && workTrack) {
    const getDistance = () => Math.max(0, workTrack.scrollWidth - innerWidth * .88);
    gsap.to(workTrack, {
      x: () => -getDistance(),
      ease: "none",
      scrollTrigger: {
        trigger: work,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        invalidateOnRefresh: true
      }
    });

    gsap.from(".work-card", {
      opacity: .2,
      scale: .94,
      stagger: .08,
      scrollTrigger: {
        trigger: work,
        start: "top 70%",
        end: "top top",
        scrub: true
      }
    });
  }

  if (channels) {
    const nodes = [...channels.querySelectorAll(".channel-node")];
    const core = channels.querySelector(".channel-core");

    gsap.fromTo(core,
      { scale: .62, opacity: .2, rotate: -16 },
      {
        scale: 1, opacity: 1, rotate: 0, ease: "none",
        scrollTrigger: { trigger: channels, start: "top top", end: "45% top", scrub: 1 }
      }
    );

    nodes.forEach((node, i) => {
      gsap.fromTo(node,
        { left: "50%", top: "50%", opacity: 0, scale: .7 },
        {
          opacity: 1,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: channels,
            start: () => (7 + i * 4) + "% top",
            end: () => (42 + i * 5) + "% top",
            scrub: 1
          }
        }
      );
    });

    gsap.to(".channel-stage", {
      rotate: 10,
      scale: 1.08,
      ease: "none",
      scrollTrigger: { trigger: channels, start: "45% top", end: "bottom bottom", scrub: 1 }
    });
  }

  if (finale) {
    const mark = finale.querySelector(".finale-mark");
    const title = finale.querySelector("h2");
    if (mark) {
      gsap.fromTo(mark,
        { scale: .52, opacity: .12 },
        {
          scale: 1, opacity: 1, ease: "none",
          scrollTrigger: { trigger: finale, start: "top 85%", end: "center center", scrub: 1 }
        }
      );
    }
    if (title) {
      gsap.from(title, {
        y: 70,
        opacity: 0,
        scrollTrigger: { trigger: finale, start: "top 58%", end: "center center", scrub: 1 }
      });
    }
  }

  const canvas = document.getElementById("fidel-canvas");
  if (canvas) {
    import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js")
      .then((THREE) => {
        const renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: "high-performance"
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
        renderer.setSize(innerWidth, innerHeight, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .1, 100);
        camera.position.set(0, 0, 8.2);

        const group = new THREE.Group();
        scene.add(group);

        const glass = new THREE.MeshPhysicalMaterial({
          color: 0x090909,
          roughness: .18,
          metalness: .16,
          transmission: .42,
          thickness: 1.4,
          transparent: true,
          opacity: .78,
          clearcoat: 1,
          clearcoatRoughness: .13
        });

        const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.42, 5), glass);
        core.scale.set(1.1, 1.1, .78);
        group.add(core);

        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: .12
        });

        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.15, .018, 12, 180), ringMaterial);
        ring1.rotation.x = Math.PI * .34;
        ring1.rotation.y = Math.PI * .12;
        group.add(ring1);

        const ring2Material = ringMaterial.clone();
        ring2Material.opacity = .055;
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.65, .012, 10, 180), ring2Material);
        ring2.rotation.x = Math.PI * .61;
        ring2.rotation.y = Math.PI * .28;
        group.add(ring2);

        const lightA = new THREE.PointLight(0xffffff, 9, 20);
        lightA.position.set(4, 4, 5);
        scene.add(lightA);

        const lightB = new THREE.PointLight(0x8aa7c8, 4, 16);
        lightB.position.set(-4, -2, 3);
        scene.add(lightB);

        scene.add(new THREE.AmbientLight(0xffffff, .38));

        new THREE.TextureLoader().load(
          "/assets/logos/orfidel-crown-white.svg",
          (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            const material = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              opacity: .88,
              depthWrite: false
            });
            const crown = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.3), material);
            crown.position.z = 1.35;
            group.add(crown);
          },
          undefined,
          () => {}
        );

        const resize = () => {
          renderer.setSize(innerWidth, innerHeight, false);
          camera.aspect = innerWidth / innerHeight;
          camera.updateProjectionMatrix();
        };
        addEventListener("resize", resize, { passive: true });

        addEventListener("pointermove", (event) => {
          threeState.pointerX = (event.clientX / innerWidth - .5) * 2;
          threeState.pointerY = (event.clientY / innerHeight - .5) * 2;
        }, { passive: true });

        const render = () => {
          const p = threeState.progress;
          const targetY = threeState.pointerX * .11 + p * .62;
          const targetX = -threeState.pointerY * .08 + p * .34;

          group.rotation.y += (targetY - group.rotation.y) * .045;
          group.rotation.x += (targetX - group.rotation.x) * .045;
          group.rotation.z = Math.sin(p * Math.PI) * .08;
          group.position.x = .95 - p * .75;
          group.position.y = .12 + Math.sin(p * Math.PI) * .24;
          group.scale.setScalar(.82 + p * .34);

          ring1.rotation.z += .0019;
          ring2.rotation.z -= .00105;
          ring2.rotation.y += .00065;

          renderer.render(scene, camera);
          requestAnimationFrame(render);
        };
        render();
      })
      .catch(() => {
        canvas.style.display = "none";
      });
  }

  ScrollTrigger.refresh();
})();
