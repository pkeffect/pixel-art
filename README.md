# Pixel Art Creator v1.0

A professional-grade, browser-based pixel art suite designed for sprite creation, tiling textures, and precise digital illustration. Featuring a robust layer system, advanced color management, and local persistence, this tool provides a desktop-class experience directly in your browser.

## 🚀 Key Features

### 🛠 Professional Toolbox
*   **Drawing Tools:** Brush (B), Eraser (E), and a specialized **Dither Brush (D)** for classic shading effects.
*   **Shapes:** Precise Line (L), Rectangle (R), and Circle (O) tools. *Hold Shift while dragging to create filled shapes.*
*   **Selections:** Marquee Select (M) for rectangular areas and Magic Wand (W) for contiguous color selection.
*   **Manipulation:** Paint Bucket (G) for flood filling and Eyedropper (I) for instant color sampling.

### 📑 Advanced Layer Management
*   **Hierarchical Structure:** Create, rename, and delete layers.
*   **Groups:** Organize your workflow with layer groups.
*   **Blending & Opacity:** Full support for alpha blending and individual layer opacity sliders.
*   **Visibility:** Toggle layers on/off to focus on specific details.

### 💾 Data Persistence & Safety
*   **Auto-Save:** Built-in integration with **IndexedDB** that saves your progress every 3 minutes.
*   **Crash Recovery:** On launch, the app detects if an unsaved session was interrupted and offers to restore it.
*   **Project Files:** Save and load your work as portable `.json` files to keep all layer and history data intact.

### 🎨 Color & Palettes
*   **Advanced Color Picker:** A custom-built picker supporting RGB, HSL, CMYK, and Alpha channels.
*   **Recent Colors:** Automatically tracks the last 10 colors used for quick switching.
*   **Clipboard Integration:** Copy color codes (Hex, RGB, HSL) to your clipboard with a single click.

---

## ⌨️ Keyboard Shortcuts

Efficiency is core to the workflow. Master these shortcuts to speed up your creation:

| Category | Shortcut | Action |
| :--- | :--- | :--- |
| **Tools** | `B` / `E` | Brush / Eraser |
| | `G` / `I` | Fill / Eyedropper |
| | `L` / `R` / `O` | Line / Rectangle / Circle |
| | `M` / `W` | Marquee / Magic Wand |
| | `D` | Dither Brush |
| **Navigation** | `Space (Hold)` | Temporary Pan tool |
| | `Z` + Click | Zoom In (Alt + Click to Zoom Out) |
| | `Ctrl` + `+` / `-` | Zoom In / Out |
| | `Ctrl` + `0` | Fit to Screen |
| **Edit** | `Ctrl` + `Z` / `Y` | Undo / Redo |
| | `Ctrl` + `C` / `X` | Copy / Cut Selection |
| | `Ctrl` + `V` | Paste (to New Layer) |
| **View** | `Ctrl` + `'` | Toggle Pixel Grid |

---

## 🖼 View & Export Options

*   **Rulers & Guides:** Drag from the top or left rulers to create custom snapping guides for perfect alignment.
*   **Preview Window:** A secondary, floating window that shows your artwork at its native size while you work on a zoomed-in canvas.
*   **Tiling Mode:** Enable this to see how your sprite repeats—essential for creating seamless game textures.
*   **Export Formats:**
    *   **PNG:** High-quality raster export.
    *   **SVG:** Crisp vector code (perfect for web use).
    *   **ICO:** 32x32 favicon-ready files.
    *   **JSON:** Full project backup.

---

## 🛠 Installation & Technical Setup

The project is built using **Vanilla JavaScript**, **HTML5 Canvas**, and **CSS3**. No frameworks or heavy dependencies are required.

### Directory Structure
```text
├── index.html                # Main entry point
└── public/
    ├── css/                  # Modular stylesheets
    ├── components/           # HTML templates (Color Picker)
    └── js/
        ├── managers/         # Core logic (Layers, History, Storage)
        ├── tools/            # Drawing algorithms
        ├── utils/            # Helper functions (Color/Logger)
        ├── script.js         # App initialization
        └── events.js         # Input handling
```

### Local Development
1. Clone the repository.
2. Because the project uses `fetch` to load components (like the Color Picker), you must run it through a local server.
3. If you use VS Code, right-click `index.html` and select **"Open with Live Server"**.
4. Alternatively, using Python:
   ```bash
   python -m http.server 8000
   ```

---

## ⚙️ Customization
You can adjust global settings in the **Preferences** menu (`Edit > Preferences`):
*   Change the **Canvas Background Color** for better contrast.
*   Modify **Grid Line Color** and **Opacity** to suit your visual needs.
*   Set a default **Grid Size** (8x8 up to 128x128).

---

## 📜 License
© 2025 Pixel Art Creator. All Rights Reserved. Designed for creators, by creators.