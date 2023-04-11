const urlUtils = require("../../../shared/url-utils");
const membersService = require("../../services/members");

module.exports = {
  docName: "auth_via_social_networks",

  successSignin: {
    statusCode: 200,
    permissions: false,
    async query(frame) {
      const email = frame.user.emails?.[0]?.value || null;
      if (!email) {
        return {
          errorMessage: `Not enough access to fetch your email. Please add a primary email to your ${frame?.user?.provider} account`,
          redirectUrl: null
        };
      }

      const token = await membersService.api.tokenProvider.create({
        fromSocialNetowrks: {
          email,
          passedSocialNetwork: frame?.user?.provider
        },
        type: "signin"
      });
      return {
        redirectUrl: `${urlUtils.getSiteUrl()}members?token=${token}&action=signin`
      };
    }
  },

  // should to be loggined
  successUpdateEmail: {
    statusCode: 200,
    permissions: false,
    async query(frame) {
      const email = frame.user.emails?.[0]?.value || null;

      if (!email) {
        return {
          errorMessage: `Not enough access to fetch your email. Please add an email to your subtitute ${frame?.user?.provider} account`,
          redirectUrl: null
        };
      }

      const token = await membersService.api.tokenProvider.create({
        fromSocialNetowrks: {
          email: frame?.options?.context?.member?.email,
          passedSocialNetwork:
            frame?.options?.context?.member?.primary_social_network,
          newEmail: email
        },
        type: "updateEmail"
      });
      return {
        redirectUrl: `${urlUtils.getSiteUrl()}members?token=${token}&action=signin`
      };
    }
  },

  successSignup: {
    statusCode: 200,
    permissions: false,
    async query(frame) {
      const { givenName: firstName, familyName: lastName } = frame.user.name;
      const photo = frame.user.photos
        ? (frame?.user?.provider === "linkedin" &&
            frame.user.photos?.[1]?.value) ||
          (frame?.user?.provider === "facebook" &&
            frame.user.photos?.[0]?.value) ||
          (frame?.user?.provider === "google" && frame.user.picture) ||
          null
        : null;
      const email = frame.user.emails?.[0]?.value || null;

      if (!email) {
        return {
          errorMessage: `Not enough access to fetch your email. Please add an email to your ${frame?.user?.provider} account`,
          redirectUrl: null
        };
      }

      const token = await membersService.api.tokenProvider.create({
        fromSocialNetowrks: {
          email,
          passedSocialNetwork: frame?.user?.provider,
          firstName,
          lastName,
          photo
        },
        type: "signup"
      });

      return {
        redirectUrl: `${urlUtils.getSiteUrl()}members?token=${token}&action=signup`
      };
    }
  },

  successLinkSocialNetwork: {
    statusCode: 200,
    permissions: false,
    async query(frame) {
      const email = frame.user.emails?.[0]?.value || null;

      if (!email) {
        return {
          errorMessage: `Not enough access to fetch your email. Please add an email to your linked ${frame?.user?.provider} account`,
          redirectUrl: null
        };
      }

      const token = await membersService.api.tokenProvider.create({
        fromSocialNetowrks: {
          memberId: frame?.options?.context?.member?.id,
          linkingEmail: email,
          linkingSocialNetwork: frame?.user?.provider,
          email: frame?.options?.context?.member?.email,
          passedSocialNetwork:
            frame?.options?.context?.member?.primary_social_network
        },
        type: "link"
      });
      return {
        errorMessage: null,
        redirectUrl: `${urlUtils.getSiteUrl()}members?token=${token}&action=signin`
      };
    }
  }
};
