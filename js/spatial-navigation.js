/**
 * Motor de Navegação Espacial 2D para Controle Remoto (D-Pad)
 */
const SpatialNav = {
    currentFocus: null,

    init() {
        document.addEventListener("keydown", (e) => this.handleKeyDown(e));
    },

    handleKeyDown(e) {
        const keyCode = e.keyCode || e.which;

        // Tecla Voltar (Return Samsung: 10009 ou Escape/Backspace)
        if (keyCode === TizenKeys.RETURN || keyCode === 27 || (keyCode === 8 && e.target.tagName !== "INPUT")) {
            e.preventDefault();
            App.handleBack();
            return;
        }

        // Atalhos de volume no player (Teclas +, -, Mudo)
        if (App.currentScreen === "screen-player") {
            if (keyCode === 187 || keyCode === 61 || e.key === "+" || keyCode === TizenKeys.CHANNEL_UP) {
                e.preventDefault();
                VideoPlayer.changeVolume(5);
                return;
            }
            if (keyCode === 189 || keyCode === 173 || e.key === "-" || keyCode === TizenKeys.CHANNEL_DOWN) {
                e.preventDefault();
                VideoPlayer.changeVolume(-5);
                return;
            }
            if (keyCode === 77 || e.key === "m" || e.key === "M") {
                e.preventDefault();
                VideoPlayer.toggleMute();
                return;
            }
        }

        // Tecla OK / Enter
        if (keyCode === TizenKeys.ENTER) {
            if (this.currentFocus && typeof this.currentFocus.click === "function") {
                this.currentFocus.click();
            }
            return;
        }

        // Setas direcionais
        let direction = null;
        if (keyCode === TizenKeys.UP) direction = "up";
        else if (keyCode === TizenKeys.DOWN) direction = "down";
        else if (keyCode === TizenKeys.LEFT) direction = "left";
        else if (keyCode === TizenKeys.RIGHT) direction = "right";

        if (direction) {
            e.preventDefault();
            this.navigate(direction);
        }
    },

    getFocusableElements() {
        const activeScreen = document.querySelector(".screen.active");
        if (!activeScreen) return [];
        return Array.from(activeScreen.querySelectorAll(".focusable:not([disabled])"))
            .filter(el => el.offsetParent !== null); // Apenas visíveis
    },

    navigate(direction) {
        const elements = this.getFocusableElements();
        if (elements.length === 0) return;

        if (!this.currentFocus || !elements.includes(this.currentFocus)) {
            this.setFocus(elements[0]);
            return;
        }

        const currentRect = this.currentFocus.getBoundingClientRect();
        const currentCenter = {
            x: currentRect.left + currentRect.width / 2,
            y: currentRect.top + currentRect.height / 2
        };

        let bestCandidate = null;
        let minDistance = Infinity;

        elements.forEach(el => {
            if (el === this.currentFocus) return;

            const rect = el.getBoundingClientRect();
            const center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };

            const dx = center.x - currentCenter.x;
            const dy = center.y - currentCenter.y;

            let isDirectionValid = false;
            let primaryDist = 0;
            let secondaryDist = 0;

            if (direction === "up" && dy < -5) {
                isDirectionValid = true;
                primaryDist = Math.abs(dy);
                secondaryDist = Math.abs(dx);
            } else if (direction === "down" && dy > 5) {
                isDirectionValid = true;
                primaryDist = Math.abs(dy);
                secondaryDist = Math.abs(dx);
            } else if (direction === "left" && dx < -5) {
                isDirectionValid = true;
                primaryDist = Math.abs(dx);
                secondaryDist = Math.abs(dy);
            } else if (direction === "right" && dx > 5) {
                isDirectionValid = true;
                primaryDist = Math.abs(dx);
                secondaryDist = Math.abs(dy);
            }

            if (isDirectionValid) {
                // Ponderação: favorece elementos alinhados no eixo principal
                const distance = primaryDist + secondaryDist * 1.8;
                if (distance < minDistance) {
                    minDistance = distance;
                    bestCandidate = el;
                }
            }
        });

        if (bestCandidate) {
            this.setFocus(bestCandidate);
        }
    },

    setFocus(element) {
        if (this.currentFocus) {
            this.currentFocus.classList.remove("focused");
        }
        if (element) {
            this.currentFocus = element;
            element.classList.add("focused");
            element.focus();
            if (typeof element.scrollIntoView === "function") {
                element.scrollIntoView({ block: "nearest", inline: "nearest" });
            }
        }
    },

    focusFirst() {
        const elements = this.getFocusableElements();
        if (elements.length > 0) {
            this.setFocus(elements[0]);
        }
    }
};

window.addEventListener("DOMContentLoaded", () => {
    SpatialNav.init();
});
