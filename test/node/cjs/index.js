if ('Bun' in globalThis) {
  throw new Error('❌ Use Node.js to run this test!');
}

const { serverTiming } = require('@elysiajs/server-timing');

if (typeof serverTiming !== 'function') {
  throw new Error('❌ CommonJS Node.js failed');
}

console.log('✅ CommonJS Node.js works!');
