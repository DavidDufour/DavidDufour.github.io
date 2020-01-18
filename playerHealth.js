// User Interface
window.onload = function() {
    class ProgressRing extends HTMLElement {
        constructor() {
            super();
            const stroke = this.getAttribute('stroke');
            const radius = this.getAttribute('radius');
            const player = this.getAttribute('player');
            const normalizedRadius = radius - stroke * 2;
            this._circumference = normalizedRadius * 2 * Math.PI;

            this._root = this.attachShadow({mode: 'open'});
            this._root.innerHTML = `
            <svg height="${radius * 2} "width="${radius * 2}">
                <style>
                    .playerNumber {
                        font-size: 24px;
                        font-weight: bold;
                        font-family: Arial, Helvetica, sans-serif;
                        fill: red;
                    }
                </style>
                <circle
                    stroke="green"
                    stroke-dasharray="${this._circumference} ${this._circumference}"
                    style="stroke-dashoffset:${this._circumference}"
                    stroke-width="${stroke}"
                    fill="white"
                    r="${normalizedRadius}"
                    cx="${radius}"
                    cy="${radius}"
                />
                <text x="50%" y="50%" dy="08px" text-anchor="middle" class="playerNumber">${player}</text>
            </svg>

            <style>
                circle {
                    transition: stroke-dashoffset 0.35s;
                    transform-origin: 50% 50%;
                }
            </style>
            `;
        }

        setProgress(percent) {
            const offset = this._circumference - (percent / 100 * this._circumference);
            const circle = this._root.querySelector('circle');
            circle.style.strokeDashoffset = offset; 
        }

        static get observedAttributes() {
            return ['progress'];
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (name === 'progress') {
            this.setProgress(newValue);
            }
        }
    }

    window.customElements.define('progress-ring', ProgressRing);

    // emulate progress attribute change
    let progress = 0;
    const el = document.querySelector('progress-ring');
    el.setAttribute('progress', 75);
};
