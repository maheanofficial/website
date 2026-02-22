import {
    deleteRows as jsonDeleteRows,
    insertRows as jsonInsertRows,
    listRows as jsonListRows,
    updateRows as jsonUpdateRows,
    upsertRows as jsonUpsertRows
} from './_json-table-store.js';
import {
    deleteRows as mysqlDeleteRows,
    insertRows as mysqlInsertRows,
    listRows as mysqlListRows,
    updateRows as mysqlUpdateRows,
    upsertRows as mysqlUpsertRows
} from './_mysql-table-store.js';
import { dbBackend, dbConfigError, isMysqlEnabled } from './_db-config.js';

const mysqlStore = {
    listRows: mysqlListRows,
    insertRows: mysqlInsertRows,
    upsertRows: mysqlUpsertRows,
    updateRows: mysqlUpdateRows,
    deleteRows: mysqlDeleteRows
};

const jsonStore = {
    listRows: jsonListRows,
    insertRows: jsonInsertRows,
    upsertRows: jsonUpsertRows,
    updateRows: jsonUpdateRows,
    deleteRows: jsonDeleteRows
};

const activeStore = isMysqlEnabled ? mysqlStore : jsonStore;

const runStoreMethod = (methodName, ...args) => {
    if (dbConfigError) {
        throw new Error(dbConfigError);
    }
    const method = activeStore[methodName];
    return method(...args);
};

export const listRows = (...args) => runStoreMethod('listRows', ...args);
export const insertRows = (...args) => runStoreMethod('insertRows', ...args);
export const upsertRows = (...args) => runStoreMethod('upsertRows', ...args);
export const updateRows = (...args) => runStoreMethod('updateRows', ...args);
export const deleteRows = (...args) => runStoreMethod('deleteRows', ...args);

export const activeDbBackend = dbBackend;

