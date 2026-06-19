// ========================================
// SCENE MANAGER
// ========================================
const SceneManager = {
    currentScene: 1,

    goToScene(n) {
        const from = document.querySelector(`#scene-${this.currentScene}`);
        const to   = document.querySelector(`#scene-${n}`);
        if (!to) return;

        const prev = this.currentScene;
        this.currentScene = n;

        gsap.to(from, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => from.classList.remove('is-active')
        });

        to.classList.add('is-active');
        gsap.fromTo(to, { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.3 });
    }
};

// ========================================
// SCENE 1 — ENVELOPE
// ========================================
const Scene1 = {

    init() {
        this.envelope  = document.getElementById('envelope');
        this.flap      = document.getElementById('flap');
        this.hint      = document.getElementById('click-hint');
        this.container = document.getElementById('envelope-container');
        this.opened    = false;

        this.playEntry();
        this.container.addEventListener('click', () => this.open());
    },

    // Envelope pops in on load
    playEntry() {
        gsap.from(this.envelope, {
            scale: 0,
            rotation: -20,
            opacity: 0,
            duration: 1.1,
            ease: 'back.out(1.6)',
            delay: 0.2
        });
        gsap.from(this.hint, {
            opacity: 0,
            y: 16,
            duration: 0.7,
            delay: 1.1,
            ease: 'power2.out'
        });
    },

    open() {
        if (this.opened) return;
        this.opened = true;

        // Start background music on first user interaction
        MusicPlayer.start();

        const tl = gsap.timeline();

        // 1. Pause the CSS float animation cleanly
        tl.call(() => {
            this.envelope.style.animation = 'none';
        })

        // 2. Settle to neutral position
        .to(this.envelope, {
            rotation: 0,
            y: 0,
            duration: 0.25,
            ease: 'power2.out'
        })

        // 3. Excited wiggle
        .to(this.envelope, { rotation: -6,  duration: 0.08, ease: 'none' })
        .to(this.envelope, { rotation:  6,  duration: 0.08, ease: 'none' })
        .to(this.envelope, { rotation: -4,  duration: 0.07, ease: 'none' })
        .to(this.envelope, { rotation:  4,  duration: 0.07, ease: 'none' })
        .to(this.envelope, { rotation:  0,  duration: 0.07, ease: 'none' })

        // 4. Fade hint
        .to(this.hint, {
            opacity: 0,
            y: 8,
            duration: 0.3,
            ease: 'power1.in'
        }, '<')

        // 5. FLAP OPEN:
        //    The flap is a ▽ triangle anchored at its top-left.
        //    rotationX: -180 spins it backward around the top edge
        //    so it folds up and away — like a real envelope opening.
        .to(this.flap, {
            rotationX: -180,
            duration: 0.75,
            ease: 'back.out(1.3)',
            transformOrigin: 'top left'
        }, '+=0.1')

        // 6. Brief pause so the open flap is visible
        .to({}, { duration: 0.4 })

        // 7. Transition out to Scene 2
        .to(this.envelope, {
            scale: 0.85,
            y: -40,
            opacity: 0,
            duration: 0.6,
            ease: 'power2.in',
            onComplete: () => SceneManager.goToScene(2)
        });
    }
};



// ========================================
// SCENE 2 — LOVE LETTER
// ========================================
const Scene2 = {

    SALUTATION: 'Dear Dad,',

    init() {
        this.paper   = document.getElementById('letter-paper');
        this.sal     = document.getElementById('letter-salutation');
        this.body    = document.getElementById('letter-body');
        this.closing = document.getElementById('letter-closing');
        this.hint    = document.getElementById('outside-hint');
        this.overlay = document.getElementById('letter-overlay');

        // Click OUTSIDE the paper (on the overlay) → advance
        this.overlay.addEventListener('click', () => this.exit());

        // Stop clicks on the paper from bubbling to the overlay
        this.paper.addEventListener('click', e => e.stopPropagation());
    },

    enter() {
        this._exiting = false;

        // Reset in case of revisit
        this.sal.textContent = '';
        gsap.set(this.body.querySelectorAll('p'), { opacity: 0 });
        gsap.set([this.closing, this.hint], { opacity: 0 });

        const tl = gsap.timeline();

        // 1. Paper slides + fades in
        tl.from(this.paper, {
            opacity: 0,
            y: 40,
            duration: 0.9,
            ease: 'power3.out'
        })

        // 2. Typewriter on "Dear Emily,"
        .call(() => {
            this.typewrite(this.SALUTATION, this.sal, 60, () => {
                // 3. Stagger-fade the body paragraphs
                gsap.to(this.body.querySelectorAll('p'), {
                    opacity: 1,
                    duration: 0.7,
                    stagger: 0.2,
                    ease: 'power2.out',
                    onComplete: () => {
                        // 4. Fade in closing
                        gsap.to(this.closing, {
                            opacity: 1,
                            duration: 0.7,
                            ease: 'power2.out',
                            onComplete: () => {
                                // 5. Reveal hint
                                gsap.to(this.hint, { opacity: 1, duration: 0.6 });
                            }
                        });
                    }
                });
            });
        }, null, '+=0.2');
    },

    typewrite(text, el, msPerChar, onDone) {
        const cursor = document.createElement('span');
        cursor.className = 'tw-cursor';
        el.appendChild(cursor);

        let i = 0;
        const tick = () => {
            if (i < text.length) {
                el.insertBefore(document.createTextNode(text[i]), cursor);
                i++;
                setTimeout(tick, msPerChar);
            } else {
                setTimeout(() => {
                    cursor.remove();
                    if (onDone) onDone();
                }, 500);
            }
        };
        tick();
    },

    exit() {
        if (this._exiting) return;
        this._exiting = true;

        gsap.to(document.getElementById('letter-wrapper'), {
            opacity: 0,
            y: -30,
            duration: 0.6,
            ease: 'power2.in',
            onComplete: () => SceneManager.goToScene(8)
        });
    }
};

