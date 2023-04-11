const {
  combineNonTransactionalMigrations,
  createAddColumnMigration
} = require("../../utils");

module.exports = combineNonTransactionalMigrations(
  createAddColumnMigration("members", "first_name", {
    type: "string",
    maxlength: 191,
    nullable: true,
    validations: {
      isLength: {
        max: 191
      }
    }
  }),
  createAddColumnMigration("members", "last_name", {
    type: "string",
    maxlength: 191,
    nullable: true,
    validations: {
      isLength: {
        max: 191
      }
    }
  })
);
