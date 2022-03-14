//jshint esversion:6
require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
// const md5 = require("md5");
// const bcrypt = require('bcrypt');
// const saltRounds = 10;

const app = express();


app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session())

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

// used to serialize the user for the session
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URLGOOGLE
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({googleId: profile.id}, function(err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APPID,
    clientSecret: process.env.FACEBOOK_SECRETCODE,
    callbackURL: process.env.CALLBACK_URLFACEBOOK
  },
  function(accessToken, refreshToken, profile, cb) {

    User.findOrCreate({ facebookId: profile.id}, function(err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', {
    scope: ['profile']
  })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/secrets');
  });

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/secrets');
  });


app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/secrets", function(req, res) {
  User.find({"secrets": {ne: null}}, function(err, foundUsers){
    if(err){
      console.log(err);
    }else{
      if(foundUsers){
        res.render("secrets", {usersubmittedSecrets: foundUsers})
      }
    }
  })
})

app.get("/submit", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
})


app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
})

app.post("/register", function(req, res) {

  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      res.send(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  })
  // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  //   const newUser = new User({
  //     email: req.body.username,
  //     password: hash
  //   });
  //
  //   newUser.save(function(err){
  //     if(!err){
  //       res.render("secrets");
  //     }else{
  //       res.send(err);
  //     }
  //   });
  // });
})


app.post("/login", function(req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      res.send(err);
      res.redirect("/login");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
  // const username = req.body.username;
  // const password = req.body.password;

  // User.findOne({email: username}, function(err, foundUser){
  //   if(err){
  //     res.send(err);
  //   }else{
  //     if(foundUser){
  //       bcrypt.compare(password, foundUser.password, function(err, result) {
  //         if(result === true){
  //             res.render("secrets");
  //         }else{
  //           res.send(err);
  //         }
  //       });
  //
  //       }
  //     }
  // });

})

app.post("/submit", function(req, res) {
  submittedSecret = req.body.secret;

  User.findById(req.user.id, function(err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret
        foundUser.save(function() {
          res.redirect("/secrets");
        });
      }
    }
  })
})

app.listen(3000, function() {
  console.log("Server started successfully on port 3000");
});
