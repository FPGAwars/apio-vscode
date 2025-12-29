![][apio-ide-banner]

[![License][license-image]][license-url]

![][linux-logo]&nbsp;&nbsp;&nbsp;![][macosx-logo]&nbsp;&nbsp;&nbsp;![][windows-logo]&nbsp;&nbsp;&nbsp;

[![vscode-build](https://img.shields.io/github/actions/workflow/status/fpgawars/apio-vscode/build-and-release.yaml?label=vscode-build)](https://github.com/fpgawars/apio-vscode/actions/workflows/build-and-release.yaml)
[![vscode-test](https://img.shields.io/github/actions/workflow/status/fpgawars/apio-vscode/test.yaml?label=vscode-test)](https://github.com/fpgawars/apio-vscode/actions/workflows/test.yaml)

---

Apio IDE is an easy to install and use Visual Studio Code extension that provides the full FPGA design capabilities within an IDE. For a quick start, visit the [Getting started with Apio](https://fpgawars.github.io/apio/docs/quick-start) guide.

## Description

Apio IDE is an easy to install extension that brings the full FPGA design functionality of Apio CLI to the Microsoft Visual Studio IDE. It’s simple to install, no toolchains, licenses, or makefiles required, and works across Linux, Windows, and macOS. Apio IDE is 100% open source, and free to use.

Apio IDE supports every stage of the FPGA workflow, from simulating and testing, to building and programming the FPGA, using simple menu commands and buttons such as `test`, `build`, and `upload` that do what you expect them to do. Apio IDE also provides full access to Apio CLI commands via an integrated shell.

Apio IDE currently supports over 80 FPGA boards, custom boards can be easily added, and it includes over 60 ready-to-use example projects. Apio CLI currently supports the ICE40, ECP5, and GOWIN FPGA architectures.

![VSCode screenshot](media/apio-vscode-animation.gif)

Apio is a lightweight, open-source, command-line FPGA toolchain for Verilog and SystemVerilog development. It requires no complex toolchains, licenses, or makefiles and works seamlessly on **Linux**, **Windows**, and **macOS**.

---

## Getting Started

1. **Install the Apio IDE extension**  
   I the Extension tab of VSCode, search for the extension `fpgawars.apio` (Apio FPGA) and install it.

2. **Open the Apio Demo project**  
   Select `TOOLS → examples → demo project`

3. **Build the project**  
   Use the **Apio status bar buttons** to lint, build, test, simulate, etc.  
   Explore the full command list in the **Apio** sidebar tab.

---

## Resources

- [Apio CLI Documentation](https://fpgawars.github.io/apio/docs/)
- [Getting started with Apio](https://fpgawars.github.io/apio/docs/quick-start)
- [Apio IDE github repository](https://github.com/fpgawars/apio-vscode)
- [Apio IDE on the VS Code market](https://marketplace.visualstudio.com/items?itemName=fpgawars.apio)
- [Apio IDE daily build](https://github.com/fpgawars/apio-vscode/releases)

---

_Happy FPGA hacking!_

<!-- Badges and URLs -->

[apio-ide-banner]: https://raw.githubusercontent.com/FPGAwars/apio-vscode/refs/heads/main/media/apio-ide-banner.png
[license-image]: http://img.shields.io/:license-gpl-blue.svg
[license-url]: (http://opensource.org/licenses/GPL-2.0)
[linux-logo]: https://raw.githubusercontent.com/FPGAwars/Apio-wiki/refs/heads/main/wiki/Logos/linux.png
[macosx-logo]: https://raw.githubusercontent.com/FPGAwars/Apio-wiki/refs/heads/main/wiki/Logos/macosx.png
[windows-logo]: https://raw.githubusercontent.com/FPGAwars/Apio-wiki/refs/heads/main/wiki/Logos/windows.png
