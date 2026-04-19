import { insertRows, toMysqlDataTableIdentifier } from './_mysql-table-store.js';
import { mysqlQuery } from './_mysql-client.js';
import fs from 'fs/promises';

export default async function handler(req, res) {
    try {
        const storiesRaw = await fs.readFile('data/table-stories.json', 'utf8');
        const authorsRaw = await fs.readFile('data/table-authors.json', 'utf8');
        
        const stories = JSON.parse(storiesRaw.replace(/^\uFEFF/, ''));
        const authors = JSON.parse(authorsRaw.replace(/^\uFEFF/, ''));
        
        try {
            const storiesIdent = toMysqlDataTableIdentifier('stories');
            await mysqlQuery('TRUNCATE TABLE ' + storiesIdent);
        } catch(e1) {
            console.error('Truncate stories failed', e1);
        }
        
        try {
            const authorsIdent = toMysqlDataTableIdentifier('authors');
            await mysqlQuery('TRUNCATE TABLE ' + authorsIdent);
        } catch(e2) {
            console.error('Truncate authors failed', e2);
        }

        let storyCount = 0;
        let authorCount = 0;

        if (stories.rows && stories.rows.length) {
            await insertRows('stories', stories.rows);
            storyCount = stories.rows.length;
        }

        if (authors.rows && authors.rows.length) {
            await insertRows('authors', authors.rows);
            authorCount = authors.rows.length;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, msg: 'cleaned and imported', storyCount, authorCount }));
    } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message, stack: e.stack }));
    }
}
