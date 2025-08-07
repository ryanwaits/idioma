import { XmlStrategy } from './src/strategies/xml.js';

const strategy = new XmlStrategy();
const input = `<?xml version="1.0"?>
<catalog>
  <category name="Electronics">
    <product>
      <specs>
        <ram>16GB</ram>
      </specs>
    </product>
  </category>
</catalog>`;

const result = await strategy.parse(input);
console.log('Keys:', Array.from(result.translatableContent.keys()));
