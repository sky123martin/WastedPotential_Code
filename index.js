var express = require("express");
var bodyParser = require("body-parser");
var app = express();

var session = require('express-session')
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var mongoose = require('mongoose');
var path = require('path');
var bcrypt = require('bcrypt')
mongoose.connect('mongodb://localhost/user');
var url = "mongodb://localhost:27017/";

console.log('hey hi the server started')

app.use(session({
  secret: 'this is our very secret',
  resave: true,
  saveUninitialized: false
}));

var UserSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
  },
  firstName: {
  	type: String,
  	required: true
  },
  lastName: {
  	type: String,
  	required: true
  }
});
UserSchema.pre('save', function (next) {
  var user = this;
  bcrypt.hash(user.password, 10, function (err, hash){
    if (err) {
      return next(err);
    }
    user.password = hash;
    next();
  })
});
UserSchema.statics.authenticate = function (email, password, callback) {
	User.findOne({ email: email })
	    .exec(function (err, user) {
		    if (err) {
		        return callback(err)
		      } else if (!user) {
		        var err = new Error('User not found.');
		        err.status = 401;
		        return callback(err);
		      }
		      bcrypt.compare(password, user.password, function (err, result) {
		        if (result === true) {
		          return callback(null, user);
		        } else {
		          return callback();
		        }
		      })
	});
}
var User = mongoose.model('User', UserSchema);
module.exports = User;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


function determineOptimalTimes(id){
	/*
	Take the time left before due date and subtract estimate of hours to complete. 
	Call that the assignments "score."
	Assignments with the smallest score are those that you don't have much time to complete, 
	but take a lot of work to do.
	We can sort a list of assignments based on that score. The assignments with the smallest score will be first.
	We can then break the amount of time that the assignment is going to take into chunks.
	Then we can go through a list of open work times and assign the chunks in any open spots before the due date.
	*/
	print('we gotta do this')
}

function addEvent(id, data){
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db("events")
		if (err) throw err;
  		dbd.collection(id.toString()).insertOne(data, function(e, res){ if (e) throw e; });
  		db.close();
	});
}

function getEvents(id){
	MongoClient.connect(url, function(e, db){
		var dbd = db.db("events")
		if (e) throw e;
  		dbd.collection(id.toString()).find().toArray(function(err, events){
  			if(err) throw err;
  			db.close();
  			return events;
  		});
	})
}

function addAssignment(id, data){
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db("assignments")
		if (err) throw err;
  		dbd.collection(id.toString()).insertOne(data, function(e, res){ if (e) throw e; });
  		db.close();
	});
}

function getAssignments(id){
	MongoClient.connect(url, function(err, db){
		var dbd = db.db("assignments")
		if (err) throw err;
  		dbd.collection(id.toString()).find().toArray(function(err, a){
  			if(err) throw err;
  			db.close();
  			return a;
  		});
	})
}


function getPreferences(id){
	MongoClient.connect(url, function(err, db){
		var dbd = db.db("preferences")
		if (err) throw err;
  		dbd.collection(id.toString()).find().toArray(function(err, p){
  			if(err) throw err;
  			db.close();
  			return p;
  		});
	})
}

function addUser(data){
	if (data.email &&
	  data.password) {
	  var userData = {
	    email: data.email,
	    password: data.password,
	    firstName: data.firstName,
	    lastName: data.lastName
	  }
	  User.create(userData, function (err, user) {
	    if (err) {
	      return -1
	    } else {
	      return user._id
	    }
	  });
	}
}

app.use('/website', express.static('website'))


app.get('/assignments', function(req, res){
	if (req.session && req.session.id) {
		console.log(req.body)
		console.log(getAssignments(req.session.userId))
	} else {
		res.redirect('/sign_in')
	}
})

app.get('/add_assignment', function(req,res){
	if (req.session && req.session.id) {
		console.log(req.body)
		addAssignment(req.session.userId, req.body)
	} else {
		res.redirect('/sign_in')
	}
})

app.post('/sign_up', function(req, res){console.log('sign_up')
	console.log(req.body)
	userId = addUser(req.body)
	console.log(userId)
	
	if(userId != -1){
		console.log('worked')
		req.session.userId = userId
	}
})

app.post('/sign_in', function(req, res){ console.log('sign_in')
	if (req.body.email && req.body.password) {
		console.log(req.body)
	  	UserSchema.statics.authenticate(req.body.email, req.body.password, function(err, user){
			if(!(err || !user)){
				console.log('worked')
				req.session.userId = user._id
			}
		})
	}
})


app.get('/logout', function(req, res, next) {
  if (req.session) {
    // delete session object
    req.session.destroy(function(err) {
      if(err) {
        return next(err);
      } else {
        return res.redirect('/');
      }
    });
  }
});


var server = app.listen(8000, function () {
    console.log("Listening on port %s...", server.address().port);
});




//use this to authenticate on gets and puts
// UserSchema.statics.authenticate = function (email, password, callback) {
//   User.findOne({ email: email })
//     .exec(function (err, user) {
//       if (err) {
//         return callback(err)
//       } else if (!user) {
//         var err = new Error('User not found.');
//         err.status = 401;
//         return callback(err);
//       }
//       bcrypt.compare(password, user.password, function (err, result) {
//         if (result === true) {
//           return callback(null, user);
//         } else {
//           return callback();
//         }
//       })
//     });
// }








