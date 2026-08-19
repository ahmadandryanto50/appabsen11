const str = "A".repeat(100000);
const chunks = str.match(/.{1,40000}/g);
console.log(chunks.length);
