"""Tasks definitions for the 'invoke' command."""

# To install 'invoke' and the other dependencies run:
#   pip install -r requirements.txt
#
# The tasks work on macOS, Linux and Windows, locally and in the CI
# workflows. They require Node.js of the major version specified in
# package.json engines.node. If nvm is installed, they use the version it
# selects, as the old scripts did, otherwise the node in PATH.
#
# A few useful Invoke tasks
#   invoke --list         # Show available tasks
#   invoke -l             # Show available tasks
#   invoke setup          # One time setup of the test env.
#   invoke lint           # Lint the javascript code.
#   invoke test           # Lint and run the integration tests.
#   invoke build          # Build the apio-*.vsix package.
#   invoke install        # Build and install the extension in VS Code.
#   invoke uninstall      # Uninstall the extension and clear VS Code caches.
#   invoke clean          # Delete generated files, e.g. node_modules.
#   invoke update-locks   # Update package-lock.json.
#
#  NOTE: The shortcut 'inv' can be used instead of 'invoke'.

import os
import re
import sys
import json
import shutil
import zipfile
import platform
import subprocess
from pathlib import Path
from subprocess import CompletedProcess
from invoke.tasks import task
from invoke.context import Context
from rich.console import Console

# ========================== Helper definitions ===============================


# -- NOTE: The first sentence of a task docstring is also its help string
# -- which is printed when running 'invoke --list'.

IS_WINDOWS = platform.system() == "Windows"
IS_DARWIN = platform.system() == "Darwin"

# -- The id of the extension, as used by the 'code' command.
EXTENSION_ID = "fpgawars.apio"

# -- The root of this repo is the directory that contains this file.
REPO_ROOT = Path(__file__).resolve().parent

# -- For outputting via Rich. The regular rich.print() doesn't allow to
# -- disable markup. In GitHub workflows stdout is not a terminal so we
# -- force the colors which the workflow logs display.
console = Console(force_terminal=True if os.environ.get("CI") else None)


def cout(*args, markup=False, highlight=False, **kwargs):
    """A shortcut for Rich lib console.print()."""
    console.print(*args, markup=markup, highlight=highlight, **kwargs)


def fatal(msg: str) -> None:
    """Print an error message and exit."""
    cout(msg, style="red bold")
    sys.exit(1)


def announce_task(ctx: Context, task_name: str) -> None:
    """Prints a message saying that the task is starting."""
    # -- The tasks don't support invoke's --dry option. We abort rather than
    # -- ignoring it, since the user may expect that nothing is executed.
    if ctx.config.run.dry:
        fatal("The invoke --dry option is not supported by these tasks.")
    cout(f"Executing Apio IDE dev task: {task_name}", style="magenta bold")


def resolve_cmd(cmd: list[str]) -> list[str]:
    """Replace the program name in the command with its full path. This is
    required on Windows where npm, npx and code are .cmd files."""
    program = shutil.which(cmd[0])
    if program is None:
        fatal(f"Command '{cmd[0]}' not found in PATH.")
    return [program] + cmd[1:]


def run(cmd: list[str]) -> None:
    """Run a command in the repo root. Abort if it returns an error code."""
    cout(" ".join(cmd), style="cyan")
    result: CompletedProcess = subprocess.run(
        resolve_cmd(cmd), cwd=REPO_ROOT, check=False
    )
    if result.returncode != 0:
        fatal("Command failed.")


