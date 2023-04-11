const { addTable } = require("../../utils");

module.exports = addTable("linked_social_networks", {
  id: { type: "string", maxlength: 24, nullable: false, primary: true },
  member_id: {
    type: "string",
    maxlength: 24,
    nullable: false,
    unique: false,
    references: "members.id",
    cascadeDelete: true
  },
  social_network: { type: "string", maxlength: 191, nullable: false },
  email: { type: "string", maxlength: 191, nullable: true }
});
