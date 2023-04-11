const express = require("../../../shared/express");
const api = require("../../api").endpoints;
const { http } = require("@tryghost/api-framework");

const bodyParser = require("body-parser");
const membersService = require("../../services/members");
const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;
const session = require("express-session");

const errorMessages = {
  signin: "Error while trying to member signin (via facebook)",
  signup: "Error while trying to sign up a new member (via facebook)",
  link: "Error while trying to link an additional social network to current member (via facebook)",
  updateEmail:
    "Error while trying to update a primary email for current member (via facebook)"
};

const getFacebookStrategy = ({ clientID, clientSecret, callbackURL }) =>
  new FacebookStrategy(
    {
      clientID,
      clientSecret,
      callbackURL,
      profileFields: ["photos", "email", "first_name", "last_name"]
    },
    function (accessToken, refreshToken, profile, done) {
      return done(null, profile);
    }
  );

module.exports = function apiRoutes() {
  const router = express.Router("network auth facebook api");
  router.use(bodyParser.json({ limit: "50mb" }));

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  router.use(session({ secret: "secret", name: "facebook" }));

  router.use(passport.initialize());
  router.use(passport.session());
  // Global handling for member session, ensures a member is logged in to the frontend
  // router.use(membersService.middleware.loadMemberSession);
  const signinStrategy = getFacebookStrategy({
    clientID: process.env.FACEBOOK_KEY,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: process.env.DEV_FACEBOOK_STRATEGY_CALLBACK_URL_SIGN_IN
  });

  const signupStrategy = getFacebookStrategy({
    clientID: process.env.FACEBOOK_KEY,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: process.env.DEV_FACEBOOK_STRATEGY_CALLBACK_URL_SIGN_UP
  });

  const linkNewSocialNetworkStrategy = getFacebookStrategy({
    clientID: process.env.FACEBOOK_KEY,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: process.env.DEV_FACEBOOK_STRATEGY_CALLBACK_URL_LINK
  });

  const updateEmailStrategy = getFacebookStrategy({
    clientID: process.env.FACEBOOK_KEY,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: process.env.DEV_FACEBOOK_STRATEGY_CALLBACK_URL_UPDATEEMAIL
  });

  router.get("/signin", passport.authenticate(signinStrategy));

  router.get(
    "/signin/callback",
    passport.authenticate(signinStrategy, {
      successRedirect: "success",
      failureRedirect: "fail"
    })
  );

  router.get("/signup", passport.authenticate(signupStrategy));

  router.get(
    "/signup/callback",
    passport.authenticate(signupStrategy, {
      successRedirect: "success",
      failureRedirect: "fail"
    })
  );

  router.get(
    "/link",
    membersService.middleware.loadMemberSession,
    membersService.middleware.authMemberByUuid,
    passport.authenticate(linkNewSocialNetworkStrategy)
  );

  router.get(
    "/link/callback",
    membersService.middleware.loadMemberSession,
    membersService.middleware.authMemberByUuid,
    passport.authenticate(linkNewSocialNetworkStrategy, {
      successRedirect: "success",
      failureRedirect: "fail"
    })
  );

  router.get(
    "/updateemail",
    membersService.middleware.loadMemberSession,
    membersService.middleware.authMemberByUuid,
    passport.authenticate(updateEmailStrategy)
  );

  router.get(
    "/updateemail/callback",
    membersService.middleware.loadMemberSession,
    membersService.middleware.authMemberByUuid,
    passport.authenticate(updateEmailStrategy, {
      successRedirect: "success",
      failureRedirect: "fail"
    })
  );

  router.get("/signin/success", http(api.authViaSocialNetworks.successSignin));
  router.get("/signin/fail", (req, res) => {
    logging.warn("signin facebook fail");
    logging.warn(JSON.stringify(req.body));
    res.json({ errorMessage: errorMessages.signin, redirectUrl: null });
  });
  router.get("/signup/success", http(api.authViaSocialNetworks.successSignup));
  router.get("/signup/fail", (req, res) => {
    logging.warn("signup facebook fail");
    logging.warn(JSON.stringify(req.body));
    res.json({ errorMessage: errorMessages.signup, redirectUrl: null });
  });
  router.get(
    "/link/success",
    http(api.authViaSocialNetworks.successLinkSocialNetwork)
  );
  router.get("/link/fail", (req, res) => {
    logging.warn("link facebook fail");
    logging.warn(JSON.stringify(req.body));
    res.json({ errorMessage: errorMessages.link, redirectUrl: null });
  });
  router.get(
    "/updateemail/success",
    http(api.authViaSocialNetworks.successUpdateEmail)
  );
  router.get("/updateemail/fail", (req, res) => {
    logging.warn("updateEmail facebook fail");
    logging.warn(JSON.stringify(req.body));
    res.json({ errorMessage: errorMessages.updateEmail, redirectUrl: null });
  });

  return router;
};
