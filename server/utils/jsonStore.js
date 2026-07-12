const fs = require('fs');
const path = require('path');

// Shared helpers for the file-backed JSON stores (wishlist, sms targets, sqlite seeds).

function ensureJsonFile(filePath, initial = []) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(initial), 'utf8');
  }
}

function readJsonFile(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || JSON.stringify(fallback));
  } catch (err) {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { ensureJsonFile, readJsonFile, writeJsonFile };
