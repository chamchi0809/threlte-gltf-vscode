<script lang="ts">
  import { vscode } from './vscode';

  const saved = (vscode.getState() as Record<string, unknown>) ?? {};

  let modelPath = $state((saved.modelPath as string) ?? '');
  let outputPath = $state((saved.outputPath as string) ?? '');
  let running = $state(false);
  let logs = $state('');
  let logEl: HTMLPreElement;

  // flags
  let types = $state((saved.types as boolean) ?? false);
  let keepnames = $state((saved.keepnames as boolean) ?? false);
  let keepgroups = $state((saved.keepgroups as boolean) ?? false);
  let meta = $state((saved.meta as boolean) ?? false);
  let shadows = $state((saved.shadows as boolean) ?? false);
  let preload = $state((saved.preload as boolean) ?? false);
  let suspense = $state((saved.suspense as boolean) ?? false);
  let isolated = $state((saved.isolated as boolean) ?? false);
  let debug = $state((saved.debug as boolean) ?? false);

  // transform group
  let transform = $state((saved.transform as boolean) ?? false);
  let keepmeshes = $state((saved.keepmeshes as boolean) ?? false);
  let keepmaterials = $state((saved.keepmaterials as boolean) ?? false);
  let resolution = $state((saved.resolution as number) ?? 1024);
  let format = $state((saved.format as string) ?? 'webp');

  // simplify group
  let simplify = $state((saved.simplify as boolean) ?? false);
  let weld = $state((saved.weld as number) ?? 0.0001);
  let ratio = $state((saved.ratio as number) ?? 0.75);
  let error = $state((saved.error as number) ?? 0.001);

  // formatting
  let printwidth = $state((saved.printwidth as number) ?? 120);
  let precision = $state((saved.precision as number) ?? 2);

  // paths
  let dracoPath = $state((saved.dracoPath as string) ?? '');
  let rootPath = $state((saved.rootPath as string) ?? '');
  let workspacePublicPath = $state('');

  const flags = [
    { get: () => types, set: (v: boolean) => (types = v), name: 'types' },
    { get: () => keepnames, set: (v: boolean) => (keepnames = v), name: 'keepnames' },
    { get: () => keepgroups, set: (v: boolean) => (keepgroups = v), name: 'keepgroups' },
    { get: () => meta, set: (v: boolean) => (meta = v), name: 'meta' },
    { get: () => shadows, set: (v: boolean) => (shadows = v), name: 'shadows' },
    { get: () => preload, set: (v: boolean) => (preload = v), name: 'preload' },
    { get: () => suspense, set: (v: boolean) => (suspense = v), name: 'suspense' },
    { get: () => isolated, set: (v: boolean) => (isolated = v), name: 'isolated' },
    { get: () => debug, set: (v: boolean) => (debug = v), name: 'debug' },
  ];

  // Auto-save settings
  $effect(() => {
    vscode.setState({
      modelPath, outputPath,
      types, keepnames, keepgroups, meta, shadows, preload, suspense, isolated, debug,
      transform, keepmeshes, keepmaterials, resolution, format,
      simplify, weld, ratio, error,
      printwidth, precision,
      dracoPath, rootPath,
    });
  });

  function pickModel() {
    vscode.postMessage({ type: 'pickFile', field: 'model' });
  }

  function pickOutput() {
    vscode.postMessage({ type: 'pickOutput', field: 'output' });
  }

  function pickFolder(field: string, title: string) {
    vscode.postMessage({ type: 'pickFolder', field, title });
  }

  function run() {
    if (!modelPath || running) return;
    running = true;
    logs = '';

    const normalizedModelPath = modelPath.replace(/\\/g, '/');
    const parts = ['npx @threlte/gltf@latest', `"${normalizedModelPath}"`];
    if (outputPath) parts.push(`--output "${outputPath}"`);
    if (types) parts.push('--types');
    if (keepnames) parts.push('--keepnames');
    if (keepgroups) parts.push('--keepgroups');
    if (meta) parts.push('--meta');
    if (shadows) parts.push('--shadows');
    if (preload) parts.push('--preload');
    if (suspense) parts.push('--suspense');
    if (isolated) parts.push('--isolated');
    if (debug) parts.push('--debug');
    if (transform) {
      parts.push('--transform');
      if (keepmeshes) parts.push('--keepmeshes');
      if (keepmaterials) parts.push('--keepmaterials');
      if (resolution !== 1024) parts.push(`--resolution ${resolution}`);
      if (format !== 'webp') parts.push(`--format ${format}`);
    }
    if (simplify) {
      parts.push('--simplify');
      if (weld !== 0.0001) parts.push(`--weld ${weld}`);
      if (ratio !== 0.75) parts.push(`--ratio ${ratio}`);
      if (error !== 0.001) parts.push(`--error ${error}`);
    }
    if (printwidth !== 120) parts.push(`--printwidth ${printwidth}`);
    if (precision !== 2) parts.push(`--precision ${precision}`);
    if (dracoPath) parts.push(`--draco "${dracoPath}"`);
    const effectiveRoot = rootPath || workspacePublicPath;
    if (effectiveRoot) parts.push(`--root "${effectiveRoot.replace(/\\/g, '/')}"`);

    vscode.postMessage({ type: 'run', command: parts.join(' ') });
  }

  $effect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data;
      switch (msg.type) {
        case 'filePicked':
          if (msg.field === 'model') modelPath = msg.path;
          else if (msg.field === 'output') outputPath = msg.path;
          else if (msg.field === 'draco') dracoPath = msg.path;
          else if (msg.field === 'root') rootPath = msg.path;
          break;
        case 'workspacePublicPath':
          workspacePublicPath = msg.path;
          break;
        case 'log':
          logs += msg.text;
          break;
        case 'done':
          running = false;
          logs += `\nExited with code ${msg.code}`;
          if (msg.code === 0 && outputPath) {
            vscode.postMessage({ type: 'openFile', path: outputPath });
          }
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  });

  $effect(() => {
    if (logEl && logs) {
      logEl.scrollTop = logEl.scrollHeight;
    }
  });
