import mysql from 'mysql2/promise';
import { dbConfigError, isMysqlEnabled, mysqlConfig } from './_db-config.js';

const MYSQL_CONN_LIMIT = Number.parseInt(process.env.MYSQL_CONN_LIMIT || '8', 10) || 8;
const IS_CLOUDFLARE_WORKER_RUNTIME = typeof WebSocketPair !== 'undefined';

let pool = null;

const assertMysqlAvailable = () => {
    if (dbConfigError) {
        throw new Error(dbConfigError);
    }
    if (!isMysqlEnabled) {
        throw new Error('MySQL backend is disabled. Set DB_BACKEND=mysql.');
    }
    if (!mysqlConfig) {
        throw new Error('Missing MySQL configuration.');
    }
};

const mysqlConnectionOptions = () => {
    assertMysqlAvailable();
    return {
        host: mysqlConfig.host,
        port: mysqlConfig.port,
        user: mysqlConfig.user,
        password: mysqlConfig.password,
        database: mysqlConfig.database,
        disableEval: true,
        charset: 'utf8mb4'
    };
};

const createMysqlConnection = async () => mysql.createConnection(mysqlConnectionOptions());

const getSharedMysqlPool = () => {
    if (pool) return pool;

    pool = mysql.createPool({
        ...mysqlConnectionOptions(),
        waitForConnections: true,
        connectionLimit: MYSQL_CONN_LIMIT,
        queueLimit: 0
    });

    return pool;
};

const withMysqlConnection = async (callback) => {
    if (IS_CLOUDFLARE_WORKER_RUNTIME) {
        const connection = await createMysqlConnection();
        try {
            return await callback(connection);
        } finally {
            try {
                await connection.end();
            } catch {
                // Ignore connection close errors.
            }
        }
    }

    const connection = await getSharedMysqlPool().getConnection();
    try {
        return await callback(connection);
    } finally {
        connection.release();
    }
};

export const getMysqlPool = () => {
    if (IS_CLOUDFLARE_WORKER_RUNTIME) {
        throw new Error('MySQL pooling is unavailable in Cloudflare Worker runtime.');
    }
    return getSharedMysqlPool();
};

export const mysqlQuery = async (sql, params = []) => {
    return withMysqlConnection(async (connection) => {
        const [rows] = await connection.query(sql, params);
        return rows;
    });
};

export const withMysqlTransaction = async (callback) => {
    return withMysqlConnection(async (connection) => {
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            try {
                await connection.rollback();
            } catch {
                // Ignore rollback failures; original error is more useful.
            }
            throw error;
        }
    });
};