def run_output(cmd: list[str]) -> str:
    """Run a command in the repo root and return its stdout. Abort if it
    returns an error code."""
    result: CompletedProcess = subprocess.run(
        resolve_cmd(cmd),
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        cout(result.stderr)
        fatal(f"Command failed: {' '.join(cmd)}")
    return result.stdout


def node_version() -> str:
    """Return the version of the node in PATH, e.g. 'v22.1.0'."""
    return run_output(["node", "--version"]).strip()


def major_of(version: str) -> str:
    """Return the major number of a version string, e.g. 'v22.1.0' -> '22'."""
    return re.match(r"v?(\d+)", version).group(1)


def nvm_node_dir(major: str) -> Path | None:
    """Return the directory with the node executable that nvm selects for the
    given major version, or None if nvm is not installed. Same as the old
    scripts, this runs 'nvm install <major>' which also installs the latest
    release of that major version if it's not installed yet."""
    nvm_sh = Path(os.environ.get("NVM_DIR", Path.home() / ".nvm")) / "nvm.sh"
    # -- In the CI workflows we use the node installed by actions/setup-node.
    if IS_WINDOWS or os.environ.get("CI") or not nvm_sh.is_file():
        return None

    # -- nvm is a bash function so we run it in a bash subprocess. The output
    # -- of 'nvm install' goes to stderr so stdout has only the node path.
    script = (
        f'. "{nvm_sh}" && nvm install {major} >&2 && nvm which {major}'
    )
    # -- nvm refuses to work if npm_config_prefix is set, e.g. when running
    # -- under npm.
    env = {k: v for k, v in os.environ.items() if k != "npm_config_prefix"}
    result: CompletedProcess = subprocess.run(
        ["bash", "-c", script], stdout=subprocess.PIPE, text=True, env=env,
        check=False,
    )
    if result.returncode != 0:
        fatal(f"Failed to get Node.js {major} using nvm.")
    return Path(result.stdout.strip().splitlines()[-1]).parent


def nvm_windows_node_dir(major: str) -> Path | None:
    """Return the directory with the node executable of the latest version
    of the given major that was installed by nvm-windows, or None if not
    found. E.g. %NVM_HOME%\\v22.1.0\\node.exe."""
    nvm_home = os.environ.get("NVM_HOME")
    if not IS_WINDOWS or not nvm_home:
        return None
    version_dirs = [d for d in Path(nvm_home).glob(f"v{major}.*") if d.is_dir()]
    if not version_dirs:
        return None
    # -- Pick the latest version, comparing numerically, e.g. v22.10 > v22.9.
    return max(
        version_dirs,
        key=lambda d: tuple(int(n) for n in re.findall(r"\d+", d.name)),
    )


# -- Set once the node version was checked, so we don't repeat it when a
# -- task calls another task.
_node_version_ensured = False


def ensure_node_version() -> None:
    """Make sure that the commands we run use the Node.js major version of
    package.json engines.node (e.g. '22.x'). If nvm is installed, we use the
    version it selects, as the old scripts did with 'nvm install 22' and
    'nvm use 22'. Otherwise we use the node in PATH if it has the right
    version, e.g. in the CI workflows, or the latest one installed by
    nvm-windows. The node directory is added at the beginning of the PATH of
    this process and of the commands it runs. Aborts if not found."""
    global _node_version_ensured  # pylint: disable=global-statement
    if _node_version_ensured:
        return

    package_json = json.loads((REPO_ROOT / "package.json").read_text("utf-8"))
    required_major = major_of(package_json["engines"]["node"])

    node_dir = nvm_node_dir(required_major)
    if node_dir is None and major_of(node_version()) != required_major:
        node_dir = nvm_windows_node_dir(required_major)
        if node_dir is None:
            fatal(
                f"Node.js {required_major} is required but found "
                f"{node_version()}.\n"
                f"Install it, e.g. with 'nvm install {required_major}'."
            )

    if node_dir is not None:
        os.environ["PATH"] = str(node_dir) + os.pathsep + os.environ["PATH"]

    version = node_version()
    assert major_of(version) == required_major, version
    where = f" from {node_dir}" if node_dir else ""
    cout(f"Using Node.js {version}{where}")
    _node_version_ensured = True


def delete_item(item: Path, root: Path) -> None:
    """Delete a file or a directory, which must be strictly under root."""
    item = item.resolve()
    root = root.resolve()
    assert root in item.parents, f"{item} is not under {root}"

    if not item.exists():
        return

    if item.is_dir():
        cout(f"[d] {item}")

        # -- On Windows, read only files fail the deletion so we make
        # -- them writable and retry.
        def on_exc(func, path, _):
            os.chmod(path, 0o777)
            func(path)

        if sys.version_info >= (3, 12):
            shutil.rmtree(item, onexc=on_exc)
        else:
            shutil.rmtree(item, onerror=on_exc)
    else:
        cout(f"[f] {item}")
        item.unlink()


def the_vsix_file() -> Path:
    """Return the apio-*.vsix file in the repo root. Abort if there isn't
    exactly one."""
    files = sorted(REPO_ROOT.glob("apio-*.vsix"))
    if len(files) != 1:
        fatal(f"Expected one apio-*.vsix file, found {len(files)}.")
    return files[0]


def find_code_cmd() -> str:
    """Return the 'code' VS Code command, either in PATH or in its
    standard installation location."""
    if shutil.which("code"):
        return "code"

    candidates: list[Path] = []
    if IS_DARWIN:
        candidates.append(
            Path(
                "/Applications/Visual Studio Code.app"
                "/Contents/Resources/app/bin/code"
            )
        )
    elif IS_WINDOWS:
        for env_var, subdir in [
            ("LOCALAPPDATA", "Programs/Microsoft VS Code"),
            ("ProgramFiles", "Microsoft VS Code"),
        ]:
            if os.environ.get(env_var):
                candidates.append(
                    Path(os.environ[env_var]) / subdir / "bin" / "code.cmd"
                )
    else:
        candidates.extend([Path("/usr/bin/code"), Path("/snap/bin/code")])

    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)

    fatal("The VS Code 'code' command was not found.")
    return ""  # Not reached.


def vscode_user_dir() -> Path:
    """Return the VS Code user data directory that contains its caches."""
    if IS_DARWIN:
        return Path.home() / "Library" / "Application Support" / "Code"
    if IS_WINDOWS:
        return Path(os.environ["APPDATA"]) / "Code"
    return Path.home() / ".config" / "Code"


