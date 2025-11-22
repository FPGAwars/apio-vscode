// This file contains definitions of the apio commands as trees of
// dict object. We use it to extract and register commands,
// sidebar view entries, and status bar buttons.

const COMMANDS_TREE = [
  {
    title: "Build project",
    children: [
      {
        title: "Build",
        tooltip: "Build the apio project",
        id: "apio.build",
        action: { cmds: ["{apio-bin} build {env-flag}"] },
        btn: { icon: "$(check)", position: 1 },
      },
      {
        title: "Upload",
        tooltip: "Build and upload to the FPGA board",
        id: "apio.upload",
        action: { cmds: ["{apio-bin} upload {env-flag}"] },
        btn: { icon: "$(play)", position: 3 },
      },
      {
        title: "Clean",
        tooltip: "Clean the build artifacts",
        id: "apio.clean",
        action: { cmds: ["{apio-bin} clean"] },
        btn: { icon: "$(trash)", position: 7 },
      },
    ],
  },
  {
    title: "Verify project",
    children: [
      {
        title: "Lint",
        tooltip: "Lint the source code",
        id: "apio.lint",
        action: { cmds: ["{apio-bin} lint {env-flag}"] },
        btn: { icon: "$(check-all)", position: 2 },
      },
      {
        title: "Format",
        tooltip: "Format the project source files",
        id: "apio.format",
        action: { cmds: ["{apio-bin} format"] },
      },
      {
        title: "Sim",
        tooltip: "Run the testbench simulator",
        id: "apio.sim",
        action: { cmds: ["{apio-bin} sim {env-flag}"] },
        btn: { icon: "$(debug-alt)", position: 5 },
      },
      {
        title: "Test",
        tooltip: "Run automatic tests",
        id: "apio.test",
        action: { cmds: ["{apio-bin} test"] },
        btn: { icon: "$(beaker)", position: 4 },
      },
      {
        title: "Report",
        tooltip: "Report design utilization and speed",
        id: "apio.report",
        action: { cmds: ["{apio-bin} report {env-flag}"] },
        btn: { icon: "$(report)", position: 6 },
      },
      {
        title: "Graph",
        tooltip: "Show the design as a graph",
        id: "apio.graph",
        action: { cmds: ["{apio-bin} graph {env-flag}"] },
      },
    ],
  },

  {
    title: "Preferences",
    children: [
      {
        title: "List preferences",
        tooltip: "List user preferences",
        id: "apio.preferences",
        action: { cmds: ["{apio-bin} preferences --list"] },
      },
      {
        title: "Themes",
        children: [
          {
            title: "Set for light background",
            tooltip: "Select colors for a light background",
            id: "apio.preferences.light",
            action: { cmds: ["{apio-bin} preferences --theme light"] },
          },
          {
            title: "Set for dark background",
            tooltip: "Select colors for a dark background",
            id: "apio.preferences.dark",
            action: { cmds: ["{apio-bin} preferences --theme dark"] },
          },
          {
            title: "Set no colors",
            tooltip: "Disable Apio output colors",
            id: "apio.preferences.no-colors",
            action: { cmds: ["{apio-bin} preferences --theme no-colors"] },
          },
          {
            title: "Show themes",
            tooltip: "List themes and their colors",
            id: "apio.info.themes",
            action: { cmds: ["{apio-bin} info themes"] },
          },
        ],
      },
    ],
  },

  {
    title: "FPGA Boards",
    children: [
      {
        title: "List boards",
        tooltip: "List supported FPGA boards",
        id: "apio.boards",
        action: { cmds: ["{apio-bin} boards"] },
      },
      {
        title: "List FPGAs",
        tooltip: "List supported FPGAs",
        id: "apio.fpgas",
        action: { cmds: ["{apio-bin} fpgas"] },
      },
      {
        title: "List examples",
        tooltip: "List project examples",
        id: "apio.examples.list",
        action: { cmds: ["{apio-bin} examples list"] },
      },
      {
        title: "FTDI Drivers",
        children: [
          {
            title: "List devices",
            tooltip: "List USB devices",
            id: "apio.devices.usb",
            action: { cmds: ["{apio-bin} devices usb"] },
          },
          {
            title: "Install driver",
            tooltip: "Install FTDI driver for your board",
            id: "apio.drivers.install.ftdi",
            action: { cmds: ["{apio-bin} drivers install ftdi"] },
          },
          {
            title: "Uninstall driver",
            tooltip: "Uninstall the FTDI driver",
            id: "apio.drivers.uninstall.ftdi",
            action: { cmds: ["{apio-bin} drivers uninstall ftdi"] },
          },
        ],
      },
      {
        title: "Serial Drivers",
        children: [
          {
            title: "List devices",
            tooltip: "List serial devices",
            id: "apio.devices.serial",
            action: { cmds: ["{apio-bin} devices serial"] },
          },
          {
            title: "Install driver",
            tooltip: "Install serial driver for your board",
            id: "apio.drivers.install.serial",
            action: { cmds: ["{apio-bin} drivers install serial"] },
          },
          {
            title: "Uninstall driver",
            tooltip: "Uninstall the serial driver",
            id: "apio.drivers.uninstall.serial",
            action: { cmds: ["{apio-bin} drivers uninstall serial"] },
          },
        ],
      },
    ],
  },



  {
    title: "Apio Packages",
    children: [
      {
        title: "List",
        tooltip: "Show the installed apio packages",
        id: "apio.packages.list",
        action: { cmds: ["{apio-bin} packages list"] },
      },
      {
        title: "Update",
        tooltip: "Install missing packages",
        id: "apio.packages.update",
        action: { cmds: ["{apio-bin} packages update"] },
      },
      {
        title: "Refresh",
        tooltip: "Force packages reinstallation",
        id: "apio.packages.update.force",
        action: { cmds: ["{apio-bin} packages update --force"] },
      },
    ],
  },
];

