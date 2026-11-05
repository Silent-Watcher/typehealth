# Analysis Engine

TypeHealth builds on the [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API). It never re-implements TypeScript parsing or config resolution itself.

## Discovery pipeline

`typehealth scan` performs discovery in this order:

1. **Project directory resolution** — the `--cwd` option (default: current directory) is resolved to an absolute path and must be an existing directory.
2. **tsconfig resolution** — `--config` is used when given; otherwise the nearest `tsconfig.json` up the directory tree from the project directory is used (via `ts.findConfigFile`).
3. **Config parsing** — the file is read with `ts.readConfigFile`; invalid JSON or schema errors are reported with TypeScript's own diagnostics, and the scan exits with code 2.
4. **File expansion** — `ts.parseJsonConfigFileContent` expands `include`/`exclude`/`files` patterns exactly as `tsc` would.
5. **Scope filtering** — on top of the tsconfig result, TypeHealth drops:
   - declaration files (`*.d.ts`),
   - any file outside the project directory,
   - any file inside `node_modules/`, `dist/`, `build/` or `coverage/`.

## Limitations

- A tsconfig that matches no input files is reported as an error (the same behavior as `tsc`).
- File discovery is restricted to the project directory even if the tsconfig's `include` patterns reach outside it; use `--config` with a config whose patterns cover the intended scope.
- Symlink handling is reviewed in the hardening phase (Phase 8).

The analysis stage (metrics and findings) builds on this file list and will be documented here as it is implemented.
