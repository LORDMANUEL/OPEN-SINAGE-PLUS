const fileLocks = new Map();

function withFileLock(filePath, operation) {
  const previousTail = fileLocks.get(filePath) || Promise.resolve();
  const current = previousTail.then(operation, operation);
  const tail = current.catch(() => {});
  fileLocks.set(filePath, tail);
  return current.finally(() => {
    if (fileLocks.get(filePath) === tail) fileLocks.delete(filePath);
  });
}

module.exports = { withFileLock };