</script>

<div class="panel">
  <section>
    <h3>Model</h3>
    <div class="file-row">
      <input type="text" value={modelPath} placeholder=".gltf / .glb" readonly />
      <button onclick={pickModel}>Browse</button>
    </div>
  </section>

  <section>
    <h3>Output</h3>
    <div class="file-row">
      <input type="text" value={outputPath} placeholder="Optional" readonly />
      <button onclick={pickOutput}>Browse</button>
    </div>
  </section>

  <hr />

  <section>
    <h3>Flags</h3>
    <div class="flags">
      {#each flags as f}
        <label class="flag">
          <input
            type="checkbox"
            checked={f.get()}
            onchange={(e: Event) => f.set((e.target as HTMLInputElement).checked)}
          />
          <span>{f.name}</span>
        </label>
      {/each}
    </div>
  </section>

  <hr />

  <section>
    <h3>Transform</h3>
    <label class="flag">
      <input type="checkbox" bind:checked={transform} />
      <span>transform</span>
    </label>
    {#if transform}
      <div class="sub">
        <label class="flag">
          <input type="checkbox" bind:checked={keepmeshes} />
          <span>keepmeshes</span>
        </label>
        <label class="flag">
          <input type="checkbox" bind:checked={keepmaterials} />
          <span>keepmaterials</span>
        </label>
        <div class="num-row">
          <label>resolution</label>
          <input type="number" bind:value={resolution} />
        </div>
        <div class="num-row">
          <label>format</label>
          <select bind:value={format}>
            <option value="webp">webp</option>
            <option value="png">png</option>
            <option value="jpeg">jpeg</option>
            <option value="avif">avif</option>
          </select>
        </div>
      </div>
    {/if}
  </section>

  <section>
    <h3>Simplify</h3>
    <label class="flag">
      <input type="checkbox" bind:checked={simplify} />
      <span>simplify</span>
    </label>
    {#if simplify}
      <div class="sub">
        <div class="num-row">
          <label>weld</label>
          <input type="number" bind:value={weld} step="0.0001" />
        </div>
        <div class="num-row">
          <label>ratio</label>
          <input type="number" bind:value={ratio} step="0.01" min="0" max="1" />
        </div>
        <div class="num-row">
          <label>error</label>
          <input type="number" bind:value={error} step="0.001" />
        </div>
      </div>
    {/if}
  </section>

  <hr />

  <section>
    <h3>Formatting</h3>
    <div class="num-row">
      <label>printwidth</label>
      <input type="number" bind:value={printwidth} />
    </div>
    <div class="num-row">
      <label>precision</label>
      <input type="number" bind:value={precision} min="0" />
    </div>
  </section>

  <section>
    <h3>Paths</h3>
    <div class="path-group">
      <label>draco</label>
      <div class="file-row">
        <input type="text" value={dracoPath} placeholder="Optional" readonly />
        <button onclick={() => pickFolder('draco', 'Select Draco Binary Path')}>Browse</button>
      </div>
    </div>
    <div class="path-group">
      <label>root</label>
      <div class="file-row">
        <input type="text" value={rootPath} placeholder={workspacePublicPath || 'Optional'} readonly />
        <button onclick={() => pickFolder('root', 'Select Root Directory')}>Browse</button>
      </div>
    </div>
  </section>

  <button class="run-btn" onclick={run} disabled={!modelPath || running}>
    {running ? 'Running...' : 'Generate'}
  </button>

  {#if logs}
    <section class="output">
      <h3>Output</h3>
      <pre bind:this={logEl}>{logs}</pre>
    </section>
  {/if}
</div>

<style>
  .panel {
    padding: 8px;
  }

  section {
    margin-bottom: 10px;
  }

  h3 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--muted);
    margin-bottom: 6px;
    font-weight: 600;
  }

  hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 8px 0;
  }

  .file-row {
    display: flex;
    gap: 4px;
  }

  .file-row input {
    flex: 1;
    min-width: 0;
    padding: 4px 6px;
    background: var(--input-bg);
    color: var(--input-fg);
    border: 1px solid var(--input-border);
    font-size: 12px;
    font-family: inherit;
  }

  .file-row button {
    padding: 4px 8px;
    background: var(--btn-bg);
    color: var(--btn-fg);
    border: none;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }

  .file-row button:hover {
    background: var(--btn-hover);
  }

  .flags {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 0;
  }

  .flag {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 50%;
    font-size: 12px;
    cursor: pointer;
    padding: 2px 0;
  }

  .flag input[type='checkbox'] {
    accent-color: var(--btn-bg);
  }

  .flag span {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
  }

  .sub {
    margin-top: 6px;
    padding-left: 8px;
    border-left: 2px solid var(--border);
  }

  .num-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .num-row label {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    min-width: 70px;
    color: var(--muted);
  }

  .num-row input,
  .num-row select {
    flex: 1;
    padding: 3px 6px;
    background: var(--input-bg);
    color: var(--input-fg);
    border: 1px solid var(--input-border);
    font-size: 12px;
    font-family: inherit;
  }

  .path-group {
    margin-bottom: 6px;
  }

  .path-group > label {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    color: var(--muted);
    display: block;
    margin-bottom: 2px;
  }

  .run-btn {
    width: 100%;
    padding: 6px;
    background: var(--btn-bg);
    color: var(--btn-fg);
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 8px;
  }

  .run-btn:hover:not(:disabled) {
    background: var(--btn-hover);
  }

  .run-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .output pre {
    background: var(--input-bg);
    color: var(--input-fg);
    padding: 8px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid var(--border);
  }

  input:focus,
  select:focus,
  button:focus {
    outline: 1px solid var(--focus);
    outline-offset: -1px;
  }
</style>