const TOOLS_TREE = [
  {
    title: "Terminal",
    tooltip: "Open terminal at project folder",
    id: "apio.terminal",
    action: { cmds: [] },
  },
];

const HELP_TREE = [
  {
    title: "System info",
    tooltip: "Show Apio installation info",
    id: "apio.info.system",
    action: { cmds: ["{apio-bin} info system"] },
  },
  {
    title: "Apio env",
    tooltip: "Show Apio env settings",
    id: "apio.raw.env",
    action: { cmds: ["{apio-bin} raw --verbose"] },
  },
  {
    title: "Overview",
    tooltip: "Show Apio documentation",
    id: "apio.docs",
    action: { url: "https://fpgawars.github.io/apio/docs" },
  },
  {
    title: "Commands",
    tooltip: "Show Apio commands documentation",
    id: "apio.docs.commands",
    action: { url: "https://fpgawars.github.io/apio/docs/cmd-apio-build" },
  },
  {
    title: "Project file apio.ini",
    tooltip: "Show Apio project file documentation",
    id: "apio.docs.project.file",
    action: { url: "https://fpgawars.github.io/apio/docs/project-file" },
  },
  {
    title: "Ask questions",
    tooltip: "Open Apio discussions",
    id: "apio.discussions",
    action: { url: "https://github.com/FPGAwars/apio/discussions" },
  },
  {
    title: "Report issues",
    tooltip: "Open Apio issues",
    id: "apio.issues",
    action: { url: "https://github.com/FPGAwars/apio/issues" },
  },
  {
    title: "Icestudio",
    tooltip: "A GUI alternative to Apio",
    id: "apio.icestudio",
    action: { url: "https://icestudio.io" },
  },
];


// Exported symbols
module.exports = { COMMANDS_TREE, TOOLS_TREE, HELP_TREE };

