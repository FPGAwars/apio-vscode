

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


