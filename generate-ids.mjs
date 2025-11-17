import { customAlphabet } from 'nanoid';

// Same configuration as in src/util/nanoid.ts
const nanoid = customAlphabet('0123456789abcdefghjkmnpqrstvwxyz', 5);

const interval = process.env.INTERVAL ? parseInt(process.env.INTERVAL) : 5000;
console.log(`Generating ids (ctrl-c to stop)...\n`);
if (!process.env.INTERVAL) {
    console.log("INTERVAL not provided; default = 5000ms");
}

function generateId() {
    const id = nanoid();
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${id}`);
    setTimeout(generateId, interval);
}

generateId();

