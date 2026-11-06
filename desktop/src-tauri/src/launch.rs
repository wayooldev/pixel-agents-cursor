use std::fs;
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use serde::Deserialize;
use tauri::{AppHandle, Manager};

pub const OFFICE_PORT: u16 = 3100;
pub const MIN_NODE_MAJOR: u32 = 20;
const HEALTH_PATH: &str = "/api/health";
const BOOT_TIMEOUT: Duration = Duration::from_secs(45);
const BOOT_POLL: Duration = Duration::from_millis(250);

#[derive(Debug, Deserialize)]
pub struct HealthBody {
  pub status: String,
  pub pid: Option<u32>,
  #[allow(dead_code)]
  pub uptime: Option<u64>,
}

pub enum OfficeLaunch {
  Reuse { url: String },
  Spawned { url: String, child: Child },
}

pub fn ensure_office_running(app: &AppHandle) -> Result<OfficeLaunch, String> {
  if let Some(url) = try_reuse_running()? {
    return Ok(OfficeLaunch::Reuse { url });
  }

  if port_accepts_tcp(OFFICE_PORT) {
    return Err(format!(
      "Port {OFFICE_PORT} is in use by a process that is not a Pixel Agents standalone server.\n\n\
       Stop whatever is listening on 127.0.0.1:{OFFICE_PORT}, or free the port, then try again."
    ));
  }

  let node = resolve_node()?;
  // package root: contains dist/cli.js + dist/hooks (npm layout) and node_modules
  // Strip Windows \\?\ verbatim prefixes — Node's realpathSync chokes on them
  // (EISDIR lstat 'C:') when the absolute script path is passed as argv[1].
  let package_root = strip_verbatim_prefix(resolve_server_dir(app)?);
  let cli = package_root.join("dist").join("cli.js");
  if !cli.is_file() {
    return Err(format!(
      "Packaged server missing at {}.\n\nRun `npm run desktop:stage` (after `npm run package`) and rebuild.",
      cli.display()
    ));
  }

  // GUI (windows subsystem) parents must spawn node with CREATE_NO_WINDOW or
  // the console child can hang / never bind before our health poll times out.
  let log_path = server_log_path().unwrap_or_else(|| PathBuf::from("pixel-agents-desktop-server.log"));
  let log_file = fs::OpenOptions::new()
    .create(true)
    .append(true)
    .open(&log_path)
    .ok();
  let (stdout, stderr) = match log_file {
    Some(f) => {
      let err = f.try_clone().ok();
      (
        Stdio::from(f),
        err.map(Stdio::from).unwrap_or_else(Stdio::null),
      )
    }
    None => (Stdio::null(), Stdio::null()),
  };

  let mut cmd = Command::new(&node);
  // Relative script + cwd avoids absolute-path argv quirks on Windows.
  cmd
    .arg("dist/cli.js")
    .arg("--port")
    .arg(OFFICE_PORT.to_string())
    .arg("--host")
    .arg("127.0.0.1")
    .arg("--no-terminal")
    .current_dir(&package_root)
    .stdin(Stdio::null())
    .stdout(stdout)
    .stderr(stderr);
  #[cfg(windows)]
  {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    cmd.creation_flags(CREATE_NO_WINDOW);
  }

  let mut child = cmd
    .spawn()
    .map_err(|e| format!("Failed to start Node server ({}): {e}", node.display()))?;

  match wait_for_office_url() {
    Ok(url) => Ok(OfficeLaunch::Spawned { url, child }),
    Err(err) => {
      let _ = child.kill();
      let _ = child.wait();
      Err(err)
    }
  }
}

fn try_reuse_running() -> Result<Option<String>, String> {
  if probe_pixel_agents(OFFICE_PORT).is_some() {
    let token = read_standalone_token()?;
    return Ok(Some(office_url(&token)));
  }
  Ok(None)
}

fn wait_for_office_url() -> Result<String, String> {
  let deadline = Instant::now() + BOOT_TIMEOUT;
  while Instant::now() < deadline {
    if probe_pixel_agents(OFFICE_PORT).is_some() {
      if let Ok(token) = read_standalone_token() {
        return Ok(office_url(&token));
      }
    }
    thread::sleep(BOOT_POLL);
  }
  Err(format!(
    "Timed out waiting for Pixel Agents on 127.0.0.1:{OFFICE_PORT}.\n\n\
     From the staged package root run:\n\
     node dist/cli.js --port {OFFICE_PORT} --host 127.0.0.1 --no-terminal\n\n\
     Sidecar log: {}",
    server_log_path()
      .map(|p| p.display().to_string())
      .unwrap_or_else(|| "(unavailable)".into())
  ))
}

