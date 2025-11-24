// This file contains definitions of the apio commands as trees of
// dict object. We use it to extract and register commands,
// sidebar view entries, and status bar buttons.

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
        action: { cmds: ["apio build {env-flag}"] },
        btn: { icon: "$(check)", position: 1 },
      },
      {
        title: "upload",
        tooltip: "Build and upload to the FPGA board",
        id: "apio.upload",
        action: { cmds: ["apio upload {env-flag}"] },
        btn: { icon: "$(play)", position: 3 },
      },
      {
        title: "clean",
        tooltip: "Clean the build artifacts",
        id: "apio.clean",
        action: { cmds: ["apio clean"] },
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
        action: { cmds: ["apio lint {env-flag}"] },
        btn: { icon: "$(check-all)", position: 2 },
      },
      {
        title: "format",
        tooltip: "Format the project source files",
        id: "apio.format",
        action: { cmds: ["apio format"] },
      },
      {
        title: "sim",
        tooltip: "Run the testbench simulator",
        id: "apio.sim",
        action: { cmds: ["apio sim {env-flag}"] },
        btn: { icon: "$(debug-alt)", position: 5 },
      },
      {
        title: "test",
        tooltip: "Run automatic tests",
        id: "apio.test",
        action: { cmds: ["apio test"] },
        btn: { icon: "$(beaker)", position: 4 },
      },
      {
        title: "report",
        tooltip: "Report design utilization and speed",
        id: "apio.report",
        action: { cmds: ["apio report {env-flag}"] },
        btn: { icon: "$(report)", position: 6 },
      },
      {
        title: "graph",
        tooltip: "Show the design as a graph",
        id: "apio.graph",
        action: { cmds: ["apio graph {env-flag}"] },
      },
    ],
  },
];

// Commands for the TOOLS view. Thee commands are used only
// in the PROJECT and NON_PROJECT mode and can't assume that a workspace
// is open or that the project file apio.ini exist.
const TOOLS_TREE = [
  {
    title: "new project",
    tooltip: "Create a new Apio project",
    id: "apio.new.project",
    action: { cmdId: "apio.newProjectWizard" },
  },
  {
    title: "apio terminal",
    tooltip: "Open a terminal with 'apio' access",
    id: "apio.terminal",
    action: { cmds: [] },
  },
  {
    title: "themes",
    children: [
      {
        title: "show themes",
        tooltip: "List themes and their colors",
        id: "apio.info.themes",
        action: { cmds: ["apio info themes"] },
      },
      {
        title: "set for light background",
        tooltip: "Select colors for a light background",
        id: "apio.preferences.light",
        action: { cmds: ["apio preferences --theme light"] },
      },
      {
        title: "set for dark background",
        tooltip: "Select colors for a dark background",
        id: "apio.preferences.dark",
        action: { cmds: ["apio preferences --theme dark"] },
      },
      {
        title: "set no colors",
        tooltip: "Disable Apio output colors",
        id: "apio.preferences.no-colors",
        action: { cmds: ["apio preferences --theme no-colors"] },
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
        action: { cmds: ["apio boards"] },
      },
      {
        title: "list FPGAs",
        tooltip: "List supported FPGAs",
        id: "apio.fpgas",
        action: { cmds: ["apio fpgas"] },
      },
      {
        title: "list examples",
        tooltip: "List project examples",
        id: "apio.examples.list",
        action: { cmds: ["apio examples list"] },
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
            id: "apio.devices.usb",
            action: { cmds: ["apio devices usb"] },
          },
          {
            title: "install driver",
            tooltip: "Install FTDI driver for your board",
            id: "apio.drivers.install.ftdi",
            action: { cmds: ["apio drivers install ftdi"] },
          },
          {
            title: "uninstall driver",
            tooltip: "Uninstall the FTDI driver",
            id: "apio.drivers.uninstall.ftdi",
            action: { cmds: ["apio drivers uninstall ftdi"] },
          },
        ],
      },
      {
        title: "serial",
        children: [
          {
            title: "list devices",
            tooltip: "List serial devices",
            id: "apio.devices.serial",
            action: { cmds: ["apio devices serial"] },
          },
          {
            title: "install driver",
            tooltip: "Install serial driver for your board",
            id: "apio.drivers.install.serial",
            action: { cmds: ["apio drivers install serial"] },
          },
          {
            title: "uninstall driver",
            tooltip: "Uninstall the serial driver",
            id: "apio.drivers.uninstall.serial",
            action: { cmds: ["apio drivers uninstall serial"] },
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
        id: "apio.packages.list",
        action: { cmds: ["apio packages list"] },
      },
      {
        title: "update",
        tooltip: "Install missing packages",
        id: "apio.packages.update",
        action: { cmds: ["apio packages update"] },
      },
      {
        title: "refresh",
        tooltip: "Force packages reinstallation",
        id: "apio.packages.update.force",
        action: { cmds: ["apio packages update --force"] },
      },
    ],
  },
  {
    title: "misc",
    children: [
      {
        title: "apio version",
        tooltip: "Show Apio version",
        id: "apio.info.version",
        action: { cmds: ["apio --version"] },
      },
      {
        title: "system info",
        tooltip: "Show Apio installation info",
        id: "apio.info.system",
        action: { cmds: ["apio info system"] },
      },
      {
        title: "user preferences",
        tooltip: "List current user preferences",
        id: "apio.preferences.list",
        action: { cmds: ["apio preferences -l"] },
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
        id: "apio.docs.commands",
        action: { url: "https://fpgawars.github.io/apio/docs/cmd-apio-build" },
      },
      {
        title: "project file apio.ini",
        tooltip: "Show Apio project file documentation",
        id: "apio.docs.project.file",
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

// Exported symbols
module.exports = { PROJECT_TREE, TOOLS_TREE, HELP_TREE };
