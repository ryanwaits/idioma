import xml2js from 'xml2js';

// This is what we have after parsing and applying translations
const structure = {
  "root": {
    "nested": [
      {
        "deep": [
          {
            "element": [
              {
                "_text": "Texto"
              }
            ]
          }
        ]
      }
    ]
  }
};

// Current approach - extracting rootValue
const rootName = Object.keys(structure)[0];  // "root"
const rootValue = structure[rootName];  // { nested: [...] }

// The transform function
function transformForBuilder(obj) {
  if (Array.isArray(obj)) {
    if (obj.length === 1) {
      return transformForBuilder(obj[0]);
    }
    return obj.map(item => transformForBuilder(item));
  }
  if (typeof obj === 'object' && obj \!== null) {
    const transformed = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_attrs') {
        transformed['$'] = value;
      } else if (key === '_text') {
        const otherKeys = Object.keys(obj).filter(k => k \!== '_text' && k \!== '_attrs');
        if (otherKeys.length === 0) {
          if (obj._attrs) {
            transformed['_'] = value;
          } else {
            return value;
          }
        } else {
          transformed['_'] = value;
        }
      } else {
        transformed[key] = transformForBuilder(value);
      }
    }
    return transformed;
  }
  return obj;
}

// Current approach - this loses root
const transformedRoot = {};
for (const [key, value] of Object.entries(rootValue)) {
  transformedRoot[key] = transformForBuilder(value);
}

console.log('Transformed (loses root):', JSON.stringify(transformedRoot, null, 2));

// Build with root name
const builder = new xml2js.Builder({
  headless: true,
  charkey: '_',
  attrkey: '$',
  rootName: rootName
});

const xml = builder.buildObject(transformedRoot);
console.log('XML Output:', xml);
