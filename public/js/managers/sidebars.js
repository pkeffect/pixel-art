// VERSION: 0.0.3
class SidebarManager {
    constructor(side) {
        this.side = side; // 'right'
        this.menuElement = document.getElementById(`${side}-side-menu`);
        if (!this.menuElement) return;

        this.toggleButton = document.getElementById(`${side}-menu-toggle`);
        this.isCollapsed = this.menuElement.classList.contains('collapsed');

        this.updateWidthVariable();
        this.attachEventListeners();
    }

    updateWidthVariable() {
        const width = this.isCollapsed ? '0px' : '250px';
        document.documentElement.style.setProperty(`--${this.side}-width`, width);
    }

    toggle() {
        this.isCollapsed = !this.isCollapsed;
        this.menuElement.classList.toggle('collapsed', this.isCollapsed);
        this.updateWidthVariable();
    }

    attachEventListeners() {
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => this.toggle());
        }
    }
}