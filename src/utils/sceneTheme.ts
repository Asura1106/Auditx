export type SceneMode = 'auto' | 'morning' | 'afternoon' | 'evening' | 'night';
export type ActiveScene = Exclude<SceneMode, 'auto'>;

export const manualScenes: ActiveScene[] = ['morning', 'afternoon', 'evening', 'night'];

export function getAutoScene(date: Date): ActiveScene {
  const hour = date.getHours() + date.getMinutes() / 60;

  if (hour >= 5.5 && hour < 11.5) return 'morning';
  if (hour >= 11.5 && hour < 16.5) return 'afternoon';
  if (hour >= 16.5 && hour < 19.5) return 'evening';
  return 'night';
}

export function getActiveScene(mode: SceneMode, date = new Date()): ActiveScene {
  return mode === 'auto' ? getAutoScene(date) : mode;
}

export function cycleScene(mode: SceneMode): SceneMode {
  if (mode === 'auto') return 'morning';
  const index = manualScenes.indexOf(mode);
  return manualScenes[(index + 1) % manualScenes.length];
}

export function getSceneLabel(mode: SceneMode, date = new Date()) {
  const activeScene = getActiveScene(mode, date);
  return `${mode === 'auto' ? 'Auto' : 'Manual'} • ${activeScene[0].toUpperCase()}${activeScene.slice(1)}`;
}

export function getScenePalette(scene: ActiveScene) {
  if (scene === 'morning') {
    return {
      background: 'linear-gradient(135deg, #eef5ff 0%, #dfeafe 42%, #c7d9ff 100%)',
      surface: '#f8fbff',
      surface2: '#edf3ff',
      topbar: 'linear-gradient(180deg, rgba(245, 250, 255, 0.92), rgba(231, 240, 255, 0.88))',
      sidebar: 'linear-gradient(180deg, #f8fbff, #eef4ff)',
      card: 'linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(243, 248, 255, 0.88))',
      text: '#1d2a44',
      muted: '#5b6b89',
      border: 'rgba(88, 112, 168, 0.18)',
      line: 'rgba(88, 112, 168, 0.16)',
      glow: 'rgba(72, 122, 255, 0.16)',
      ok: '#0ea65b',
      warn: '#d97706',
      danger: '#db4d6d',
    };
  }

  if (scene === 'afternoon') {
    return {
      background: 'linear-gradient(135deg, #fff0c6 0%, #ffd48b 42%, #ffb36f 100%)',
      surface: '#fff9ef',
      surface2: '#fff1da',
      topbar: 'linear-gradient(180deg, rgba(255, 248, 232, 0.95), rgba(255, 236, 207, 0.92))',
      sidebar: 'linear-gradient(180deg, #fff9ef, #ffedd0)',
      card: 'linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 247, 231, 0.9))',
      text: '#4c381f',
      muted: '#8c6a43',
      border: 'rgba(189, 126, 42, 0.18)',
      line: 'rgba(189, 126, 42, 0.16)',
      glow: 'rgba(255, 156, 64, 0.18)',
      ok: '#0c9b64',
      warn: '#c77700',
      danger: '#d44f4f',
    };
  }

  if (scene === 'evening') {
    return {
      background: 'linear-gradient(135deg, #ffe0cc 0%, #f6a575 38%, #8a5aa6 100%)',
      surface: '#fdf2ee',
      surface2: '#f4e3f0',
      topbar: 'linear-gradient(180deg, rgba(255, 243, 239, 0.94), rgba(245, 225, 231, 0.9))',
      sidebar: 'linear-gradient(180deg, #fff6f2, #f6e4ea)',
      card: 'linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 237, 244, 0.9))',
      text: '#4a2f3f',
      muted: '#7c596b',
      border: 'rgba(154, 86, 114, 0.18)',
      line: 'rgba(154, 86, 114, 0.16)',
      glow: 'rgba(247, 125, 84, 0.18)',
      ok: '#0c9b64',
      warn: '#c77700',
      danger: '#d44f4f',
    };
  }

  return {
    background: 'linear-gradient(135deg, #081120 0%, #121d38 52%, #050814 100%)',
    surface: '#0b1020',
    surface2: '#111a2c',
    topbar: 'linear-gradient(180deg, rgba(9, 15, 28, 0.95), rgba(5, 10, 20, 0.92))',
    sidebar: 'linear-gradient(180deg, #0c1220, #070c16)',
    card: 'linear-gradient(180deg, rgba(15, 23, 42, 0.86), rgba(9, 16, 28, 0.9))',
    text: '#e5e7eb',
    muted: '#7fa8bc',
    border: 'rgba(34, 211, 238, 0.18)',
    line: 'rgba(34, 211, 238, 0.16)',
    glow: 'rgba(34, 211, 238, 0.22)',
    ok: '#00d66b',
    warn: '#f59e0b',
    danger: '#fb7185',
  };
}
