const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');
const asset = name => path.join(__dirname, 'assets', name);
const source = fs.readFileSync(asset('cima.svg'), 'utf8');
const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = sizes.map(size => new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng());
const header = Buffer.alloc(6); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + sizes.length * 16;
const entries = pngs.map((png, i) => {
  const entry = Buffer.alloc(16);
  entry[0] = sizes[i] === 256 ? 0 : sizes[i]; entry[1] = entry[0];
  entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6); entry.writeUInt32LE(png.length, 8); entry.writeUInt32LE(offset, 12);
  offset += png.length; return entry;
});
fs.writeFileSync(asset('cima.ico'), Buffer.concat([header, ...entries, ...pngs]));
fs.writeFileSync(asset('cima.png'), pngs[pngs.length - 1]);
console.log('Icônes CIMA préparées.');
