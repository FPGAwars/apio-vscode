# Apio FPGA for VSCode

> **Note (November 2025):** This extension is not yet available on the Visual Studio Code Marketplace.
> To install it, download the latest `.vsix` package from the [Releases page](https://github.com/FPGAwars/apio-vscode/releases) and use **Extensions → … → Install from VSIX…** in VSCode.

This official extension by the Apio team brings Apio’s power directly into VSCode with **one-click buttons** and a **dedicated sidebar panel**. Common commands (`lint`, `build`, `upload`) appear on the status bar, while the full command set is organized in a collapsible tree under the **Apio** tab.

![VSCode screenshot](media/screenshot1.png)

The screen has the following sections:

1. Apio quick command buttons and environment selector.
2. Apio command explorer tab.
3. Apio commands collapsible tree.
4. Apio commands output terminal.

---

## Background

Apio is a lightweight, open-source, command-line FPGA toolchain for Verilog and SystemVerilog development. It requires no complex toolchains, licenses, or makefiles and works seamlessly on **Linux**, **Windows**, and **macOS**.

---

## Prerequisites

- Apio is installed and working (run `apio --version` in a command line to verify).
- The workspace root contains an `apio.ini` file (open the project folder via **File → Open Folder…**).

---

## Getting Started

1. **Install Apio and create a project**  
   Follow the official guide:
   [https://fpgawars.github.io/apio/docs/quick-start/](https://fpgawars.github.io/apio/docs/quick-start/)

2. **Open the project in VSCode**  
   `File → Open Folder…` → select the folder containing `apio.ini`.

3. **Run commands**  
   Use **status bar buttons** for `lint`, `build`, `upload`, etc.  
   Explore the full command list in the **Apio** sidebar tab.

---

## Resources

- **Apio Documentation** – [fpgawars.github.io/apio](https://fpgawars.github.io/apio)
- **Discussions** – [github.com/FPGAwars/apio/discussions](https://github.com/fpgawars/apio/discussions)
- **Report Issues** (Apio or extension) – [github.com/FPGAwars/apio/issues](https://github.com/fpgawars/apio/issues)
- **Source Repository** – [github.com/FPGAwars/apio/issues](https://github.com/fpgawars/apio-vscode)

---

_Happy FPGA hacking!_
