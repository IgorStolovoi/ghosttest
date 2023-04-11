const express = require("../../../shared/express");
const api = require("../../api").endpoints;
const { http } = require("@tryghost/api-framework");

const bodyParser = require("body-parser");
const membersService = require("../../services/members");
const passport = require("passport");
const LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;
const session = require("express-session");
const logging = require("@tryghost/logging");

const errorMessages = {
  signin: "Error while trying to member signin (via linkedin)",
  signup: "Error while trying to sign up a new member (via linkedin)",
  link: "Error while trying to link an additional social network to current member (via linkedin)",
  updateEmail:
    "Error while trying to update a primary email for current member (via linkedin)"
};

const getLinkedinStrategy = ({ clientID, clientSecret, callbackURL }) =>
  new LinkedInStrategy(
    {
      clientID,
      clientSecret,
      callbackURL,
      scope: ["r_emailaddress", "r_liteprofile"]
    },
    (accessToken, refreshToken, profile, done) => {
      process.nextTick(() => {
        return done(null, profile);
      });
    }
  );

module.exports = function apiRoutes() {
  // usage of middleware to ensure user login not needed cause we logged in
  const router = express.Router("network auth linkedin api");
  router.use(bodyParser.json({ limit: "50mb" }));

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  // , genid: (request) => "1111"
  router.use(session({ secret: "secret", name: "linkedin" }));

  router.use(passport.initialize());
  router.use(passport.session());

  // Global handling for member session, ensures a member is logged in to the frontend
  // router.use(membersService.middleware.loadMemberSession);
  const signinStrategy = getLinkedinStrategy({
    clientID: process.env.LINKEDIN_KEY,
    clientSecret: process.env.LINKEDIN_SECRET,
    callbackURL: process.env.DEV_LINKEDIN_STRATEGY_CALLBACK_URL_SIGN_IN
  });
  const signupStrategy = getLinkedinStrategy({
    clientID: process.env.LINKEDIN_KEY,
    clientSecret: process.env.LINKEDIN_SECRET,
    callbackURL: process.env.DEV_LINKEDIN_STRATEGY_CALLBACK_URL_SIGN_UP
  });
  const linkNewSocialNetworkStrategy = getLinkedinStrategy({
    clientID: process.env.LINKEDIN_KEY,
    clientSecret: process.env.LINKEDIN_SECRET,
    callbackURL: process.env.DEV_LINKEDIN_STRATEGY_CALLBACK_URL_LINK
  });
  const updateEmailStrategy = getLinkedinStrategy({
    clientID: process.env.LINKEDIN_KEY,
    clientSecret: process.env.LINKEDIN_SECRET,
    callbackURL: process.env.DEV_LINKEDIN_STRATEGY_CALLBACK_URL_UPDATEEMAIL
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

  router.get("/logout", (req, res) => {
    req.session.destroy(function (err) {
      console.log("err");
      console.log(err);
      res.clearCookie("linkedin", {
        path: "/"
      });
      res.json({ success: true });
    });
  });

  router.get("/signin/success", http(api.authViaSocialNetworks.successSignin));
  router.get("/signin/fail", (req, res) => {
    logging.warn("signin linkedin fail");
    logging.warn(JSON.stringify(req.body));
    res.json({ errorMessage: errorMessages.signin, redirectUrl: null });
  });
  router.get("/signup/success", http(api.authViaSocialNetworks.successSignup));
  router.get("/signup/fail", (req, res) => {
    logging.warn("signin linkedin fail");
    logging.warn(JSON.stringify(req.body));
    res.json({ errorMessage: errorMessages.signin, redirectUrl: null });
  });
  router.get(
    "/link/success",
    http(api.authViaSocialNetworks.successLinkSocialNetwork)
  );
  router.get("/link/fail", (req, res) => {
    logging.warn("signin linkedin fail");
    logging.warn(JSON.stringify(req.body));
    res.json({ errorMessage: errorMessages.signin, redirectUrl: null });
  });
  router.get(
    "/updateemail/success",
    http(api.authViaSocialNetworks.successUpdateEmail)
  );
  router.get("/updateemail/fail", (req, res) => {
    logging.warn("signin linkedin fail");
    logging.warn(JSON.stringify(req.body));
    res.json({ errorMessage: errorMessages.signin, redirectUrl: null });
  });

  return router;
};
