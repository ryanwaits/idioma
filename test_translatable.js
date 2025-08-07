import { XmlStrategy } from './src/strategies/xml.js';

const strategy = new XmlStrategy();

// Test isTranslatableString through the strategy
console.log('Is "16GB" translatable:', strategy.isTranslatableString('16GB', 'ram'));
console.log('Is "Intel i7" translatable:', strategy.isTranslatableString('Intel i7', 'cpu'));
console.log('Is "High-performance laptop" translatable:', strategy.isTranslatableString('High-performance laptop', 'description'));
