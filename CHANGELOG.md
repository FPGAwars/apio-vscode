

## [0.1.7]

### Changed

- Added a menu command to test only the default testbench, similar to the
  behavior of the sim command which tests the `default-testbench` defined
  in `apio.ini`, or the existing testbench if the project has exactly one
  testbench.

- The `sim` command now creates automatically a `.gtkw` default file to have
  GTKWave showing the testbench signals when it opens. This selection of
  signals and their display setting can then be changed in GTKWave and
  saved a a user created `.gtkw` file. See more details in the documentation
  of the `sim` command at <https://fpgawars.github.io/apio/docs/cmd-apio-sim>.

- Added a command `report (detached)` that prints additional information such
  as critical nets.

- Now exiting with an error if a testbench contains `$dumpfile(...)` (used to
  be a warning). Apio sets automatically the location of the dumpfiles based
  on the currently active environment.

- Apio now defines the macro `SYNTHESIZE` that allows to simulate modules that
  use blackbox primitive cells. <https://fpgawars.github.io/apio/docs/apio-macros>.

## [0.1.6]

### Changed
- Added support for legacy MacOS/Intel (x86-64)

- The option 'top-module' is now required in apio.ini. In prefious version it
  was optional with default value 'main'.  

## [0.1.5]

### Cleanup
- Maintenance release. Streamlined the internal Apio build workflows.

## [0.1.4]

### Changed
- Custom `boards.jsonc`, `fpgas.jsonc`, and `programmers.jsonc` definition files are now
  merged with the standard definitions files instead of replacing them. This allows
  to use in the same project both standard and custom definitions. In case of a
  conflict, the custom files win.

- FPGA constraint files such as `pinout.pcf` can now be placed also in subdirectories.
  Previously they had to reside at the top directory of the project. This provides more flexibility in multi-board projects.

## [0.1.3]

Initial version.