def uninstall_extension(code_cmd: str) -> None:
    """Uninstall the extension from the local VSCode."""
    installed = run_output([code_cmd, "--list-extensions"]).lower().split()
    if EXTENSION_ID in installed:
        run([code_cmd, "--uninstall-extension", EXTENSION_ID])
    else:
        cout(f"Extension {EXTENSION_ID} is not installed.")

    # -- Remove any leftover files of the extension.
    extensions_dir = Path.home() / ".vscode" / "extensions"
    for item in extensions_dir.glob(f"{EXTENSION_ID}*"):
        delete_item(item, extensions_dir)


# ===================== Tasks definitions start here ==========================


@task(name="clean", aliases=["c", "cl"])
def clean_task(ctx: Context):
    """Delete node_modules, .vscode-test, __pycache__ and *.vsix files."""
    announce_task(ctx, "clean")
    items: list[Path] = []
    items.extend(REPO_ROOT.glob("*.vsix"))
    items.extend(REPO_ROOT.glob("node_modules"))
    items.extend(REPO_ROOT.glob(".vscode-test"))
    items.extend(REPO_ROOT.glob("__pycache__"))

    if not items:
        print("Already clean.")
        return

    print("Deleting:")
    for item in items:
        delete_item(item, REPO_ROOT)


@task(name="setup", aliases=["s"])
def setup_task(ctx: Context):
    """One time setup of the test env. Required before running the tests."""
    announce_task(ctx, "setup")
    ensure_node_version()
    clean_task(ctx)
    workspace = REPO_ROOT / ".vscode-test" / "workspace"
    cout(f"Creating {workspace}")
    workspace.mkdir(parents=True, exist_ok=True)
    run(["npm", "ci"])


@task(name="lint", aliases=["l"])
def lint_task(ctx: Context):
    """Lint the javascript code. Requires 'invoke setup'."""
    announce_task(ctx, "lint")
    ensure_node_version()
    if not (REPO_ROOT / "node_modules").is_dir():
        fatal("node_modules not found, run 'invoke setup' first.")
    # -- Runs the 'lint' script in package.json.
    run(["npm", "run", "lint"])


@task(
    name="test",
    aliases=["t"],
    help={
        "code_version": "The VS Code version to test with, e.g. 'stable' "
        "(default), 'insiders', or '1.125.0'.",
    },
)
def test_task(ctx: Context, code_version=None):
    """Lint and run the integration tests. Requires 'invoke setup'."""
    lint_task(ctx)
    announce_task(ctx, "test")

    cmd = ["npx", "vscode-test"]
    if code_version:
        cmd.extend(["--code-version", code_version])

    run(cmd)


@task(name="build", aliases=["b"])
def build_task(ctx: Context):
    """Build the apio-*.vsix extension package."""
    announce_task(ctx, "build")
    ensure_node_version()
    clean_task(ctx)
    run(["npm", "ci", "--foreground-scripts", "--legacy-peer-deps"])
    run(["npx", "vsce", "package"])

    # -- List the files in the package.
    vsix = the_vsix_file()
    with zipfile.ZipFile(vsix) as zf:
        for info in zf.infolist():
            cout(f"{info.file_size:>10}  {info.filename}")
    cout(
        f"\nBuilt {vsix.name} ({vsix.stat().st_size:,} bytes).",
        style="green bold",
    )


@task(name="install", aliases=["in"])
def install_task(ctx: Context):
    """Build and install the extension in the local VS Code."""
    build_task(ctx)
    announce_task(ctx, "install")
    code_cmd = find_code_cmd()
    uninstall_extension(code_cmd)

    run([code_cmd, "--install-extension", str(the_vsix_file())])
    cout("Extension installed, restart VS Code.", style="green bold")


@task(name="uninstall", aliases=["un"])
def uninstall_task(ctx: Context):
    """Uninstall the extension and clear the VS Code caches."""
    announce_task(ctx, "uninstall")
    code_cmd = find_code_cmd()
    uninstall_extension(code_cmd)

    # -- Clear the VS Code caches.
    user_dir = vscode_user_dir()
    for name in [
        "Cache",
        "CachedData",
        "CachedExtensions",
        "CachedExtensionVSIXs",
        "Code Cache",
    ]:
        delete_item(user_dir / name, user_dir)

    cout(
        "Done. Restart VS Code, then reinstall the extension, "
        "e.g. with 'invoke install'.",
        style="green bold",
    )


@task(name="update-versions", aliases=[])
def update_locks_task(ctx: Context):
    """Update package-lock.json to the latest allowed versions."""
    announce_task(ctx, "update-locks")
    ensure_node_version()
    delete_item(REPO_ROOT / "node_modules", REPO_ROOT)
    delete_item(REPO_ROOT / "package-lock.json", REPO_ROOT)
    # -- Update package-lock.json. Add --no-audit if it's too flaky.
    run(
        [
            "npm",
            "install",
            "--package-lock-only",
            "--foreground-scripts",
            "--legacy-peer-deps",
            "--engine-strict",
            "--progress=false",
        ],
    )
    # -- Update node_modules based on package-lock.json.
    run(["npm", "ci", "--foreground-scripts", "--legacy-peer-deps"])
