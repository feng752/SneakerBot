const knex = require('knex');
const configs = require('../../knexfile');

const environment = process.env.NODE_ENV || 'local';
const configuration = configs[environment];
const db = knex(configuration);

(async function connectToDB(retries = 5) {
  if (!retries) {
    throw new Error('Could not connect to DB');
  }
  try {
    await db.raw('select 1+1 as result');
  } catch (err) {
    console.error("Couldn't connect to DB:", { err });
    console.info(`Retries left: ${retries}`);
    setTimeout(connectToDB(retries - 1), 5000);
  }
})();

module.exports = db;
