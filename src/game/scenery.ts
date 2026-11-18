import Phaser from 'phaser';
import type { Level } from './levels';
import { geyserState } from './encounters';

const panoramaWidth = 720 * 2048 / 683;
const focalPoints = [.38, .42, .56, .81];
type Picture = Phaser.GameObjects.Image;

// Scene objects are disposable. Platform and hazard coordinates come directly from the level.
export class Scenery {
  private panorama: Picture[] = [];
  private jets: Picture[] = [];
  private warnings: Picture[] = [];
  private droplets: Picture[][] = [];

  constructor(private scene: Phaser.Scene, private level: Level) {
    const { add } = scene;
    scene.cameras.main.setBackgroundColor(level.sky);

    const mushroom = scene.textures.get('mushroom');
    if (!mushroom.has('cap')) {
      mushroom.add('cap', 0, 0, 0, 480, 96);
      mushroom.add('stem', 0, 0, 96, 480, 71);
    }
    for (const p of level.platforms) {
      if (p.kind === 'ground') {
        // Scale only whole strips. Alternating the ends leaves no seams or cropped gaps.
        const count = Math.max(1, Math.round(p.w / 820));
        const width = p.w / count;
        for (let i = 0; i < count; i++) {
          add.image(p.x + (i + .5) * width, p.y, 'ground-' + level.id)
            .setOrigin(.5, 0).setDisplaySize(width + (i + 1 < count ? .5 : 0), p.h).setFlipX(i % 2 === 1);
        }
        const plants = ['flowers', 'berries', 'alpine', 'flowers'];
        let index = 0;
        for (let x = p.x + 67; x < p.x + p.w - 35; x += 114 + (index * 77) % 149) {
          const height = 15 + (index * 9) % 13;
          add.image(x, p.y + 3, plants[level.id]).setOrigin(.5, 1)
            .setDisplaySize(height * 1.4, height).setFlipX(index % 2 === 0).setDepth(1);
          index++;
        }
      } else if (p.kind === 'mushroom') {
        // Longer stems keep the cap's landing surface equally flat at every height.
        const capHeight = p.w * 96 / 480;
        const x = p.x + p.w / 2;
        add.image(x, p.y + capHeight - 1, 'mushroom', 'stem').setOrigin(.5, 0)
          .setDisplaySize(p.w, 531 - p.y - capHeight).setDepth(2);
        add.image(x, p.y, 'mushroom', 'cap').setOrigin(.5, 0).setDisplaySize(p.w, capHeight).setDepth(2);
      } else {
        const key = p.kind === 'cloud' ? 'cloud-platform' : p.kind;
        add.image(p.x + p.w / 2, p.y, key).setOrigin(.5, 0).setDisplaySize(p.w, p.h).setDepth(2);
      }
    }
    for (const x of level.puddles) {
      add.image(x, 533, 'puddle').setDisplaySize(140, 15).setDepth(2);
    }
    for (const geyser of level.geysers) {
      add.image(geyser.x, geyser.y, 'vent').setDisplaySize(75, 18).setDepth(3);
      this.jets.push(add.image(geyser.x, geyser.y, 'geyser').setOrigin(.5, 1).setDepth(4).setVisible(false));
      this.droplets.push(Array.from({length: 5}, () =>
        add.image(geyser.x, geyser.y, 'water-glint').setDepth(4).setVisible(false)));
      this.warnings.push(add.image(geyser.x, geyser.y, 'spray-warning').setDepth(4));
      add.text(geyser.x, geyser.y + 21, '↑', { fontFamily:'Nunito', fontSize:'19px', color:'#fff4cb', stroke:'#524638', strokeThickness:3 })
        .setOrigin(.5).setDepth(4);
    }
    for (const x of level.checkpoints.slice(1)) {
      add.image(x, 531, 'checkpoint').setOrigin(.5, 1).setDisplaySize(26, 58).setDepth(2);
    }
    const finish = level.width - 130;
    add.image(finish, 532, 'finish').setOrigin(.5, 1).setDisplaySize(155, 210).setDepth(3);
    add.text(finish, 401, 'META', { fontFamily:'Nunito', fontSize:'13px', fontStyle:'bold', color:'#4b341c' })
      .setOrigin(.5).setDepth(4);
  }

  renderPanorama() {
    const cam = this.scene.cameras.main;
    const halfView = cam.width / (2 * cam.zoom);
    const left = cam.width / 2 - halfView;
    const travel = Math.max(0, cam.scrollX + left) * .27;
    const origin = cam.width / 2 - panoramaWidth * focalPoints[this.level.id] - travel;
    const first = Math.floor((left - origin) / panoramaWidth);
    const count = Math.ceil(2 * halfView / panoramaWidth) + 1;
    while (this.panorama.length < count) {
      this.panorama.push(this.scene.add.image(0, 360, 'realm-' + this.level.id)
        .setDisplaySize(panoramaWidth + 1, 720).setScrollFactor(0, 1).setDepth(-25));
    }
    this.panorama.forEach((image, i) => {
      const index = first + i;
      image.setVisible(i < count).setX(origin + (index + .5) * panoramaWidth).setFlipX(index % 2 !== 0);
    });
  }

  renderWater(time: number) {
    this.level.geysers.forEach((g, i) => {
      const state = geyserState(g, time);
      const active = state.height > 1;
      const pulse = (Math.sin(time * 10) + 1) / 2;
      this.jets[i].setVisible(active);
      if (active) this.jets[i].setDisplaySize(g.width + 8 + 3 * pulse, state.height).setRotation(Math.sin(time * 8 + i) * .025);
      this.droplets[i].forEach((drop, n) => {
        drop.setVisible(active);
        if (!active) return;
        const phase = (time * 1.9 + n / 5) % 1;
        const drift = (n % 2 ? -1 : 1) * (5 + 21 * phase);
        drop.setPosition(g.x + drift, g.y - state.height * (.92 - .65 * phase * phase))
          .setDisplaySize(4 + 2 * phase, 6 + 2 * phase).setAlpha(1 - phase);
      });
      this.warnings[i].setVisible(!active).setAlpha(state.warning ? .8 : .28)
        .setPosition(g.x, g.y - (state.warning ? 13 + 11 * pulse : 3))
        .setDisplaySize(state.warning ? 32 : 16, state.warning ? 14 + 4 * pulse : 5);
    });
  }
}

// Soft-edged light and contact shadows for the Canvas renderer.
export function createLightTextures(scene: Phaser.Scene) {
  for (const [key, rgb] of [['contact-shadow','36,27,34'], ['treasure-light','255,224,143'], ['spray-warning','255,210,105'], ['water-glint','230,254,255']]) {
    const texture = scene.textures.createCanvas(key, 64, 64);
    if (!texture) continue;
    const ctx = texture.getContext();
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(' + rgb + ',1)');
    gradient.addColorStop(.5, 'rgba(' + rgb + ',.6)');
    gradient.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    texture.refresh();
  }
}
