// examples-data.js
// Full Apio examples data – all boards and examples (as of apio examples --list)

const EXAMPLES_DATA = {
  "examples": {
    "alchitry-cu": {
      "blinky": { "description": "Blinking all leds" }
    },
    "alhambra-ii": {
      "area-test": { "description": "Area Test Module for ice40hx8k FPGA" },
      "bcd-counter": { "description": "Verilog example with testbenches and subdirectories." },
      "bcd-counter-sv": { "description": "System Verilog example with testbenches and subdirectories." },
      "blinky": { "description": "Blinking led" },
      "getting-started": { "description": "Example for Apio getting-Starting docs." },
      "ledon": { "description": "Turning on a led" },
      "multienv": { "description": "Multi apio env demo" },
      "pll": { "description": "Using PLL." },
      "prog-cmd": { "description": "Using the 'programmer-cmd' option in apio.ini" },
      "speed-test": { "description": "Speed test" },
      "template": { "description": "Project template" }
    },
    "blackice": {
      "blink": { "description": "Blinking a led" },
      "blinky": { "description": "Blinking a led" }
    },
    "colorlight-5a-75b-v8": {
      "blinky": { "description": "Blinking a led" },
      "ledon": { "description": "Blinking leds" },
      "ledon-sv": { "description": "Blinking leds (system verilog)" },
      "pll": { "description": "Using a PLL." },
      "speed-test": { "description": "Speed test" }
    },
    "colorlight-5a-75e-v71-ft2232h": {
      "blinky": { "description": "Blinking a led" },
      "ledon": { "description": "Blinking leds" }
    },
    "cynthion-r1-4": {
      "blinky": { "description": "Blinking a led" }
    },
    "edu-ciaa-fpga": {
      "and-gate-sv": { "description": "Experimental system-verilog" },
      "blinky": { "description": "Blinking a led" },
      "led-green": { "description": "Turning on a led" },
      "template": { "description": "Project template" }
    },
    "fomu": {
      "blink": { "description": "Tri-colour led blink" },
      "dsp": { "description": "Using -dsp to enable DSP cells." }
    },
    "go-board": {
      "blinky": { "description": "Blinking a led" },
      "leds": { "description": "Turning all leds on" },
      "template": { "description": "Project template" }
    },
    "ice40-hx1k-evb": {
      "leds": { "description": "Turning leds on/off" }
    },
    "ice40-hx8k-evb": {
      "leds": { "description": "Turning leds on/off" }
    },
    "ice40-hx8k": {
      "leds": { "description": "Turning all the leds on" }
    },
    "ice40-up5k": {
      "blinky": { "description": "Blink the RGB led" },
      "led-green": { "description": "Turning the RGB led green" },
      "switches": { "description": "Switches controlling RGB led" }
    },
    "icebreaker": {
      "blinky": { "description": "Blinking a led" },
      "buttons": { "description": "Controlling a led using the buttons" },
      "led-green": { "description": "Turning the green led on" }
    },
    "icefun": {
      "blinky": { "description": "Blinking LEDs. AI generated testbench." },
      "led-matrix": { "description": "LED matrix module." }
    },
    "icepi-zero": {
      "blinky": { "description": "Blinking a led" }
    },
    "icestick": {
      "leds": { "description": "Turning all the lds on" },
      "template": { "description": "Project template" }
    },
    "icesugar-1-5": {
      "blinky": { "description": "Blinking red/green/blue leds" }
    },
    "icewerx": {
      "blinky": { "description": "Blinking the Green LED" },
      "ledon": { "description": "Turning on the red led" }
    },
    "icezum": {
      "frere-jacques": { "description": "Frère Jacques two voices melody (see README.md)" },
      "leds": { "description": "Turning all the leds on" },
      "marcha-imperial": { "description": "Project template for the icezum board" },
      "template": { "description": "Project template" },
      "wire": { "description": "Describing a simple wire" }
    },
    "kefir": {
      "leds": { "description": "Turning all the leds on" },
      "template": { "description": "Project template" }
    },
    "sipeed-tang-nano-20k": {
      "blinky": { "description": "Blinking led" },
      "pll": { "description": "Using 60Mhz PLL" },
      "speed-test": { "description": "Speed test" }
    },
    "sipeed-tang-nano-4k": {
      "blinky": { "description": "Blinking led (untested)" }
    },
    "sipeed-tang-nano-9k": {
      "blinky": { "description": "Blinking led" },
      "blinky-sv": { "description": "Blinking led (system verilog)" },
      "pll": { "description": "PLL clock multiplier" },
      "speed-test": { "description": "Speed test" }
    },
    "tinyfpga-b2": {
      "blinky": { "description": "Blinking a led" },
      "template": { "description": "Project template" }
    },
    "tinyfpga-bx": {
      "blink-sos": { "description": "Blink SOS pattern" },
      "blinky": { "description": "Blinking led" },
      "clock-divider": { "description": "Clock divider with two phases outputs" },
      "template": { "description": "Project template" }
    },
    "ulx3s-12f": {
      "blinky": { "description": "Blinking a led" },
      "ledon": { "description": "Turning on a led" }
    },
    "ulx3s-45f": {
      "blinky": { "description": "Blinking leds" }
    },
    "ulx3s-85f": {
      "blinky": { "description": "Blinking leds" }
    },
    "upduino31": {
      "blinky": { "description": "Using the SB_RGBA_DRV primitive led driver" },
      "testbench": { "description": "A testbench example" }
    }
  }
};

module.exports = {EXAMPLES_DATA};
