const db = require('../helpers/db');

afterAll(async () => {
    await db.end();
});
