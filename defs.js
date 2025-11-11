// This file contains definitions of the apio commands as trees of
// dict object. We use it to extract and register commands,
// sidebar view entries, and status bar buttons.

const COMMANDS_TREE = [
  {
    title: "Build",
    children: [
      {
        title: "Build",
        tooltip: "Build the apio project",
        id: "apio.build",
        action: { cmds: ["apio build {env-flag}"] },
        btn: { icon: "$(check)", position: 1 },
      },
      {
        title: "Upload",
        tooltip: "Build and upload to the FPGA board",
        id: "apio.upload",
        action: { cmds: ["apio upload {env-flag}"] },
        btn: { icon: "$(play)", position: 3 },
      },
      {
        title: "Clean",
        tooltip: "Clean the build artifacts",
        id: "apio.clean",
        action: { cmds: ["apio clean"] },
        btn: { icon: "$(trash)", position: 7 },
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
        action: { cmds: ["apio lint {env-flag}"] },
        btn: { icon: "$(check-all)", position: 2 },
      },
      {
        title: "Format",
        tooltip: "Format the project source files",
        id: "apio.format",
        action: { cmds: ["apio format"] },
      },
      {
        title: "Sim",
        tooltip: "Run the testbench simulator",
        id: "apio.sim",
        action: { cmds: ["apio sim {env-flag}"] },
        btn: { icon: "$(debug-alt)", position: 5 },
      },
      {
        title: "Test",
        tooltip: "Run automatic tests",
        id: "apio.test",
        action: { cmds: ["apio test"] },
        btn: { icon: "$(beaker)", position: 4 },
      },
      {
        title: "Report",
        tooltip: "Report design utilization and speed",
        id: "apio.report",
        action: { cmds: ["apio report {env-flag}"] },
        btn: { icon: "$(report)", position: 6 },
      },
      {
        title: "Graph",
        tooltip: "Show the design as a graph",
        id: "apio.graph",
        action: { cmds: ["apio graph {env-flag}"] },
      },
    ],
  },

  {
    title: "Boards",
    children: [
      {
        title: "List boards",
        tooltip: "List supported FPGA boards",
        id: "apio.boards",
        action: { cmds: ["apio boards"] },
      },
      {
        title: "List FPGAs",
        tooltip: "List supported FPGAs",
        id: "apio.fpgas",
        action: { cmds: ["apio fpgas"] },
      },
      {
        title: "List examples",
        tooltip: "List project examples",
        id: "apio.examples.list",
        action: { cmds: ["apio examples list"] },
      },
    ],
  },

  {
    title: "Preferences",
    children: [
      {
        title: "Show preferences",
        tooltip: "Show user preferences",
        id: "apio.preferences",
        action: { cmds: ["apio preferences --list"] },
      },
      {
        title: "Set light background theme",
        tooltip: "Select colors for a light background",
        id: "apio.preferences.light",
        action: { cmds: ["apio preferences --theme light"] },
      },
      {
        title: "Set dark background theme",
        tooltip: "Select colors for a dark background",
        id: "apio.preferences.dark",
        action: { cmds: ["apio preferences --theme dark"] },
      },
      {
        title: "Set no colors theme",
        tooltip: "Disable Apio output colors",
        id: "apio.preferences.no-colors",
        action: { cmds: ["apio preferences --theme no-colors"] },
      },
      {
        title: "Show themes colors",
        tooltip: "Show themes colors",
        id: "apio.info.themes",
        action: { cmds: ["apio info themes"] },
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
        action: { cmds: ["apio devices usb"] },
      },
      {
        title: "List serial devices",
        tooltip: "List serial devices",
        id: "apio.devices.serial",
        action: { cmds: ["apio devices serial"] },
      },
      {
        title: "Install FTDI driver",
        tooltip: "Install FTDI driver for your board",
        id: "apio.drivers.install.ftdi",
        action: { cmds: ["apio drivers install ftdi"] },
      },
      {
        title: "Uninstall FTDI driver",
        tooltip: "Uninstall the FTDI driver",
        id: "apio.drivers.uninstall.ftdi",
        action: { cmds: ["apio drivers uninstall ftdi"] },
      },
      {
        title: "Install serial driver",
        tooltip: "Install serial driver for your board",
        id: "apio.drivers.install.serial",
        action: { cmds: ["apio drivers install serial"] },
      },
      {
        title: "Uninstall serial driver",
        tooltip: "Uninstall the serial driver",
        id: "apio.drivers.uninstall.serial",
        action: { cmds: ["apio drivers uninstall serial"] },
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
        action: { cmds: ["apio packages list"] },
      },
      {
        title: "Update",
        tooltip: "Install missing packages",
        id: "apio.packages.update",
        action: { cmds: ["apio packages update"] },
      },
      {
        title: "Refresh",
        tooltip: "Force packages reinstallation",
        id: "apio.packages.update.force",
        action: { cmds: ["apio packages update --force"] },
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
    action: { cmds: ["apio info system"] },
  },
  {
    title: "Apio env",
    tooltip: "Show Apio env settings",
    id: "apio.raw.env",
    action: { cmds: ["apio raw --verbose"] },
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

// A mapping of sidebar sections to command trees.
// Order doesn't matter, the view order is defined by package.json.
const TREE_VIEWS = {
  "apio.sidebar.commands": COMMANDS_TREE,
  "apio.sidebar.tools": TOOLS_TREE,
  "apio.sidebar.help": HELP_TREE,
};

// Exported functions.
module.exports = { TREE_VIEWS };
