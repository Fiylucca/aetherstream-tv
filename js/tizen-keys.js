/**
 * Suporte a Teclas e Controle Remoto Samsung Smart TV (Tizen OS)
 */
const TizenKeys = {
    RETURN: 10009,
    ENTER: 13,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    PLAY: 415,
    PAUSE: 19,
    PLAY_PAUSE: 10252,
    STOP: 413,
    FAST_FORWARD: 417,
    REWIND: 412,
    COLOR_RED: 403,
    COLOR_GREEN: 404,
    COLOR_YELLOW: 405,
    COLOR_BLUE: 406,
    CHANNEL_UP: 427,
    CHANNEL_DOWN: 428,

    init() {
        if (typeof window.tizen !== "undefined" && window.tizen.tvinputdevice) {
            const keysToRegister = [
                "MediaPlay",
                "MediaPause",
                "MediaPlayPause",
                "MediaStop",
                "MediaFastForward",
                "MediaRewind",
                "ColorF0Red",
                "ColorF1Green",
                "ColorF2Yellow",
                "ColorF3Blue",
                "ChannelUp",
                "ChannelDown",
                "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"
            ];

            keysToRegister.forEach(keyName => {
                try {
                    window.tizen.tvinputdevice.registerKey(keyName);
                } catch (e) {
                    console.warn(`Não foi possível registrar a tecla: ${keyName}`, e);
                }
            });
            console.log("Teclas Samsung Tizen registradas com sucesso.");
        }
    }
};

window.addEventListener("DOMContentLoaded", () => {
    TizenKeys.init();
});