// ========================================
// MUSIC PLAYER
// ========================================
const MusicPlayer = {
    init() {
        this.audio  = document.getElementById('bg-music');
        this.toggle = document.getElementById('music-toggle');
        this.icon   = document.getElementById('music-icon');
        this.started = false;

        this.toggle.addEventListener('click', () => this.togglePlay());

        // Handle browsers that suspend even after user gesture
        this.audio.addEventListener('play',  () => this._setPlaying(true));
        this.audio.addEventListener('pause', () => this._setPlaying(false));
    },

    start() {
        if (this.started) return;
        this.started = true;

        this.audio.volume = 0;
        this.audio.play().then(() => {
            // Fade volume in gently
            this.toggle.hidden = false;
            gsap.to(this.audio, { volume: 0.55, duration: 2.5, ease: 'power1.inOut' });
            gsap.from(this.toggle, { opacity: 0, scale: 0.6, duration: 0.5, ease: 'back.out(2)', delay: 0.5 });
            this._setPlaying(true);
        }).catch(() => {
            // Autoplay blocked — show toggle so user can manually start
            this.toggle.hidden = false;
        });
    },

    togglePlay() {
        if (this.audio.paused) {
            this.audio.play();
        } else {
            this.audio.pause();
        }
    },

    _setPlaying(playing) {
        this.icon.textContent = playing ? '♪' : '♩';
        this.toggle.classList.toggle('is-playing', playing);
    }
};

// ========================================
// SCENE 8 — THE END
// ========================================
const Scene8 = {
    init() {
        this.wrapper = document.getElementById('ending-wrapper');
        this.l1      = document.getElementById('ending-l1');
        this.l2      = document.getElementById('ending-l2');
        this.l3      = document.getElementById('ending-l3');
        this.hearts  = document.getElementById('ending-hearts');
    },

    enter() {
        // Reset
        gsap.set([this.l1, this.l2, this.l3, this.hearts], { opacity: 0, y: 30 });
        gsap.set(this.wrapper, { opacity: 1 });

        const tl = gsap.timeline();

        // "The End!" — big dramatic entrance
        tl.to(this.l1, {
            opacity: 1, y: 0,
            duration: 1.0,
            ease: 'back.out(1.4)',
            delay: 0.3
        })
        // Rest of the message fades in line by line
        .to(this.l2, {
            opacity: 1, y: 0,
            duration: 0.7, ease: 'power2.out'
        }, '+=0.15')
        .to(this.l3, {
            opacity: 1, y: 0,
            duration: 0.7, ease: 'power2.out'
        }, '-=0.3')
        // Hearts float in
        .to(this.hearts, {
            opacity: 1, y: 0,
            duration: 0.6, ease: 'power2.out'
        }, '+=0.2');
    }
};

// ========================================
// BOOT — wire everything up
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    MusicPlayer.init();
    Scene1.init();
    Scene2.init();
    Scene8.init();
});

// Patch SceneManager to call scene enter() hooks
const _origGoTo = SceneManager.goToScene.bind(SceneManager);
SceneManager.goToScene = function(n) {
    _origGoTo(n);
    if (n === 2) setTimeout(() => Scene2.enter(), 350);
    if (n === 8) setTimeout(() => Scene8.enter(), 400);
};
