/**
 * Gerenciador de Armazenamento Local
 */
const Storage = {
    KEYS: {
        PLAYLISTS: "aether_tizen_playlists",
        ACTIVE_ID: "aether_tizen_active_id",
        FAVORITES: "aether_tizen_favorites",
        HISTORY: "aether_tizen_history"
    },

    getPlaylists() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.PLAYLISTS)) || [];
        } catch (e) {
            return [];
        }
    },

    savePlaylist(playlist) {
        const list = this.getPlaylists();
        const idx = list.findIndex(p => p.id === playlist.id);
        if (idx >= 0) {
            list[idx] = playlist;
        } else {
            list.push(playlist);
        }
        localStorage.setItem(this.KEYS.PLAYLISTS, JSON.stringify(list));
        this.setActivePlaylistId(playlist.id);
    },

    getActivePlaylist() {
        const id = localStorage.getItem(this.KEYS.ACTIVE_ID);
        if (!id) return null;
        return this.getPlaylists().find(p => p.id === id) || null;
    },

    setActivePlaylistId(id) {
        localStorage.setItem(this.KEYS.ACTIVE_ID, id);
    },

    getFavorites() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.FAVORITES)) || [];
        } catch (e) {
            return [];
        }
    },

    toggleFavorite(streamId) {
        const favs = this.getFavorites();
        const index = favs.indexOf(streamId);
        let added = false;
        if (index >= 0) {
            favs.splice(index, 1);
        } else {
            favs.push(streamId);
            added = true;
        }
        localStorage.setItem(this.KEYS.FAVORITES, JSON.stringify(favs));
        return added;
    },

    isFavorite(streamId) {
        return this.getFavorites().includes(streamId);
    },

    addRecent(streamId) {
        try {
            let hist = JSON.parse(localStorage.getItem(this.KEYS.HISTORY)) || [];
            hist = hist.filter(id => id !== streamId);
            hist.unshift(streamId);
            if (hist.length > 50) hist = hist.slice(0, 50);
            localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(hist));
        } catch (e) {}
    },

    clearAll() {
        localStorage.clear();
    }
};
