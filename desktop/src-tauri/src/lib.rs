mod launch;

use std::process::Child;
use std::sync::Mutex;

use launch::{ensure_office_running, OfficeLaunch, OFFICE_PORT};
use tauri::{Manager, RunEvent};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

struct OwnedServer(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .manage(OwnedServer(Mutex::new(None)))
    .setup(|app| {
      let handle = app.handle().clone();
      match ensure_office_running(&handle) {
        Ok(OfficeLaunch::Reuse { url }) => {
          navigate_main(&handle, &url)?;
        }
        Ok(OfficeLaunch::Spawned { url, child }) => {
          if let Ok(mut guard) = handle.state::<OwnedServer>().0.lock() {
            *guard = Some(child);
          }
          navigate_main(&handle, &url)?;
        }
        Err(message) => {
          eprintln!("[Pixel Agents Desktop] {message}");
          handle
            .dialog()
            .message(&message)
            .kind(MessageDialogKind::Error)
            .title("Pixel Agents")
            .blocking_show();
          handle.exit(1);
        }
      }
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building Pixel Agents desktop")
    .run(|app_handle, event| {
      if let RunEvent::Exit = event {
        if let Some(state) = app_handle.try_state::<OwnedServer>() {
          if let Ok(mut guard) = state.0.lock() {
            if let Some(mut child) = guard.take() {
              let _ = child.kill();
              let _ = child.wait();
            }
          }
        }
      }
    });
}

fn navigate_main(app: &tauri::AppHandle, url: &str) -> Result<(), Box<dyn std::error::Error>> {
  let window = app
    .get_webview_window("main")
    .ok_or("main window missing")?;
  let parsed = url.parse()?;
  window.navigate(parsed)?;
  println!(
    "[Pixel Agents Desktop] Office at {url} (port {OFFICE_PORT}; owned child killed only if we spawned it)"
  );
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::launch::{is_pixel_agents_health, parse_node_major, HealthBody};

  #[test]
  fn accepts_pixel_agents_health_json() {
    let body = HealthBody {
      status: "ok".into(),
      pid: Some(1234),
      uptime: Some(10),
    };
    assert!(is_pixel_agents_health(&body));
  }

  #[test]
  fn rejects_foreign_health_json() {
    let body = HealthBody {
      status: "healthy".into(),
      pid: None,
      uptime: None,
    };
    assert!(!is_pixel_agents_health(&body));
  }

  #[test]
  fn parses_node_major_version() {
    assert_eq!(parse_node_major("v20.11.0\n"), Some(20));
    assert_eq!(parse_node_major("v24.12.0"), Some(24));
    assert_eq!(parse_node_major("v18.19.0"), Some(18));
    assert_eq!(parse_node_major("not-a-version"), None);
  }
}

#[cfg(test)]
mod strip_verbatim_tests {
  use super::launch::strip_verbatim_prefix;
  use std::path::PathBuf;

  #[test]
  fn strips_windows_verbatim_prefix() {
    let raw = PathBuf::from(r"\\?\C:\Projects\pixel-agents\resources\server");
    let stripped = strip_verbatim_prefix(raw);
    assert_eq!(
      stripped,
      PathBuf::from(r"C:\Projects\pixel-agents\resources\server")
    );
  }

  #[test]
  fn leaves_normal_paths_alone() {
    let raw = PathBuf::from(r"C:\Projects\pixel-agents\resources\server");
    assert_eq!(strip_verbatim_prefix(raw.clone()), raw);
  }
}
