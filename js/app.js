/**
 * Controlador Principal do Aplicativo AetherStream Tizen
 */
const App = {
    currentScreen: null,
    previousScreen: null,
    activePlaylist: null,
    client: null,

    // Dados em memória
    liveCategories: [],
    liveChannels: [],
    currentFilteredChannels: [],
    vodCategories: [],
    vodItems: [],

    init() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);

        this.activePlaylist = Storage.getActivePlaylist();
        if (this.activePlaylist) {
            this.client = new XtreamClient(this.activePlaylist);
            this.showScreen("screen-dashboard");
        } else {
            this.showScreen("screen-login");
        }

        this.bindEvents();
    },

    updateClock() {
        const now = new Date();
        const str = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const el = document.getElementById("header-clock");
        if (el) el.innerText = str;
    },

    showScreen(screenId) {
        document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add("active");
            this.previousScreen = this.currentScreen;
            this.currentScreen = screenId;

            // Atualiza status da lista no dashboard
            if (screenId === "screen-dashboard" && this.activePlaylist) {
                document.getElementById("dash-playlist-name").innerText = `Lista: ${this.activePlaylist.name}`;
            }

            // Foco automático no primeiro item focalizável da nova tela
            setTimeout(() => {
                SpatialNav.focusFirst();
            }, 50);
        }
    },

    handleBack() {
        if (this.currentScreen === "screen-player") {
            // Volta imediatamente para a tela de canais ou anterior
            VideoPlayer.stop();
            this.showScreen(this.previousScreen || "screen-live");
            return;
        } else if (this.currentScreen === "screen-live" || this.currentScreen === "screen-vod" || this.currentScreen === "screen-settings") {
            this.showScreen("screen-dashboard");
        } else if (this.currentScreen === "screen-dashboard") {
            // No Tizen, confirmação ou saída
            if (typeof window.tizen !== "undefined" && window.tizen.application) {
                try {
                    window.tizen.application.getCurrentApplication().exit();
                } catch (e) {}
            }
        }
    },

    bindEvents() {
        // Aba Xtream vs M3U
        const tabXtream = document.getElementById("tab-xtream");
        const tabM3u = document.getElementById("tab-m3u");
        const formXtream = document.getElementById("form-xtream");
        const formM3u = document.getElementById("form-m3u");

        if (tabXtream && tabM3u) {
            tabXtream.addEventListener("click", () => {
                tabXtream.classList.add("active");
                tabM3u.classList.remove("active");
                formXtream.style.display = "block";
                formM3u.style.display = "none";
            });
            tabM3u.addEventListener("click", () => {
                tabM3u.classList.add("active");
                tabXtream.classList.remove("active");
                formXtream.style.display = "none";
                formM3u.style.display = "block";
            });
        }

        // Botão Conectar
        const btnConnect = document.getElementById("btn-connect");
        if (btnConnect) {
            btnConnect.addEventListener("click", () => this.handleConnect());
        }

        // Cards do Dashboard
        document.getElementById("card-live")?.addEventListener("click", () => this.openLiveTv(false));
        document.getElementById("card-movies")?.addEventListener("click", () => this.openVod("movies"));
        document.getElementById("card-series")?.addEventListener("click", () => this.openVod("series"));
        document.getElementById("card-favorites")?.addEventListener("click", () => this.openLiveTv(true));
        document.getElementById("card-settings")?.addEventListener("click", () => this.openSettings());

        // Botão Voltar do Player (OSD e botão fixo rápido)
        document.getElementById("btn-osd-back")?.addEventListener("click", () => {
            this.handleBack();
        });
        document.getElementById("btn-player-quick-back")?.addEventListener("click", () => {
            this.handleBack();
        });

        // Controles de Play/Pause e Aspecto
        document.getElementById("btn-osd-playpause")?.addEventListener("click", () => VideoPlayer.togglePlayPause());
        document.getElementById("btn-osd-aspect")?.addEventListener("click", () => VideoPlayer.toggleAspectRatio());

        // Controles de Volume
        document.getElementById("btn-vol-mute")?.addEventListener("click", () => {
            VideoPlayer.toggleMute();
            VideoPlayer.resetOsdTimer();
        });
        document.getElementById("btn-vol-down")?.addEventListener("click", () => {
            VideoPlayer.changeVolume(-10);
            VideoPlayer.resetOsdTimer();
        });
        document.getElementById("btn-vol-up")?.addEventListener("click", () => {
            VideoPlayer.changeVolume(10);
            VideoPlayer.resetOsdTimer();
        });
        const volSlider = document.getElementById("slider-volume");
        if (volSlider) {
            volSlider.addEventListener("input", (e) => {
                VideoPlayer.setVolume(e.target.value);
                VideoPlayer.resetOsdTimer();
            });
        }
        document.getElementById("btn-osd-aspect")?.addEventListener("click", () => VideoPlayer.toggleAspectRatio());

        // Busca de canais
        const searchInput = document.getElementById("search-channels");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => this.filterChannels(e.target.value));
        }

        // Configurações
        document.getElementById("btn-switch-playlist")?.addEventListener("click", () => {
            this.showScreen("screen-login");
        });
        document.getElementById("btn-clear-cache")?.addEventListener("click", () => {
            Storage.clearAll();
            this.activePlaylist = null;
            this.showToast("Histórico e listas limpos!");
            this.showScreen("screen-login");
        });
    },

    async handleConnect() {
        const isXtream = document.getElementById("tab-xtream")?.classList.contains("active");
        const name = document.getElementById("input-name").value.trim();

        if (!name) {
            this.showToast("Informe um nome para esta lista.");
            return;
        }

        if (isXtream) {
            const server = document.getElementById("input-server").value.trim();
            const user = document.getElementById("input-user").value.trim();
            const pass = document.getElementById("input-pass").value.trim();

            if (!server || !user || !pass) {
                this.showToast("Preencha servidor, usuário e senha.");
                return;
            }

            const playlist = {
                id: Math.random().toString(36).substring(2, 10),
                name: name,
                type: "XTREAM",
                serverUrl: server,
                username: user,
                password: pass
            };

            this.showToast("Autenticando no servidor...");
            try {
                const client = new XtreamClient(playlist);
                await client.authenticate();
                Storage.savePlaylist(playlist);
                this.activePlaylist = playlist;
                this.client = client;
                this.showToast("Conexão realizada com sucesso!");
                this.showScreen("screen-dashboard");
            } catch (err) {
                this.showToast(`Erro: ${err.message}`);
            }
        } else {
            const m3uUrl = document.getElementById("input-m3u").value.trim();
            if (!m3uUrl) {
                this.showToast("Informe a URL da lista M3U.");
                return;
            }

            this.showToast("Baixando e processando lista M3U...");
            try {
                const parsed = await M3UParser.parseFromUrl(m3uUrl);
                if (parsed.channels.length === 0) {
                    this.showToast("Nenhum canal encontrado nesta lista.");
                    return;
                }
                const playlist = {
                    id: Math.random().toString(36).substring(2, 10),
                    name: name,
                    type: "M3U",
                    m3uUrl: m3uUrl
                };
                Storage.savePlaylist(playlist);
                this.activePlaylist = playlist;
                this.showToast(`Lista carregada: ${parsed.channels.length} canais!`);
                this.showScreen("screen-dashboard");
            } catch (err) {
                this.showToast(`Erro M3U: ${err.message}`);
            }
        }
    },

    async openLiveTv(favoritesOnly = false) {
        this.showScreen("screen-live");
        const titleEl = document.getElementById("live-section-title");
        if (titleEl) titleEl.innerText = favoritesOnly ? "Meus Favoritos" : "TV Ao Vivo";

        const catContainer = document.getElementById("categories-container");
        const chanContainer = document.getElementById("channels-container");
        catContainer.innerHTML = "<div style='padding:12px;color:#94a3b8;'>Carregando...</div>";
        chanContainer.innerHTML = "<div style='padding:20px;color:#94a3b8;'>Carregando canais...</div>";

        try {
            if (this.activePlaylist.type === "XTREAM") {
                this.liveCategories = await this.client.getLiveCategories();
                this.liveChannels = await this.client.getLiveStreams();
            } else {
                const parsed = await M3UParser.parseFromUrl(this.activePlaylist.m3uUrl);
                this.liveCategories = parsed.categories;
                this.liveChannels = parsed.channels;
            }

            this.renderCategories(favoritesOnly);
            if (favoritesOnly) {
                const favIds = Storage.getFavorites();
                this.currentFilteredChannels = this.liveChannels.filter(c => favIds.includes(c.stream_id || c.name));
            } else {
                this.currentFilteredChannels = this.liveChannels;
            }
            this.renderChannels(this.currentFilteredChannels);
        } catch (e) {
            chanContainer.innerHTML = `<div style='padding:20px;color:#ef4444;'>Erro ao carregar canais: ${e.message}</div>`;
        }
    },

    renderCategories(favoritesOnly) {
        const catContainer = document.getElementById("categories-container");
        catContainer.innerHTML = "";

        const allBtn = document.createElement("div");
        allBtn.className = "category-item focusable active";
        allBtn.tabIndex = 0;
        allBtn.innerText = favoritesOnly ? "Favoritos" : "Todos os Canais";
        allBtn.onclick = () => {
            document.querySelectorAll(".category-item").forEach(el => el.classList.remove("active"));
            allBtn.classList.add("active");
            if (favoritesOnly) {
                const favIds = Storage.getFavorites();
                this.currentFilteredChannels = this.liveChannels.filter(c => favIds.includes(c.stream_id || c.name));
            } else {
                this.currentFilteredChannels = this.liveChannels;
            }
            this.renderChannels(this.currentFilteredChannels);
        };
        catContainer.appendChild(allBtn);

        if (!favoritesOnly) {
            this.liveCategories.forEach(cat => {
                const item = document.createElement("div");
                item.className = "category-item focusable";
                item.tabIndex = 0;
                item.innerText = cat.category_name;
                item.onclick = () => {
                    document.querySelectorAll(".category-item").forEach(el => el.classList.remove("active"));
                    item.classList.add("active");
                    this.currentFilteredChannels = this.liveChannels.filter(c => c.category_id == cat.category_id);
                    this.renderChannels(this.currentFilteredChannels);
                };
                catContainer.appendChild(item);
            });
        }
    },

    renderChannels(channels) {
        const container = document.getElementById("channels-container");
        container.innerHTML = "";

        if (channels.length === 0) {
            container.innerHTML = "<div style='padding:20px;color:#64748b;text-align:center;'>Nenhum canal encontrado nesta categoria.</div>";
            return;
        }

        channels.forEach(ch => {
            const item = document.createElement("div");
            item.className = "channel-item focusable";
            item.tabIndex = 0;

            const iconSrc = ch.stream_icon || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' fill='%23223049'><rect width='44' height='44'/></svg>";
            const isFav = Storage.isFavorite(ch.stream_id || ch.name);

            item.innerHTML = `
                <img class="channel-logo" src="${iconSrc}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'44\\' height=\\'44\\' fill=\\'%23223049\\'><rect width=\\'44\\' height=\\'44\\'/></svg>'">
                <span class="channel-name">${ch.name}</span>
                <span class="channel-fav ${isFav ? 'is-fav' : ''}" data-id="${ch.stream_id || ch.name}">★</span>
            `;

            // Botão tocar canal
            item.onclick = (e) => {
                if (e.target.classList.contains("channel-fav")) {
                    const id = e.target.getAttribute("data-id");
                    const added = Storage.toggleFavorite(id);
                    e.target.classList.toggle("is-fav", added);
                    return;
                }
                Storage.addRecent(ch.stream_id || ch.name);
                this.showScreen("screen-player");
                VideoPlayer.play(ch.streamUrl, ch.name);
            };

            container.appendChild(item);
        });
    },

    filterChannels(query) {
        const q = (query || "").toLowerCase().trim();
        const filtered = q === "" ? this.currentFilteredChannels : this.currentFilteredChannels.filter(c => c.name.toLowerCase().includes(q));
        this.renderChannels(filtered);
    },

    async openVod(type = "movies") {
        this.showScreen("screen-vod");
        const titleEl = document.getElementById("vod-section-title");
        if (titleEl) titleEl.innerText = type === "series" ? "Séries VOD" : "Filmes VOD";

        const grid = document.getElementById("vod-grid");
        grid.innerHTML = "<div style='padding:20px;color:#94a3b8;'>Carregando catálogo...</div>";

        try {
            if (this.activePlaylist.type !== "XTREAM") {
                grid.innerHTML = "<div style='padding:20px;color:#64748b;'>VOD estruturado está disponível para conexões Xtream Codes.</div>";
                return;
            }

            this.vodItems = type === "series" ? await this.client.getSeries() : await this.client.getVodStreams();
            grid.innerHTML = "";

            if (this.vodItems.length === 0) {
                grid.innerHTML = "<div style='padding:20px;color:#64748b;'>Nenhum título encontrado.</div>";
                return;
            }

            this.vodItems.forEach(item => {
                const card = document.createElement("div");
                card.className = "vod-card focusable";
                card.tabIndex = 0;

                const poster = item.stream_icon || item.cover || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='220' fill='%23223049'><rect width='180' height='220'/></svg>";
                const rating = item.rating ? `★ ${item.rating}` : "★ N/A";

                card.innerHTML = `
                    <img class="vod-poster" src="${poster}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'180\\' height=\\'220\\' fill=\\'%23223049\\'><rect width=\\'180\\' height=\\'220\\'/></svg>'">
                    <div class="vod-info">
                        <div class="vod-title">${item.name}</div>
                        <div class="vod-rating">${rating}</div>
                    </div>
                `;

                card.onclick = () => {
                    if (item.streamUrl) {
                        this.showScreen("screen-player");
                        VideoPlayer.play(item.streamUrl, item.name);
                    } else {
                        this.showToast(`Título: ${item.name}`);
                    }
                };

                grid.appendChild(card);
            });
        } catch (e) {
            grid.innerHTML = `<div style='padding:20px;color:#ef4444;'>Erro ao carregar VOD: ${e.message}</div>`;
        }
    },

    openSettings() {
        this.showScreen("screen-settings");
        const details = document.getElementById("settings-playlist-details");
        if (details && this.activePlaylist) {
            details.innerText = this.activePlaylist.type === "XTREAM"
                ? `Servidor: ${this.activePlaylist.serverUrl} | Usuário: ${this.activePlaylist.username}`
                : `URL: ${this.activePlaylist.m3uUrl}`;
        }
    },

    showToast(message) {
        let toast = document.getElementById("toast-msg");
        if (!toast) return;
        toast.innerText = message;
        toast.style.display = "block";
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            toast.style.display = "none";
        }, 3500);
    }
};

window.addEventListener("DOMContentLoaded", () => {
    App.init();
});
