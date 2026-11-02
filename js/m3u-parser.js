/**
 * Parser de Listas M3U / M3U8 em JavaScript
 */
const M3UParser = {
    async parseFromUrl(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar lista`);
        const text = await res.text();
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

        const getAttr = (regex) => {
            const m = extInf.match(regex);
            return m ? m[1] : null;
        };

        const tvgName = getAttr(/tvg-name="([^"]*)"/);
        const tvgLogo = getAttr(/tvg-logo="([^"]*)"/);
        const groupTitle = getAttr(/group-title="([^"]*)"/);

        return {
            stream_id: Math.random().toString(36).substring(2, 10),
            name: name || tvgName || "Canal sem nome",
            stream_icon: tvgLogo,
            category_id: groupTitle || "Geral",
            streamUrl: url
        };
    }
};
