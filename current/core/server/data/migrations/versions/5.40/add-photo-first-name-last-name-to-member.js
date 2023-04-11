const {
  combineNonTransactionalMigrations,
  createAddColumnMigration
} = require("../../utils");

module.exports = combineNonTransactionalMigrations(
  createAddColumnMigration("members", "company", {
    type: "string",
    nullable: true,
    maxLength: 255,
    validations: {
      isLength: {
        max: 255
      }
    }
  }),
  createAddColumnMigration("members", "photo", {
    type: "text",
    nullable: true
  })
);
