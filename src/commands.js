// This file contains definitions of the apio commands as trees of
// dict object. We use it to extract and register commands,
// sidebar view entries, and status bar buttons.

const utils = require("./utils.js");

// Commands for the PROJECT view. Thee commands are used only
// in the PROJECT mode and always have an open workspace and
// an apio.ini file.
const PROJECT_TREE = [
  {
    title: "make",
    children: [
      {
        title: "build",
        tooltip: "Build the apio project",
        id: "apio.build",
        action: { cmds: ["{apio-bin} build {env-flag}"] },
        btn: { icon: "$(check)", position: 1 },
      },
      {
        title: "upload",
        tooltip: "Build and upload to the FPGA board",
        id: "apio.upload",
        action: { cmds: ["{apio-bin} upload {env-flag}"] },
        btn: { icon: "$(arrow-right)", position: 3 },
      },
      {
        title: "clean",
        tooltip: "Clean the build artifacts",
        id: "apio.clean",
        action: { cmds: ["{apio-bin} clean"] },
        btn: { icon: "$(trash)", position: 7 },
      },
    ],
  },
  {
    title: "verify",
    children: [
      {
        title: "lint",
        tooltip: "Lint the source code",
        id: "apio.lint",
        action: { cmds: ["{apio-bin} lint {env-flag}"] },
        btn: { icon: "$(check-all)", position: 2 },
      },
      {
        title: "lint nosynth",
        tooltip: "Lint without the SYNTHESIS macro",
        id: "apio.lintNoSynth",
        action: { cmds: ["{apio-bin} lint --nosynth {env-flag}"] },
      },
      {
        title: "format",
        tooltip: "Format the project source files",
        id: "apio.format",
        action: { cmds: ["{apio-bin} format"] },
      },
      {
        title: "sim",
        tooltip: "Simulate the default testbench",
        id: "apio.sim",
        action: { cmds: ["{apio-bin} sim {env-flag}"] },
        btn: { icon: "$(debug-alt)", position: 5 },
      },
      {
        title: "sim detached",
        tooltip: "Run sim with detached viewer",
        id: "apio.simDetached",
        action: { cmds: ["{apio-bin} sim --detach {env-flag}"] },
      },
      {
        title: "test all",
        tooltip: "Test all testbenches",
        id: "apio.testAll",
        action: { cmds: ["{apio-bin} test"] },
        btn: { icon: "$(beaker)", position: 4 },
      },
      {
        title: "test default",
        tooltip: "Test default testbench",
        id: "apio.testDefault",
        action: { cmds: ["{apio-bin} test --default"] },
      },
      {
        title: "report",
        tooltip: "Report design utilization and speed",
        id: "apio.report",
        action: { cmds: ["{apio-bin} report {env-flag}"] },
        btn: { icon: "$(report)", position: 6 },
      },
      {
        title: "report verbose",
        tooltip: "Verbose report of utilization and speed",
        id: "apio.reportVerbose",
        action: { cmds: ["{apio-bin} report --verbose {env-flag}"] },
      },
      {
        title: "graph",
        tooltip: "Show the design as a graph",
        id: "apio.graph",
        action: { cmds: ["{apio-bin} graph {env-flag}"] },
      },
    ],
  },
];

