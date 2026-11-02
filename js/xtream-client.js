/**
 * Cliente da API Xtream Codes para Tizen OS
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

    async authenticate() {
        const url = this.buildUrl();
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} ao conectar`);
        const data = await res.json();
        if (!data.user_info || data.user_info.auth !== 1) {
            throw new Error(data.user_info?.status || "Credenciais inválidas");
        }
        return data;
    }

    async getLiveCategories() {
        const url = this.buildUrl("get_live_categories");
        const res = await fetch(url);
        return await res.json();
    }

    async getLiveStreams(categoryId = null) {
        const param = (categoryId && categoryId !== "all") ? `category_id=${categoryId}` : null;
        const url = this.buildUrl("get_live_streams", param);
        const res = await fetch(url);
        const streams = await res.json();
        return streams.map(s => ({
            ...s,
            streamUrl: `${this.getBaseUrl()}/live/${this.playlist.username}/${this.playlist.password}/${s.stream_id}.m3u8`
        }));
    }

    async getVodCategories() {
        const url = this.buildUrl("get_vod_categories");
        const res = await fetch(url);
        return await res.json();
    }

    async getVodStreams(categoryId = null) {
        const param = (categoryId && categoryId !== "all") ? `category_id=${categoryId}` : null;
        const url = this.buildUrl("get_vod_streams", param);
        const res = await fetch(url);
        const items = await res.json();
        return items.map(v => {
            const ext = v.container_extension || "mp4";
            return {
                ...v,
                streamUrl: `${this.getBaseUrl()}/movie/${this.playlist.username}/${this.playlist.password}/${v.stream_id}.${ext}`
            };
        });
    }

    async getSeriesCategories() {
        const url = this.buildUrl("get_series_categories");
        const res = await fetch(url);
        return await res.json();
    }

    async getSeries(categoryId = null) {
        const param = (categoryId && categoryId !== "all") ? `category_id=${categoryId}` : null;
        const url = this.buildUrl("get_series", param);
        const res = await fetch(url);
        return await res.json();
    }
}
