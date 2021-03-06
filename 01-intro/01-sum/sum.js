function sum(a, b) {
  const typeA = typeof a;
  const typeB = typeof b;
  if ( typeA !== 'number' || typeB !== 'number') throw new TypeError('Not a number');
  else return a + b;
}

module.exports = sum;
