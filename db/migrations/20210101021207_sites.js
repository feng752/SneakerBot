exports.up = function (knex) {
  return knex.schema.createTable('sites', (table) => {
    table.increments();
    table.string('name').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.boolean('is_deleted').defaultTo(false);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('sites');
};
