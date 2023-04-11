const logging = require("@tryghost/logging");
const { createTransactionalMigration } = require("../../utils");

module.exports = createTransactionalMigration(
  async function up(knex) {
    logging.info("Changed photo column type for members");
    try {
      await knex.schema.alterTable("members", function (table) {
        table.string("photo", 2000).nullable().alter();
      });
    } catch (error) {
      logging.warn("Failed to change photo column type for members");
      logging.warn(error);
    }
  },
  async function down() {
    return knex.schema.alterTable("members", function (table) {
      table.text("photo").nullable().alter();
    });
  }
);
