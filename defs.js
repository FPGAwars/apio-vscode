// This file contains definitions of the apio commands as trees of
// dict object. We use it to extract and register commands,
// sidebar view entries, and status bar buttons.

const PROJECT_TREE = [
  {
    title: "Build",
    children: [
      {
        title: "Build",
        tooltip: "Build the apio project",
        id: "apio.build",
        cmds: ["apio build {env-flag}"],
        btn: { icon: "$(chip)", priority: 98 },
      },
      {
        title: "Upload",
        tooltip: "Build and upload to the FPGA board",
        id: "apio.upload",
        cmds: ["apio upload {env-flag}"],
        btn: { icon: "$(play)", priority: 96 },
      },
      {
        title: "Clean",
        tooltip: "Clean the build artifacts",
        id: "apio.clean",
        cmds: ["apio clean"],
        btn: { icon: "$(trash)", priority: 95 },
      },
    ],
  },
  {
    title: "Verify",
    children: [
      {
        title: "Lint",
        tooltip: "Lint the source code",
        id: "apio.lint",
        cmds: ["apio lint {env-flag}"],
        btn: { icon: "$(check-all)", priority: 99 },
      },
      {
        title: "Format",
        tooltip: "Format the project source files",
        id: "apio.format",
        cmds: ["apio format"],
      },
      {
        title: "Sim",
        tooltip: "Run simulator on the default testbench",
        id: "apio.sim",
        cmds: ["apio sim {env-flag}"],
      },
      {
        title: "Test",
        tooltip: "Run the testbenchs",
        id: "apio.test",
        cmds: ["apio test"],
      },
      {
        title: "Report",
        tooltip: "Report design utilization and speed",
        id: "apio.report",
        cmds: ["apio report {env-flag}"],
        btn: { icon: "$(report)", priority: 97 },
      },
      {
        title: "Graph",
        tooltip: "Show the design as a graph",
        id: "apio.graph",
        cmds: ["apio graph {env-flag}"],
      },
    ],
  },
];

const BOARDS_TREE = [
  {
    title: "List boards",
    tooltip: "List supported FPGA boards",
    id: "apio.boards",
    cmds: ["apio boards"],
  },
  {
    title: "List FPGAs",
    tooltip: "List supported FPGAs",
    id: "apio.fpgas",
    cmds: ["apio fpgas"],
  },
  {
    title: "List examples",
    tooltip: "List project examples",
    id: "apio.examples.list",
    cmds: ["apio examples list"],
  },
];

const TOOLS_TREE = [
  {
    title: "Terminal",
    tooltip: "Open terminal at project folder",
    id: "apio.terminal",
    cmds: [],
  },
];

const SETTINGS_TREE = [
  {
    title: "Preferences",
    children: [
      {
        title: "Show preferences",
        tooltip: "Show user preferences",
        id: "apio.preferences",
        cmds: ["apio preferences --list"],
      },
      {
        title: "Set light background theme",
        tooltip: "Select colors for a light background",
        id: "apio.preferences.light",
        cmds: ["apio preferences --theme light"],
      },
      {
        title: "Set dark background theme",
        tooltip: "Select colors for a dark background",
        id: "apio.preferences.dark",
        cmds: ["apio preferences --theme dark"],
      },
      {
        title: "Set no colors theme",
        tooltip: "Disable Apio output colors",
        id: "apio.preferences.no-colors",
        cmds: ["apio preferences --theme no-colors"],
      },
      {
        title: "Show themes colors",
        tooltip: "Show themes colors",
        id: "apio.info.themes",
        cmds: ["apio info themes"],
      },
    ],
  },

  {
    title: "System Drivers",
    children: [
      {
        title: "List USB devices",
        tooltip: "List USB devices",
        id: "apio.devices.usb",
        cmds: ["apio devices usb"],
      },
      {
        title: "List serial devices",
        tooltip: "List serial devices",
        id: "apio.devices.serial",
        cmds: ["apio devices serial"],
      },
      {
        title: "Install FTDI driver",
        tooltip: "Install FTDI driver for your board",
        id: "apio.drivers.install.ftdi",
        cmds: ["apio drivers install ftdi"],
      },
      {
        title: "Uninstall FTDI driver",
        tooltip: "Uninstall the FTDI driver",
        id: "apio.drivers.uninstall.ftdi",
        cmds: ["apio drivers uninstall ftdi"],
      },
      {
        title: "Install serial driver",
        tooltip: "Install serial driver for your board",
        id: "apio.drivers.install.serial",
        cmds: ["apio drivers install serial"],
      },
      {
        title: "Uninstall serial driver",
        tooltip: "Uninstall the serial driver",
        id: "apio.drivers.uninstall.serial",
        cmds: ["apio drivers uninstall serial"],
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
        cmds: ["apio packages list"],
      },
      {
        title: "Update",
        tooltip: "Install missing packages",
        id: "apio.packages.update",
        cmds: ["apio packages update"],
      },
      {
        title: "Refresh",
        tooltip: "Force packages reinstallation",
        id: "apio.packages.update.force",
        cmds: ["apio packages update --force"],
      },
    ],
  },
];

const HELP_TREE = [
  {
    title: "Apio info",
    tooltip: "Show Apio installation info",
    id: "apio.info.system",
    cmds: ["apio info system"],
  },
  {
    title: "Apio env",
    tooltip: "Show Apio env settings",
    id: "apio.raw.env",
    cmds: ["apio raw --verbose"],
  },
  {
    title: "Apio docs",
    tooltip: "Open Apio documentation",
    id: "apio.docs",
    cmds: ["apio docs"],
  },
];

// A mapping of sidebar sections to command trees.
// Order doesn't matter, the view order is defined by package.json.
const TREE_VIEWS = {
  "apio.sidebar.project": PROJECT_TREE,
  "apio.sidebar.boards": BOARDS_TREE,
  "apio.sidebar.tools": TOOLS_TREE,
  "apio.sidebar.settings": SETTINGS_TREE,
  "apio.sidebar.help": HELP_TREE,
};

// Exported functions.
module.exports = { TREE_VIEWS };
