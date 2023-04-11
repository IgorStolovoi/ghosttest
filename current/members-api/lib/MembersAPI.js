const { Router } = require("express");
const body = require("body-parser");
const MagicLink = require("@tryghost/magic-link");
const errors = require("@tryghost/errors");
const logging = require("@tryghost/logging");

const PaymentsService = require("@tryghost/members-payments");

const TokenService = require("./services/token");
const GeolocationSerice = require("./services/geolocation");
const MemberBREADService = require("./services/member-bread");
const MemberRepository = require("./repositories/member");
const EventRepository = require("./repositories/event");
const ProductRepository = require("./repositories/product");
const RouterController = require("./controllers/router");
const MemberController = require("./controllers/member");
const WellKnownController = require("./controllers/well-known");

const { EmailSuppressedEvent } = require("@tryghost/email-suppression-list");
const DomainEvents = require("@tryghost/domain-events");

module.exports = function MembersAPI({
  tokenConfig: { issuer, privateKey, publicKey },
  auth: { allowSelfSignup = () => true, getSigninURL, tokenProvider },
  mail: { transporter, getText, getHTML, getSubject },
  models: {
    EmailRecipient,
    StripeCustomer,
    StripeCustomerSubscription,
    Member,
    MemberNewsletter,
    MemberCancelEvent,
    MemberSubscribeEvent,
    MemberLoginEvent,
    MemberPaidSubscriptionEvent,
    MemberPaymentEvent,
    MemberStatusEvent,
    MemberProductEvent,
    MemberEmailChangeEvent,
    MemberCreatedEvent,
    SubscriptionCreatedEvent,
    MemberLinkClickEvent,
    EmailSpamComplaintEvent,
    Offer,
    OfferRedemption,
    StripeProduct,
    StripePrice,
    Product,
    Settings,
    Comment,
    MemberFeedback
  },
  tiersService,
  stripeAPIService,
  offersAPI,
  labsService,
  newslettersService,
  memberAttributionService,
  emailSuppressionList
}) {
  const tokenService = new TokenService({
    privateKey,
    publicKey,
    issuer
  });

  const productRepository = new ProductRepository({
    Product,
    Settings,
    StripeProduct,
    StripePrice,
    stripeAPIService
  });

  const memberRepository = new MemberRepository({
    stripeAPIService,
    tokenService,
    newslettersService,
    labsService,
    productRepository,
    Member,
    MemberNewsletter,
    MemberCancelEvent,
    MemberSubscribeEventModel: MemberSubscribeEvent,
    MemberPaidSubscriptionEvent,
    MemberEmailChangeEvent,
    MemberStatusEvent,
    MemberProductEvent,
    OfferRedemption,
    StripeCustomer,
    StripeCustomerSubscription,
    offerRepository: offersAPI.repository
  });

  const eventRepository = new EventRepository({
    EmailRecipient,
    MemberSubscribeEvent,
    MemberPaidSubscriptionEvent,
    MemberPaymentEvent,
    MemberStatusEvent,
    MemberLoginEvent,
    MemberCreatedEvent,
    SubscriptionCreatedEvent,
    MemberLinkClickEvent,
    MemberFeedback,
    EmailSpamComplaintEvent,
    Comment,
    labsService,
    memberAttributionService
  });

  const memberBREADService = new MemberBREADService({
    offersAPI,
    memberRepository,
    emailService: {
      async sendEmailWithMagicLink({ email, requestedType }) {
        return sendEmailWithMagicLink({
          email,
          requestedType,
          options: {
            forceEmailType: true
          }
        });
      }
    },
    labsService,
    stripeService: stripeAPIService,
    memberAttributionService,
    emailSuppressionList
  });

  const geolocationService = new GeolocationSerice();

  const magicLinkService = new MagicLink({
    transporter,
    tokenProvider,
    getSigninURL,
    getText,
    getHTML,
    getSubject
  });

  const paymentsService = new PaymentsService({
    StripeProduct,
    StripePrice,
    StripeCustomer,
    Offer,
    offersAPI,
    stripeAPIService
  });

  const memberController = new MemberController({
    memberRepository,
    productRepository,
    paymentsService,
    tiersService,
    StripePrice,
    tokenService,
    sendEmailWithMagicLink
  });

  const routerController = new RouterController({
    offersAPI,
    paymentsService,
    tiersService,
    memberRepository,
    StripePrice,
    allowSelfSignup,
    magicLinkService,
    stripeAPIService,
    tokenService,
    sendEmailWithMagicLink,
    memberAttributionService,
    labsService
  });

  const wellKnownController = new WellKnownController({
    tokenService
  });

  const users = memberRepository;

  async function sendEmailWithMagicLink({
    email,
    requestedType,
    tokenData,
    options = { forceEmailType: false },
    referrer = null
  }) {
    console.log(
      "JSON.stringify({email, requestedType, tokenData, options, referrer  })"
    );
    console.log(
      JSON.stringify({ email, requestedType, tokenData, options, referrer })
    );
    let type = requestedType;
    if (!options.forceEmailType) {
      const member = await users.get({ email });
      if (member) {
        type = "signin";
      } else if (type !== "subscribe") {
        type = "signup";
      }
    }
    return magicLinkService.sendMagicLink({
      email,
      type,
      tokenData: Object.assign({ email, type }, tokenData),
      referrer
    });
  }

  /**
   *
   * @param {string} email
   * @param {'signin'|'signup'} type When you specify 'signin' this will prevent the creation of a new member if no member is found with the provided email
   * @param {*} [tokenData] Optional token data to add to the token
   * @returns
   */
  function getMagicLink(email, type, tokenData = {}) {
    return magicLinkService.getMagicLink({
      tokenData: { email, ...tokenData },
      type
    });
  }

  async function getTokenDataFromMagicLinkToken(token) {
    return await magicLinkService.getDataFromToken(token);
  }

  async function getMemberDataFromMagicLinkToken(
    token,
    reqIpFromSocialNetworks
  ) {
    const {
      email,
      labels = [],
      name = "",
      oldEmail,
      newsletters,
      attribution,
      reqIp,
      type,
      fromSocialNetowrks
    } = await getTokenDataFromMagicLinkToken(token);

    if (fromSocialNetowrks) {
      console.log("data from token");
      console.log(reqIpFromSocialNetworks);

      // oldEmail, oldPrimarySocialNetwork
      const {
        memberId,
        email,
        passedSocialNetwork,
        linkingSocialNetwork,
        linkingEmail,
        photo,
        firstName = "",
        lastName = "",
        newEmail
      } = fromSocialNetowrks;

      if (!email || !passedSocialNetwork || !type) return null;

      if (type === "link") {
        const { primarySocialNetwork, primaryEmail } =
          await users.findMemberPrimaryEmailAndSocialNetwork({
            email: linkingEmail,
            linkedSocialNetworkName: linkingSocialNetwork
          });

        if (!(primaryEmail && primarySocialNetwork)) {
          logging.warn("there is no suck linked account yet");
          const { linkedSocialNetworkId } =
            await users.getMemberLinkedSocialNetworkId({
              primaryEmail: email,
              linkedSocialNetworkName: linkingSocialNetwork
            });
          logging.warn(linkedSocialNetworkId);
          if (!linkedSocialNetworkId) {
            await users.setMemberLinkedSocialNetwork({
              memberId,
              linkedSocialNetworkEmail: linkingEmail,
              linkedSocialNetworkName: linkingSocialNetwork
            });
            return await getMemberIdentityData(email);
          } else {
            await users.updateMemberLinkedSocialNetwork({
              linkedSocialNetworkId,
              linkedSocialNetworkEmail: linkingEmail,
              linkedSocialNetworkName: linkingSocialNetwork
            });
            return await getMemberIdentityData(email);
          }
        } else {
          // already linked ( to this member or other doesnt really matter)
          if (
            primarySocialNetwork === passedSocialNetwork &&
            primaryEmail === email
          ) {
            //this social network account is already linked to current member account
            return {
              customError:
                "This social network account is already linked to current member account"
            };
          } else {
            // this soc netowrk account is lnked to another member account
            return {
              customError:
                "This soc netowrk account is lnked to another member account"
            };
          }
        }
      }

      const { primarySocialNetwork, primaryEmail } =
        await users.findMemberPrimaryEmailAndSocialNetwork({
          email,
          linkedSocialNetworkName: passedSocialNetwork
        });

      if (type === "signin") {
        if (!(primaryEmail && primarySocialNetwork)) {
          return null;
        }
        const member = await getMemberIdentityData(primaryEmail);
        await MemberLoginEvent.add({ member_id: member.id });
        return member;
      } else if (type === "updateEmail") {
        if (!(primaryEmail && primarySocialNetwork) || !newEmail) {
          return {
            customError:
              "Unable to update the email for the current member because you are not registered as a member of this social account in the system"
          };
        }
        const member = await getMemberIdentityData(primaryEmail);
        const memberWithTheSameNewEmail = await getMemberIdentityData(newEmail);
        if (memberWithTheSameNewEmail) {
          // cant change email, member with such primary email already exists
          return {
            customError:
              "Cannot update email for current memeber cause this email already is primary email for another member"
          };
        }
        await MemberLoginEvent.add({ member_id: member.id });
        await users.update({ email: newEmail }, { id: member.id });
        return await getMemberIdentityData(newEmail);
      } else if (type === "signup") {
        let geolocation;
        if (reqIpFromSocialNetworks) {
          try {
            geolocation = JSON.stringify(
              await geolocationService.getGeolocationFromIP(
                reqIpFromSocialNetworks
              )
            );
          } catch (err) {
            logging.warn(err);
          }
        }

        try {
          const newMember = await users.create({
            first_name: firstName,
            last_name: lastName,
            name: `${firstName} ${lastName}`,
            primary_social_network: primarySocialNetwork || passedSocialNetwork,
            photo,
            email: primaryEmail || email,
            labels,
            newsletters,
            attribution,
            geolocation
          });

          await MemberLoginEvent.add({ member_id: newMember.id });
          return getMemberIdentityData(email);
        } catch (error) {
          logging.warn(error.message);
          return {
            customError: "newMember that with the same email error"
          };
        }
      } else {
        // invalid operation
        return null;
      }
    }

    if (!email) {
      return null;
    }

    const member = oldEmail
      ? await getMemberIdentityData(oldEmail)
      : await getMemberIdentityData(email);

    if (member) {
      await MemberLoginEvent.add({ member_id: member.id });
      if (oldEmail && (!type || type === "updateEmail")) {
        // user exists but wants to change their email address
        await users.update({ email }, { id: member.id });
        return getMemberIdentityData(email);
      }
      return member;
    }

    // Note: old tokens can still have a missing type (we can remove this after a couple of weeks)
    if (type && !["signup", "subscribe"].includes(type)) {
      // Don't allow sign up
      // Note that we use the type from inside the magic token so this behaviour can't be changed
      return null;
    }

    let geolocation;
    if (reqIp) {
      try {
        geolocation = JSON.stringify(
          await geolocationService.getGeolocationFromIP(reqIp)
        );
      } catch (err) {
        logging.warn(err);
        // no-op, we don't want to stop anything working due to
        // geolocation lookup failing
      }
    }

    const newMember = await users.create({
      name,
      email,
      labels,
      newsletters,
      attribution,
      geolocation
    });

    await MemberLoginEvent.add({ member_id: newMember.id });
    return getMemberIdentityData(email);
  }
  async function getMemberIdentityData(email) {
    return memberBREADService.read({ email });
  }

  async function getMemberIdentityToken(email) {
    const member = await getMemberIdentityData(email);
    if (!member) {
      return null;
    }
    return tokenService.encodeIdentityToken({ sub: member.email });
  }

  async function setMemberGeolocationFromIp(email, ip) {
    if (!email || !ip) {
      throw new errors.IncorrectUsageError({
        message:
          "setMemberGeolocationFromIp() expects email and ip arguments to be present"
      });
    }

    // toJSON() is needed here otherwise users.update() will pick methods off
    // the model object rather than data and fail to edit correctly
    const member = (await users.get({ email })).toJSON();

    if (!member) {
      throw new errors.NotFoundError({
        message: `Member with email address ${email} does not exist`
      });
    }

    // max request time is 500ms so shouldn't slow requests down too much
    let geolocation = JSON.stringify(
      await geolocationService.getGeolocationFromIP(ip)
    );
    if (geolocation) {
      await users.update({ geolocation }, { id: member.id });
    }

    return getMemberIdentityData(email);
  }

  const forwardError = (fn) => async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  const middleware = {
    sendMagicLink: Router().use(
      body.json(),
      forwardError((req, res) => routerController.sendMagicLink(req, res))
    ),
    createCheckoutSession: Router().use(
      body.json(),
      forwardError((req, res) =>
        routerController.createCheckoutSession(req, res)
      )
    ),
    createCheckoutSetupSession: Router().use(
      body.json(),
      forwardError((req, res) =>
        routerController.createCheckoutSetupSession(req, res)
      )
    ),
    updateEmailAddress: Router().use(
      body.json(),
      forwardError((req, res) => memberController.updateEmailAddress(req, res))
    ),
    updateSubscription: Router({ mergeParams: true }).use(
      body.json(),
      forwardError((req, res) => memberController.updateSubscription(req, res))
    ),
    wellKnown: Router().get("/jwks.json", (req, res) =>
      wellKnownController.getPublicKeys(req, res)
    )
  };

  const getPublicConfig = function () {
    return Promise.resolve({
      publicKey,
      issuer
    });
  };

  const bus = new (require("events").EventEmitter)();

  bus.emit("ready");

  DomainEvents.subscribe(EmailSuppressedEvent, async function (event) {
    if (!labsService.isSet("suppressionList")) {
      return;
    }
    const member = await memberRepository.get({
      email: event.data.emailAddress
    });
    if (!member) {
      return;
    }
    await memberRepository.update({ newsletters: [] }, { id: member.id });
  });

  return {
    middleware,
    getMemberDataFromMagicLinkToken,
    getMemberIdentityToken,
    getMemberIdentityData,
    setMemberGeolocationFromIp,
    getPublicConfig,
    bus,
    sendEmailWithMagicLink,
    getMagicLink,
    members: users,
    memberBREADService,
    events: eventRepository,
    productRepository,

    // Test helpers
    getTokenDataFromMagicLinkToken,
    paymentsService,
    tokenProvider,
    memberRepository
    // signinOrSignupMemberAfterSocialNetworksCommunication
  };
};
