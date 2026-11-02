/**
 * Parser de Listas M3U / M3U8 em JavaScript com suporte a Proxy CORS
 */
const M3UParser = {
    async parseFromUrl(url) {
        let text = "";
        try {
            const res = await fetch(url);
            if (res.ok) {
                text = await res.text();
            }
        } catch (e) {
            console.warn("Download M3U direto falhou, usando proxy HTTPS...", e);
        }

        if (!text) {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const res2 = await fetch(proxyUrl);
            if (!res2.ok) throw new Error(`HTTP ${res2.status} ao baixar lista`);
            text = await res2.text();
        }

        return this.parseText(text);
    },

    parseText(text) {
        const lines = text.split(/\r?\n/);
        const channels = [];
        const categoriesMap = {};

        let currentExtInf = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            if (line.startsWith("#EXTINF:")) {
                currentExtInf = line;
            } else if (!line.startsWith("#") && currentExtInf) {
                const streamUrl = line;
                const channel = this.parseLine(currentExtInf, streamUrl);
                channels.push(channel);

                const catId = channel.category_id || "Geral";
                if (!categoriesMap[catId]) {
                    categoriesMap[catId] = {
                        category_id: catId,
                        category_name: catId
                    };
                }

                currentExtInf = null;
            }
        }

        return {
            categories: Object.values(categoriesMap).sort((a, b) => a.category_name.localeCompare(b.category_name)),
            channels: channels
        };
    },

    parseLine(extInf, url) {
        let name = "";
        const commaIndex = extInf.lastIndexOf(",");
        if (commaIndex !== -1) {
            name = extInf.substring(commaIndex + 1).trim();
        }

        const tvgIdMatch = extInf.match(/tvg-id="([^"]*)"/i);
        const tvgNameMatch = extInf.match(/tvg-name="([^"]*)"/i);
        const tvgLogoMatch = extInf.match(/tvg-logo="([^"]*)"/i);
        const groupTitleMatch = extInf.match(/group-title="([^"]*)"/i);

        return {
            stream_id: tvgIdMatch ? tvgIdMatch[1] : Math.random().toString(36).substring(7),
            name: name || (tvgNameMatch ? tvgNameMatch[1] : "Sem Nome"),
            stream_icon: tvgLogoMatch ? tvgLogoMatch[1] : "",
            category_id: groupTitleMatch ? groupTitleMatch[1] : "Geral",
            streamUrl: url
        };
    }
};