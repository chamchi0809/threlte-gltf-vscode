import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  test('Extension should be present', () => {
    const ext = vscode.extensions.all.find((e) =>
      e.id.endsWith('threlte-gltf-vscode')
    );
    assert.ok(ext, 'Extension should be installed');
  });

  test('Panel view should be contributed', () => {
    const ext = vscode.extensions.all.find((e) =>
      e.id.endsWith('threlte-gltf-vscode')
    );
    assert.ok(ext);
    const views = ext!.packageJSON.contributes?.views?.['threlte-gltf'];
    assert.ok(views, 'Should have threlte-gltf view container');
    assert.ok(
      views.some((v: { id: string }) => v.id === 'threlte-gltf.panel'),
      'Should have panel view'
    );
  });
});
