/**
 * Cliente da API Xtream Codes para Tizen OS e Web
 */
class XtreamClient {
    constructor(playlist) {
        this.playlist = playlist;
    }

    getBaseUrl() {
        let url = (this.playlist.serverUrl || "").trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "http://" + url;
        }
        if (url.endsWith("/")) {
            url = url.substring(0, url.length - 1);
        }
        return url;
    }

    buildUrl(action = null, extra = null) {
        const base = `${this.getBaseUrl()}/player_api.php?username=${encodeURIComponent(this.playlist.username)}&password=${encodeURIComponent(this.playlist.password)}`;
        let url = action ? `${base}&action=${action}` : base;
        if (extra) url += `&${extra}`;
        return url;
    }

    async safeFetch(url) {
        // Tenta primeiro conexão direta
        try {
            const res = await fetch(url);
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn("Conexão direta bloqueada pelo navegador, usando proxy CORS HTTPS...", e);
        }

        // Se falhar (ex: Mixed Content / CORS na TV), usa o proxy HTTPS transparente
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res2 = await fetch(proxyUrl);
        if (!res2.ok) throw new Error(`Falha na resposta do servidor (${res2.status})`);
        return await res2.json();
    }

    async authenticate() {
        const url = this.buildUrl();
        const data = await this.safeFetch(url);
        if (!data.user_info || data.user_info.auth !== 1) {
            throw new Error(data.user_info?.status || "Credenciais inválidas");
        }
        return data;
    }

    async getLiveCategories() {
        const url = this.buildUrl("get_live_categories");
        return await this.safeFetch(url);
    }

    async getLiveStreams(categoryId = null) {
        const param = (categoryId && categoryId !== "all") ? `category_id=${categoryId}` : null;
        const url = this.buildUrl("get_live_streams", param);
        const streams = await this.safeFetch(url);
        return (streams || []).map(s => ({
            ...s,
            streamUrl: `${this.getBaseUrl()}/live/${this.playlist.username}/${this.playlist.password}/${s.stream_id}.m3u8`
        }));
    }

    async getVodCategories() {
        const url = this.buildUrl("get_vod_categories");
        return await this.safeFetch(url);
    }

    async getVodStreams(categoryId = null) {
        const param = (categoryId && categoryId !== "all") ? `category_id=${categoryId}` : null;
        const url = this.buildUrl("get_vod_streams", param);
        const items = await this.safeFetch(url);
        return (items || []).map(v => {
            const ext = v.container_extension || "mp4";
            return {
                ...v,
                streamUrl: `${this.getBaseUrl()}/movie/${this.playlist.username}/${this.playlist.password}/${v.stream_id}.${ext}`
            };
        });
    }

    async getSeriesCategories() {
        const url = this.buildUrl("get_series_categories");
        return await this.safeFetch(url);
    }

    async getSeries(categoryId = null) {
        const param = (categoryId && categoryId !== "all") ? `category_id=${categoryId}` : null;
        const url = this.buildUrl("get_series", param);
        return await this.safeFetch(url);
    }
}