let knex = require('knex');

const environment = process.env.NODE_ENV || 'development';
const configuration = require('../../knexfile')[environment];
knex = require('knex')(configuration);

function connectToDB() {
  let retries = 5;
  let connected = false;
  if (!connected && retries > 0) {
    knex.raw('select 1+1 as result').catch((err) => {
      console.error("Couldn't connect to DB", err);
      retries -= 1;
      console.error(`Retries left: ${retries}`);
      setTimeout(connectToDB, 5000);
    });
    connected = true;
  }
}

connectToDB();

module.exports = knex;
