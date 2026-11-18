const frames = (name: string, count: number) => Array.from({ length: count }, (_, i) => `${name}-${i}`);

export const GAME_ASSETS = [
  ...frames('unicorn', 4), ...frames('troll', 2),
  ...frames('realm', 4), ...frames('ground', 4),
  'log', 'stone', 'mushroom', 'cloud-platform',
  'flowers', 'berries', 'alpine', 'vent', 'geyser', 'puddle', 'checkpoint', 'finish',
  'star', 'rainbow', 'rainbow-ball'
];

export const artUrl = (name: string) => `art/${name}.webp`;
