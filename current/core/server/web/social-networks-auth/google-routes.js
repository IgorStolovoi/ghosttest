const express = require("../../../shared/express");
const config = require("../../../shared/config");
const api = require("../../api").endpoints;
const { http } = require("@tryghost/api-framework");
const shared = require("../shared");
const constants = require("@tryghost/constants");
const logging = require("@tryghost/logging");

const bodyParser = require("body-parser");
const membersService = require("../../services/members");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const session = require("express-session");
// const models = require("../../models");
// const SessionStore = require("../../services/auth/session/store");
// const settingsCache = require("../../../shared/settings-cache");
const urlUtils = require("../../../shared/url-utils");
// const sessionStore = new SessionStore(models.Session);

// let unoExpressSessionMiddleware;
// function getExpressLinkedInSessionMiddleware() {
//   if (!unoExpressSessionMiddleware) {
//     unoExpressSessionMiddleware = session({
//       store: sessionStore,
//       secret: settingsCache.get("linkedin_session_secret"),
//       resave: false,
//       saveUninitialized: false,
//       name: "linkedin-session",
//       cookie: {
//         maxAge: constants.SIX_MONTH_MS,
//         httpOnly: true,
//         path: urlUtils.getSubdir() + "/members",
//         sameSite: urlUtils.isSSL(config.get("url")) ? "none" : "lax",
//         secure: urlUtils.isSSL(config.get("url"))
//       }
//     });
//   }
//   return unoExpressSessionMiddleware;
// }

// async function getLinkedInSession(req, res) {
//   if (req.session) {
//     return req.session;
//   }
//   const expressSessionMiddleware = getExpressLinkedInSessionMiddleware();
//   return new Promise((resolve, reject) => {
//     expressSessionMiddleware(req, res, function (err) {
//       if (err) {
//         return reject(err);
//       }
//       resolve(req.session);
//     });
//   });
// }

const errorMessages = {
  signin: "Error while trying to member signin (via google)",
  signup: "Error while trying to sign up a new member (via google)",
  link: "Error while trying to link an additional social network to current member (via google)",
  updateEmail:
    "Error while trying to update a primary email for current member (via google)"
};

const getGoogleStrategy = ({ clientID, clientSecret, callbackURL }) =>
  new GoogleStrategy(
    {
      clientID,
      clientSecret,
      callbackURL,
      passReqToCallback: true
    },
    (request, accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  );

module.exports = function apiRoutes() {
  // usage of middleware to ensure user login not needed cause we logged in
  const router = express.Router("network auth google api");
  router.use(bodyParser.json({ limit: "50mb" }));

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  router.use(session({ secret: "secret", name: "google" }));

  router.use(passport.initialize());
  router.use(passport.session());
  // Global handling for member session, ensures a member is logged in to the frontend
  // router.use(membersService.middleware.loadMemberSession);
  const signinStrategy = getGoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.DEV_GOOGLE_STRATEGY_CALLBACK_URL_SIGN_IN
  });

  const signupStrategy = getGoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.DEV_GOOGLE_STRATEGY_CALLBACK_URL_SIGN_UP
  });

  const linkNewSocialNetworkStrategy = getGoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.DEV_GOOGLE_STRATEGY_CALLBACK_URL_LINK
  });

  const updateEmailStrategy = getGoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.DEV_GOOGLE_STRATEGY_CALLBACK_URL_UPDATEEMAIL
  });

  router.get(
    "/signin",
    passport.authenticate(signinStrategy, { scope: ["email", "profile"] })
  );
  // router.get("/signup", strategyMiddleware2, passport.authenticate("linkedin"));

  router.get(
    "/signin/callback",
    passport.authenticate(signinStrategy, {
      successRedirect: "success",
      failureRedirect: "fail"
    })
  );

  router.get(
    "/signup",
    passport.authenticate(signupStrategy, { scope: ["email", "profile"] })
  );

  router.get(
    "/signup/callback",
    // strategyMiddleware2,
    passport.authenticate(signupStrategy, {
      successRedirect: "success",
      failureRedirect: "fail"
    })
  );

  router.get(
    "/link",
    membersService.middleware.loadMemberSession,
    membersService.middleware.authMemberByUuid,
    passport.authenticate(linkNewSocialNetworkStrategy, {
      scope: ["email", "profile"]
    })
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
    passport.authenticate(updateEmailStrategy, { scope: ["email", "profile"] })
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

  // router.get("/logout", (req, res) => {
  //   req.session.destroy(function (err) {
  //     console.log("err");
  //     console.log(err);
  //     res.clearCookie("google", {
  //       path: "/"
  //     });
  //     // res.redirect("check");
  //     res.json({ success: true });
  //   });
  // });

  // router.get("/check", async (req, res) => {
  //   const o = await new Promise((resolve, reject) => {
  //     req.sessionStore.get("1111", (err, session) => {
  //       if (err) {
  //         reject(err);
  //       }
  //       return resolve(session);
  //     });
  //   });
  //   res.json({ sessionExists: o });
  // });

  router.get("/signin/success", http(api.authViaSocialNetworks.successSignin));
  router.get("/signin/fail", (req, res) => {
    logging.warn("signin google fail");
    logging.warn(JSON.stringify(req.body));
    res.json({ errorMessage: errorMessages.signin, redirectUrl: null });
  });
  router.get("/signup/success", http(api.authViaSocialNetworks.successSignup));
  router.get("/signup/fail", (req, res) => {
    logging.warn("signup google fail");
    logging.warn(JSON.stringify(req.body));
    res.json({ errorMessage: errorMessages.signup, redirectUrl: null });
  });
  router.get(
    "/link/success",
    http(api.authViaSocialNetworks.successLinkSocialNetwork)
  );
  router.get("/link/fail", (req, res) => {
    logging.warn("link google fail");
    logging.warn(JSON.stringify(req.body));
    res.json({ errorMessage: errorMessages.link, redirectUrl: null });
  });
  router.get(
    "/updateemail/success",
    http(api.authViaSocialNetworks.successUpdateEmail)
  );
  router.get("/updateemail/fail", (req, res) => {
    logging.warn("updateemail google fail");
    logging.warn(JSON.stringify(req.body));
    res.json({ errorMessage: errorMessages.updateEmail, redirectUrl: null });
  });

  return router;
};
