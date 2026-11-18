import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GAME_ASSETS, artUrl } from './assets';

function imageFile(key: string) {
  return readFileSync('public/' + artUrl(key));
}

test('the menu and every Phaser texture reference a complete local WebP', () => {
  assert.equal(new Set(GAME_ASSETS).size, GAME_ASSETS.length);
  const menu = ['cover', 'finale', ...[0, 1, 2, 3].map(i => 'card-' + i)];
  for (const key of [...GAME_ASSETS, ...menu]) {
    const file = imageFile(key);
    assert.equal(file.toString('ascii', 0, 4), 'RIFF', key);
    assert.equal(file.toString('ascii', 8, 12), 'WEBP', key);
    assert.equal(file.readUInt32LE(4) + 8, file.length, key);
  }
});

test('every animation frame has alpha and the same dimensions within its walk cycle', () => {
  for (const [name, count, width, height] of [['unicorn', 4, 336, 318], ['troll', 2, 204, 228]] as const) {
    for (let i = 0; i < count; i++) {
      const file = imageFile(name + '-' + i);
      assert.equal(file.toString('ascii', 12, 16), 'VP8X');
      assert.ok(file[20] & 0x10);
      assert.equal(file.readUIntLE(24, 3) + 1, width);
      assert.equal(file.readUIntLE(27, 3) + 1, height);
    }
  }
});

test('all foreground terrain textures retain transparent silhouettes', () => {
  for (const key of ['log', 'mushroom', 'stone', 'cloud-platform', 'geyser', 'vent', 'finish']) {
    const file = imageFile(key);
    assert.equal(file.toString('ascii', 12, 16), 'VP8X', key);
    assert.ok(file[20] & 0x10, key);
  }
});
