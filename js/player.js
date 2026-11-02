/**
 * Reprodutor de Mídia com suporte a Samsung Tizen AVPlay e HTML5 Hls.js
 */
const VideoPlayer = {
    isAvPlay: false,
    hls: null,
    videoElement: null,
    isPlaying: false,
    osdTimer: null,
    hudTimer: null,
    currentAspect: "fit", // fit, zoom, stretch
    volume: 100,
    isMuted: false,

    init() {
        this.videoElement = document.getElementById("video-player");
        this.avplayObject = document.getElementById("avplay-object");

        // Verifica se está rodando em uma Smart TV Samsung com suporte a AVPlay
        if (typeof window.webapis !== "undefined" && window.webapis.avplay) {
            this.isAvPlay = true;
            // Ativa o objeto AVPlay e oculta o video HTML5
            if (this.avplayObject) {
                this.avplayObject.setAttribute("type", "application/avplayer");
                this.avplayObject.style.display = "block";
            }
            if (this.videoElement) this.videoElement.style.display = "none";
            console.log("Iniciando player usando Samsung AVPlay nativo.");
        } else {
            this.isAvPlay = false;
            // Oculta o objeto AVPlay (evita o erro de plugin no navegador)
            if (this.avplayObject) this.avplayObject.style.display = "none";
            if (this.videoElement) this.videoElement.style.display = "block";
            console.log("Iniciando player usando HTML5 Video + Hls.js.");
        }

        // Listener de eventos do video HTML5
        if (this.videoElement) {
            this.videoElement.addEventListener("playing", () => {
                this.setLoading(false);
                this.isPlaying = true;
                this.updatePlayPauseBtn();
            });
            this.videoElement.addEventListener("waiting", () => this.setLoading(true));
            this.videoElement.addEventListener("error", (e) => {
                this.setLoading(false);
                console.error("Erro no player:", e);
                App.showToast("Erro ao reproduzir fluxo.");
            });
        }

        this.applyVolume();
    },

    setVolume(value) {
        this.volume = Math.max(0, Math.min(100, Math.round(value)));
        if (this.volume > 0 && this.isMuted) {
            this.isMuted = false;
        }
        this.applyVolume();
    },

    changeVolume(delta) {
        this.setVolume(this.volume + delta);
        this.showVolumeHud();
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.applyVolume();
        this.showVolumeHud();
    },

    applyVolume() {
        const effectiveLevel = this.isMuted ? 0 : this.volume;
        if (this.videoElement) {
            this.videoElement.volume = effectiveLevel / 100;
            this.videoElement.muted = this.isMuted;
        }

        // Suporte ao controle de áudio nativo Tizen se disponível
        if (typeof window.tizen !== "undefined" && window.tizen.tvaudiocontrol) {
            try {
                window.tizen.tvaudiocontrol.setVolume(Math.round(this.volume));
                window.tizen.tvaudiocontrol.setMute(this.isMuted);
            } catch (e) {}
        }

        // Atualiza controles na tela
        const slider = document.getElementById("slider-volume");
        if (slider) slider.value = this.volume;

        const text = document.getElementById("vol-level-text");
        if (text) text.innerText = this.isMuted ? "Mudo" : `${this.volume}%`;

        const muteBtn = document.getElementById("btn-vol-mute");
        if (muteBtn) {
            muteBtn.innerText = (this.isMuted || this.volume === 0) ? "🔇" : (this.volume < 50 ? "🔉" : "🔊");
        }

        // Atualiza HUD flutuante
        const hudIcon = document.getElementById("hud-vol-icon");
        const hudFill = document.getElementById("hud-vol-fill");
        const hudText = document.getElementById("hud-vol-text");
        if (hudIcon) hudIcon.innerText = (this.isMuted || this.volume === 0) ? "🔇" : (this.volume < 50 ? "🔉" : "🔊");
        if (hudFill) hudFill.style.width = `${effectiveLevel}%`;
        if (hudText) hudText.innerText = this.isMuted ? "Mudo" : `${this.volume}%`;
    },

    showVolumeHud() {
        const hud = document.getElementById("hud-volume");
        if (hud) hud.style.display = "flex";
        clearTimeout(this.hudTimer);
        this.hudTimer = setTimeout(() => {
            if (hud) hud.style.display = "none";
        }, 2200);
    },

    play(url, title = "Transmissão") {
        document.getElementById("osd-title").innerText = title;
        this.showOsd();
        this.setLoading(true);

        if (this.isAvPlay) {
            this.playWithAvPlay(url);
        } else {
            this.playWithHtml5(url);
        }
    },

    playWithAvPlay(url) {
        try {
            const avplay = window.webapis.avplay;
            avplay.close();
            avplay.open(url);
            avplay.setDisplayRect(0, 0, 1920, 1080);

            const listener = {
                onbufferingstart: () => VideoPlayer.setLoading(true),
                onbufferingcomplete: () => VideoPlayer.setLoading(false),
                onstreamcompleted: () => console.log("Stream completed"),
                onerror: (err) => {
                    console.error("AVPlay Error:", err);
                    VideoPlayer.setLoading(false);
                    App.showToast("Erro no fluxo (AVPlay)");
                }
            };
            avplay.setListener(listener);
            avplay.prepareAsync(() => {
                avplay.play();
                VideoPlayer.isPlaying = true;
                VideoPlayer.setLoading(false);
                VideoPlayer.updatePlayPauseBtn();
            }, (err) => {
                console.error("AVPlay prepareAsync erro:", err);
                VideoPlayer.setLoading(false);
            });
        } catch (e) {
            console.error("Falha ao inicializar AVPlay:", e);
            this.playWithHtml5(url);
        }
    },

    playWithHtml5(url) {
        if (!this.videoElement) return;

        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        const useHls = typeof Hls !== "undefined" && Hls.isSupported();

        if (useHls) {
            this.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                manifestLoadingTimeOut: 15000,
                levelLoadingTimeOut: 15000,
                fragLoadingTimeOut: 20000
            });
            this.hls.loadSource(url);
            this.hls.attachMedia(this.videoElement);
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.videoElement.play().catch(e => console.warn("Play blocked:", e));
            });
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.warn("HLS Error:", data.type, data.details);
                if (data.fatal) {
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        // Tenta reconectar uma vez
                        console.log("Tentando reconectar HLS...");
                        this.hls.startLoad();
                    } else {
                        // Fallback: tenta reprodução direta sem Hls.js
                        console.log("HLS falhou, tentando reprodução direta...");
                        this.hls.destroy();
                        this.hls = null;
                        // Troca .m3u8 por .ts como fallback
                        const fallbackUrl = url.replace(/\.m3u8$/, ".ts");
                        this.videoElement.src = fallbackUrl;
                        this.videoElement.play().catch(e => {
                            console.error("Reprodução direta falhou:", e);
                            this.setLoading(false);
                            App.showToast("Erro ao reproduzir este canal.");
                        });
                    }
                }
            });
        } else {
            // Sem Hls.js — reprodução direta (Safari com HLS nativo, etc.)
            this.videoElement.src = url;
            this.videoElement.play().catch(e => console.warn(e));
        }
    },

    togglePlayPause() {
        if (this.isAvPlay) {
            try {
                if (this.isPlaying) {
                    window.webapis.avplay.pause();
                    this.isPlaying = false;
                } else {
                    window.webapis.avplay.play();
                    this.isPlaying = true;
                }
            } catch (e) {}
        } else if (this.videoElement) {
            if (this.videoElement.paused) {
                this.videoElement.play();
                this.isPlaying = true;
            } else {
                this.videoElement.pause();
                this.isPlaying = false;
            }
        }
        this.updatePlayPauseBtn();
        this.resetOsdTimer();
    },

    updatePlayPauseBtn() {
        const btn = document.getElementById("btn-osd-playpause");
        if (btn) btn.innerText = this.isPlaying ? "Pausar" : "Reproduzir";
    },

    toggleAspectRatio() {
        const modes = ["fit", "zoom", "stretch"];
        const nextIdx = (modes.indexOf(this.currentAspect) + 1) % modes.length;
        this.currentAspect = modes[nextIdx];

        const btn = document.getElementById("btn-osd-aspect");
        if (this.currentAspect === "fit") {
            btn.innerText = "Padrão (Fit)";
            if (this.videoElement) this.videoElement.style.objectFit = "contain";
        } else if (this.currentAspect === "zoom") {
            btn.innerText = "Zoom (Preencher)";
            if (this.videoElement) this.videoElement.style.objectFit = "cover";
        } else {
            btn.innerText = "Esticar (Stretch)";
            if (this.videoElement) this.videoElement.style.objectFit = "fill";
        }
        this.resetOsdTimer();
    },

    stop() {
        if (this.isAvPlay) {
            try {
                window.webapis.avplay.stop();
                window.webapis.avplay.close();
            } catch (e) {}
        }
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.removeAttribute("src");
            this.videoElement.load();
        }
        this.isPlaying = false;
        clearTimeout(this.osdTimer);
    },

    showOsd() {
        const osd = document.getElementById("player-osd");
        if (osd) osd.classList.remove("hidden");
        this.resetOsdTimer();
    },

    hideOsd() {
        const osd = document.getElementById("player-osd");
        if (osd) osd.classList.add("hidden");
    },

    toggleOsd() {
        const osd = document.getElementById("player-osd");
        if (osd && osd.classList.contains("hidden")) {
            this.showOsd();
        } else {
            this.hideOsd();
        }
    },

    resetOsdTimer() {
        clearTimeout(this.osdTimer);
        this.osdTimer = setTimeout(() => this.hideOsd(), 5000);
    },

    setLoading(isLoading) {
        const el = document.getElementById("player-loading");
        if (el) el.style.display = isLoading ? "flex" : "none";
    }
};

window.addEventListener("DOMContentLoaded", () => {
    VideoPlayer.init();
});
