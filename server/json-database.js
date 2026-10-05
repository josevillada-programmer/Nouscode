import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultFilePath = process.env.JSON_DATABASE_PATH || path.join(rootDirectory, 'db', 'db.json');
const emptyDatabase = () => ({ users: [], purchases: [], sessions: [], carts: [], products: [] });

export function createJsonDatabase(filePath = defaultFilePath) {
  let operationQueue = Promise.resolve();

  function serialize(operation) {
    const result = operationQueue.then(operation);
    operationQueue = result.catch(() => {});
    return result;
  }

  async function readFileContents() {
    try {
      const contents = await readFile(filePath, 'utf8');
      const data = JSON.parse(contents);
      if (!data || !Array.isArray(data.users) || !Array.isArray(data.purchases)) {
        throw new Error('db.json debe incluir colecciones users y purchases.');
      }
      if (!Array.isArray(data.sessions)) data.sessions = [];
      if (!Array.isArray(data.carts)) data.carts = [];
      if (!Array.isArray(data.products)) data.products = [];
      if (Array.isArray(data.vacancies) && data.vacancies.length === 0) delete data.vacancies;
      return data;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return emptyDatabase();
    }
  }

  async function persist(data) {
    await mkdir(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
      try {
        await rename(temporaryPath, filePath);
      } catch (error) {
        if (process.platform !== 'win32' || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
        await copyFile(temporaryPath, filePath);
        await unlink(temporaryPath);
      }
    } catch (error) {
      await unlink(temporaryPath).catch(() => {});
      throw error;
    }
  }

  return {
    initialize: () => serialize(async () => {
      try {
        await readFile(filePath, 'utf8');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        await persist(emptyDatabase());
      }
    }),
    read: () => serialize(async () => structuredClone(await readFileContents())),
    update: (mutate) => serialize(async () => {
      const data = await readFileContents();
      const result = await mutate(data);
      await persist(data);
      return structuredClone(result ?? data);
    })
  };
}

export const jsonDatabase = createJsonDatabase();