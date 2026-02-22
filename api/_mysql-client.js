import mysql from 'mysql2/promise';
import { dbConfigError, isMysqlEnabled, mysqlConfig } from './_db-config.js';

const MYSQL_CONN_LIMIT = Number.parseInt(process.env.MYSQL_CONN_LIMIT || '8', 10) || 8;

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

export const getMysqlPool = () => {
    assertMysqlAvailable();
    if (pool) return pool;

    pool = mysql.createPool({
        host: mysqlConfig.host,
        port: mysqlConfig.port,
        user: mysqlConfig.user,
        password: mysqlConfig.password,
        database: mysqlConfig.database,
        charset: 'utf8mb4',
        waitForConnections: true,
        connectionLimit: MYSQL_CONN_LIMIT,
        queueLimit: 0
    });

    return pool;
};

export const mysqlQuery = async (sql, params = []) => {
    const [rows] = await getMysqlPool().query(sql, params);
    return rows;
};

export const withMysqlTransaction = async (callback) => {
    const connection = await getMysqlPool().getConnection();
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
    } finally {
        connection.release();
    }
};