// Commands for the TOOLS view. Thee commands are used only
// in the PROJECT and NON_PROJECT mode and can't assume that a workspace
// is open or that the project file apio.ini exist.
const TOOLS_TREE = [
  {
    title: "misc",
    children: [
      {
        title: "apio shell...",
        tooltip: "Open a shell with 'apio' access",
        id: "apio.shell",
        // No action, implemented independently.
      },
      {
        title: "apio version",
        tooltip: "Show Apio version",
        id: "apio.version",
        action: { cmds: ["{apio-bin} --version"] },
      },
      {
        title: "system info",
        tooltip: "Show Apio installation info",
        id: "apio.infoSystem",
        action: { cmds: ["{apio-bin} info system"] },
      },
      {
        title: "user preferences",
        tooltip: "List current user preferences",
        id: "apio.preferencesList",
        action: { cmds: ["{apio-bin} preferences -l"] },
      },
    ],
  },
  {
    title: "examples",
    children: [
      {
        title: "demo project",
        tooltip: "Play with a demo project",
        id: "apio.demoProject",
        // No action, implemented independently.
      },
      {
        title: "list examples",
        tooltip: "List project examples",
        id: "apio.examples.list",
        action: { cmds: ["{apio-bin} examples list"] },
      },
      {
        title: "get example...",
        tooltip: "Create a project from an example",
        id: "apio.getExample",
        action: {
          cmds: [
            `{apio-bin} api get-examples -f -o ${utils.apioTmpChild(
              "examples.json",
            )}`,
          ],
          completionMsgssss: [
            "The Apio examples list was retrieved successfully.",
            "Please complete and submit the Create Apio Example Project form.",
          ],
          cmdId: "apio.projectFromExample",
        },
      },
    ],
  },
  {
    title: "themes",
    children: [
      {
        title: "show themes",
        tooltip: "List themes and their colors",
        id: "apio.infoThemes",
        action: { cmds: ["{apio-bin} info themes"] },
      },
      {
        title: "set for light background",
        tooltip: "Select colors for a light background",
        id: "apio.preferencesLight",
        action: { cmds: ["{apio-bin} preferences --theme light"] },
      },
      {
        title: "set for dark background",
        tooltip: "Select colors for a dark background",
        id: "apio.preferencesDark",
        action: { cmds: ["{apio-bin} preferences --theme dark"] },
      },
      {
        title: "set no colors",
        tooltip: "Disable Apio output colors",
        id: "apio.preferencesNoColors",
        action: { cmds: ["{apio-bin} preferences --theme no-colors"] },
      },
    ],
  },

  {
    title: "boards",
    children: [
      {
        title: "list boards",
        tooltip: "List supported FPGA boards",
        id: "apio.boards",
        action: { cmds: ["{apio-bin} boards"] },
      },
      {
        title: "list FPGAs",
        tooltip: "List supported FPGAs",
        id: "apio.fpgas",
        action: { cmds: ["{apio-bin} fpgas"] },
      },
    ],
  },

  {
    title: "drivers",
    children: [
      {
        title: "FTDI",
        children: [
          {
            title: "list devices",
            tooltip: "List USB devices",
            id: "apio.devicesListUsb",
            action: { cmds: ["{apio-bin} devices usb"] },
          },
          {
            title: "install driver",
            tooltip: "Install FTDI driver for your board",
            id: "apio.driversInstallFtdi",
            action: { cmds: ["{apio-bin} drivers install ftdi"] },
          },
          {
            title: "uninstall driver",
            tooltip: "Uninstall the FTDI driver",
            id: "apio.driversUninstallFtdi",
            action: { cmds: ["{apio-bin} drivers uninstall ftdi"] },
          },
        ],
      },
      {
        title: "serial",
        children: [
          {
            title: "list devices",
            tooltip: "List serial devices",
            id: "apio.devicesListSerial",
            action: { cmds: ["{apio-bin} devices serial"] },
          },
          {
            title: "install driver",
            tooltip: "Install serial driver for your board",
            id: "apio.driversInstallSerial",
            action: { cmds: ["{apio-bin} drivers install serial"] },
          },
          {
            title: "uninstall driver",
            tooltip: "Uninstall the serial driver",
            id: "apio.driversUninstallSerial",
            action: { cmds: ["{apio-bin} drivers uninstall serial"] },
          },
        ],
      },
    ],
  },
  {
    title: "packages",
    children: [
      {
        title: "list",
        tooltip: "Show the installed apio packages",
        id: "apio.packagesList",
        action: { cmds: ["{apio-bin} packages list"] },
      },
      {
        title: "install",
        tooltip: "Install missing packages",
        id: "apio.packagesInstall",
        action: { cmds: ["{apio-bin} packages install -v"] },
      },
      {
        title: "refresh",
        tooltip: "Force packages reinstallation",
        id: "apio.packagesInstallForce",
        action: { cmds: ["{apio-bin} packages install --force -v"] },
      },
    ],
  },
];

const HELP_TREE = [
  {
    title: "documentation",
    children: [
      {
        title: "overview",
        tooltip: "Show Apio documentation",
        id: "apio.docs",
        action: { url: "https://fpgawars.github.io/apio/docs" },
      },
      {
        title: "commands",
        tooltip: "Show Apio commands documentation",
        id: "apio.docsCommands",
        action: { url: "https://fpgawars.github.io/apio/docs/commands-list" },
      },
      {
        title: "project file apio.ini",
        tooltip: "Show Apio project file documentation",
        id: "apio.docsProjectFile",
        action: { url: "https://fpgawars.github.io/apio/docs/project-file" },
      },
    ],
  },

  {
    title: "github",
    children: [
      {
        title: "discussions",
        tooltip: "Open Apio discussions",
        id: "apio.discussions",
        action: { url: "https://github.com/FPGAwars/apio/discussions" },
      },
      {
        title: "issues",
        tooltip: "Open Apio issues",
        id: "apio.issues",
        action: { url: "https://github.com/FPGAwars/apio/issues" },
      },
    ],
  },
  {
    title: "FPGAwars",
    children: [
      {
        title: "home",
        tooltip: "FPGAwars home page",
        id: "apio.fpgawars",
        action: { url: "https://fpgawars.github.io" },
      },
      {
        title: "icestudio",
        tooltip: "A GUI alternative to Apio",
        id: "apio.icestudio",
        action: { url: "https://icestudio.io" },
      },
    ],
  },
];

// Export for require()
module.exports = { PROJECT_TREE, TOOLS_TREE, HELP_TREE };
