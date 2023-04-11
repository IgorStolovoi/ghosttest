const ghostBookshelf = require("./base");

const LinkedSocialNetworks = ghostBookshelf.Model.extend(
  {
    tableName: "linked_social_networks",

    member() {
      return this.belongsTo("Member", "member_id");
    }
  },
  {}
);

module.exports = {
  LinkedSocialNetworks: ghostBookshelf.model(
    "LinkedSocialNetworks",
    LinkedSocialNetworks
  )
};