fn server_log_path() -> Option<PathBuf> {
  let home = dirs_home()?;
  let dir = home.join(".pixel-agents");
  let _ = fs::create_dir_all(&dir);
  Some(dir.join("desktop-server.log"))
}

/// Windows `fs::canonicalize` / some Tauri resource paths use the `\\?\` prefix.
/// Passing those to Node as the main script makes `realpathSync` fail with EISDIR on `C:`.
pub(crate) fn strip_verbatim_prefix(path: PathBuf) -> PathBuf {
  let lossy = path.to_string_lossy();
  if let Some(rest) = lossy.strip_prefix(r"\\?\") {
    PathBuf::from(rest)
  } else {
    path
  }
}

pub fn resolve_node() -> Result<PathBuf, String> {
  let node = which::which("node").map_err(|_| {
    "Node.js was not found on PATH.\n\n\
     Install Node.js 20 or newer from https://nodejs.org/ and restart Pixel Agents."
      .to_string()
  })?;
  let major = node_major(&node)?;
  if major < MIN_NODE_MAJOR {
    return Err(format!(
      "Node.js {major} is too old (found {}).\n\n\
       Pixel Agents requires Node.js {MIN_NODE_MAJOR} or newer: https://nodejs.org/",
      node.display()
    ));
  }
  Ok(node)
}

fn node_major(node: &Path) -> Result<u32, String> {
  let output = Command::new(node)
    .arg("--version")
    .output()
    .map_err(|e| format!("Could not run node --version: {e}"))?;
  if !output.status.success() {
    return Err("node --version failed".into());
  }
  let text = String::from_utf8_lossy(&output.stdout);
  parse_node_major(&text).ok_or_else(|| format!("Unrecognized Node version: {text}"))
}

pub fn parse_node_major(version_text: &str) -> Option<u32> {
  let trimmed = version_text.trim().trim_start_matches('v');
  let major = trimmed.split('.').next()?;
  major.parse().ok()
}

fn resolve_server_dir(app: &AppHandle) -> Result<PathBuf, String> {
  let looks_like_package_root = |dir: &Path| dir.join("dist").join("cli.js").is_file();

  if let Ok(resource_dir) = app.path().resource_dir() {
    let bundled = resource_dir.join("server");
    if looks_like_package_root(&bundled) {
      return Ok(bundled);
    }
    if looks_like_package_root(&resource_dir) {
      return Ok(resource_dir);
    }
  }

  let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../resources/server");
  let dev = fs::canonicalize(&dev).unwrap_or(dev);
  if looks_like_package_root(&dev) {
    return Ok(dev);
  }

  Err(format!(
    "Cannot find staged server (dist/cli.js).\nExpected under resources/server after `npm run desktop:stage`.\nLooked near {}",
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
      .join("../resources/server")
      .display()
  ))
}

fn port_accepts_tcp(port: u16) -> bool {
  TcpStream::connect_timeout(
    &format!("127.0.0.1:{port}").parse().unwrap(),
    Duration::from_millis(200),
  )
  .is_ok()
}

fn probe_pixel_agents(port: u16) -> Option<HealthBody> {
  let url = format!("http://127.0.0.1:{port}{HEALTH_PATH}");
  let body: HealthBody = ureq::get(&url)
    .timeout(Duration::from_secs(2))
    .call()
    .ok()?
    .into_json()
    .ok()?;
  if is_pixel_agents_health(&body) {
    Some(body)
  } else {
    None
  }
}

pub fn is_pixel_agents_health(body: &HealthBody) -> bool {
  body.status == "ok" && body.pid.is_some()
}

fn read_standalone_token() -> Result<String, String> {
  let path = standalone_token_path()?;
  let deadline = Instant::now() + Duration::from_secs(10);
  while Instant::now() < deadline {
    if let Ok(raw) = fs::read_to_string(&path) {
      let token = raw.trim();
      if !token.is_empty() {
        return Ok(token.to_string());
      }
    }
    thread::sleep(BOOT_POLL);
  }
  Err(format!(
    "Could not read standalone token at {}.\nThe server may have failed to start.",
    path.display()
  ))
}

fn standalone_token_path() -> Result<PathBuf, String> {
  let home = dirs_home().ok_or("Could not resolve user home directory")?;
  Ok(home.join(".pixel-agents").join("standalone-token"))
}

fn dirs_home() -> Option<PathBuf> {
  std::env::var_os("USERPROFILE")
    .or_else(|| std::env::var_os("HOME"))
    .map(PathBuf::from)
}

fn office_url(token: &str) -> String {
  format!("http://127.0.0.1:{OFFICE_PORT}/?token={token}")
}
