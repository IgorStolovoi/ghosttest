const { createAddColumnMigration } = require("../../utils");

module.exports = createAddColumnMigration("members", "primary_social_network", {
  type: "string",
  nullable: true,
  maxLength: 191,
  validations: {
    isLength: {
      max: 30
    }
  }
});
