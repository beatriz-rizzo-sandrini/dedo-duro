const seniorCatalog = require('./src/utils/seniorCatalog.json');

const _prefixCache = {};
for (const key of Object.keys(seniorCatalog)) {
  let minLen = 12;
  if (key.startsWith('KSA')) minLen = 14;
  else if (key.startsWith('SA') || key.startsWith('FL') || key.startsWith('PN') || key.startsWith('DM') || key.startsWith('LP')) minLen = 11;

  for (let len = minLen; len <= key.length; len++) {
    const prefix = key.substring(0, len);
    if (!_prefixCache[prefix]) {
      _prefixCache[prefix] = key;
    }
  }
}

function resolve(cleanSkuKey) {
  let minLen = 12;
  if (cleanSkuKey.startsWith('KSA')) minLen = 14;
  else if (cleanSkuKey.startsWith('SA') || cleanSkuKey.startsWith('FL') || cleanSkuKey.startsWith('PN') || cleanSkuKey.startsWith('DM') || cleanSkuKey.startsWith('LP')) minLen = 11;
  
  if (cleanSkuKey.length >= minLen) {
    for (let len = cleanSkuKey.length; len >= minLen; len--) {
      const prefix = cleanSkuKey.substring(0, len);
      const matchingKey = _prefixCache[prefix];
      if (matchingKey) {
        return matchingKey;
      }
    }
  }
  return null;
}

console.log('--- TEST 1: FL01TR00108AABPCB411918 ---');
console.log('Matched key:', resolve('FL01TR00108AABPCB411918'));

console.log('--- TEST 2: KSA12000002350AA0P0396 ---');
console.log('Matched key:', resolve('KSA12000002350AA0P0396'));
