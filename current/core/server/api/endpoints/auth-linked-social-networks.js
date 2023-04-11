const Promise = require("bluebird");
const api = require("./index");
const config = require("../../../shared/config");
const tpl = require("@tryghost/tpl");
const errors = require("@tryghost/errors");
const web = require("../../web");
const models = require("../../models");
const auth = require("../../services/auth");
const invitations = require("../../services/invitations");
const dbBackup = require("../../data/db/backup");
const apiMail = require("./index").mail;
const apiSettings = require("./index").settings;
const UsersService = require("../../services/users");
const urlUtils = require("../../../shared/url-utils");
const membersService = require("../../services/members");
const memberAttributionService = require("../../services/member-attribution");

// const userService = new UsersService({
//   dbBackup,
//   models,
//   auth,
//   apiMail,
//   apiSettings
// });
// const { deleteAllSessions } = require("../../services/auth/session");

// const messages = {
//   notTheBlogOwner: "You are not the site owner."
// };

module.exports = {
  docName: "auth_linked_social_networks",

  getLinkedNetworks: {
    statusCode: 200,
    permissions: false,
    async query(frame) {
      const result =
        await membersService.api.memberRepository.getMemberLinkedSocialNetworks(
          {
            memberId: frame?.options?.context?.member?.id
          }
        );

      return {
        result
      };
    }
  },

  unlinkSocialNetwork: {
    data: ["id"],
    statusCode: 200,
    permissions: false,
    async query(frame) {
      const { memberId: memberIdForLinkedSocialNetowrk } =
        await membersService.api.memberRepository.getMemberIdForLinkedSocialNetworkId(
          {
            linkedSocialNetworkId: frame.data.id
          }
        );

      if (
        frame?.options?.context?.member?.id !== +memberIdForLinkedSocialNetowrk
      ) {
        // trying to remove linked soc netowrk not from member it depends to
        return {
          errorMessage:
            "Current member is not linked to requested social network id",
          success: false
        };
      } else {
        const result =
          await membersService.api.memberRepository.removeMemberLinkedSocialNetwork(
            {
              linkedSocialNetworkId: frame.data.id
            }
          );

        console.log("successUnlinkSocialNetwork result");
        console.log(result);

        return {
          success: true,
          errorMessage: null
        };
      }

      // if (primarySocialNetwork && primaryEmail) {
      //   const result =
      //     await membersService.api.memberRepository.removeMemberLinkedSocialNetwork(
      //       {
      //         linkedSocialNetworkId
      //       }
      //     );
      //   console.log("unlink result");
      //   console.log(result);
      //   return result;
      // } else {
      //   return null;
      // }
    }
  }
};
