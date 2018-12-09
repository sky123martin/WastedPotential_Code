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

function sort_by_priority(a, b){
	if (a[3] === b[3]){
		return 0;
	}
	else {
		return (a[3] < b[3]) ? -1 : 1;
	}
}


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
	getAssignments(id, function(assignments){

		for (var i = 0; i < assignments.length; i++) {
			var date = new Date();
			var current_day = date.getDate();
			var due_date = assignments[i].due.getDate();
			var time_left = due_date - current_day;
			var priority = (time_left * 24) - (assignments[i].numhours);
			assignments.priority = priority

			assignments.sort(function(a,b){
				return b.priority - a.priority;
			});
		}

		getPreferences(id, function(preferences){
			var start_hour = preferences[preferences.length - 1].start_study;
			var end_hour = preferences[preferences.length - 1].end_study;
		});

		var today = new Date();

		start_work = start_hour;
		for (var i = 0; i < assignments.length; i++){
			var numDays = assignments[i].due.getDate() - today.getDate();
			var hours_to_complete = numDays * (end_hour - start_hour);
			if (hours_to_complete < numHours){
				return "Not enough hours to complete assignment.";
			}


			var current_date = new Date();
			study_left = end_hour - start_hour;
			//current_date.setHours(start_work);
			if (assignments.numhours < study_left){
				start_date = current_date.setHours(start_work);
				end_date = current_date.setHours(start_work + assignments[i].numhours)
				assignments.worktime[0] = start_date;
				assignments.worktime[1] = end_date;
				start_work = start_work + assignments[i].numhours;
			} else {
				start_date = current_date.setHours(start_work);
				assignments.worktime[0] = start_date;
				hours_left = end_hour - start_work;
				additional_hours = assignments[i].numhours - hours_left;
				end_date = start_date.setDate(start_date.getDate() + 1);
				end_date.setHours(start_hour + additional_hours)
				assignments.worktime[1] = end_date;
				start_work = end_date.getHours();
			}
		}

	});

	//A bunch of junkyard code that I originally wrote but ended up changing my approach.
	//I was using it as a reference so I haven't deleted it yet.
	/*
	Assignment:
	[0] title
	[1] due date
	[2] num hours needed
	[3] priority
	[4] work date
	[5] work time
	*/
	/*
	for (var i = 0; i < assignments.length; i++) {
		var single_assign = [];
		single_assign.push(assignments[i].title);
		single_assign.push(assignments[i].due);
		single_assign.push(assignments[i].numhours);
		single_assign.push(0);
		single_assign.push(0);
		assign_arr.push(single_assign);
	}

	var assign_arr = [];
	var date = new Date();
	var current_day = date.getDate();
	for (var i = 0; i < assign_arr.length; i++) {
		due_date = assign_arr[i][1].getDate();
		var time_left = due_date - current_day;
		var priority = (time_left * 24) - (assign_arr[i][2]);
		assign_arr[i][3] = priority;
	}

	var assign_sorted = assign_arr.sort(sort_by_priority);



	var current_date = new Date();
	for (var i = 0; i < assign_sorted.length; i++){
		while (assign_sorted[i][2] > 0){
			study_left = end_hour - start_hour;
			var start_work = start_hour;
			if (assign_sorted[i][2] < study_left){
				current_date.setHours(start_work);
				assign_sorted[i][4] = current_date;
				start_work = start_work + assign_sorted[i][2];
				assign_sorted[i][2] = 0;
			} else {
				

				current_date.setDate(current_date.getDate()+1)
				start_work = start_hour;
				if (assign_sorted[i][2] < study_left){
					current_date.setHours(start_hour);
					assign_sorted[i][4] = current_date;
					start_hour = start_hour + assign_sorted[i][2];
				}
			}
		}
	}*/

}

function addEvent(id, data){
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db("events")
		if (err) throw err;
  		dbd.collection(id).insertOne(data, function(e, res){ if (e) throw e; });
  		db.close();
	});
}

function getEvents(id){
	MongoClient.connect(url, function(e, db){
		var dbd = db.db("events")
		if (e) throw e;
  		dbd.collection(id).find().toArray(function(err, events){
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
  		dbd.collection(id).insertOne(data, function(e, res){ if (e) throw e; });
  		db.close();
	});
}

function getAssignments(id, callback){
	MongoClient.connect(url, function(err, db){
		var dbd = db.db("assignments")
		if (err) throw err;
  		dbd.collection(id).find().toArray(function(err, a){
  			if(err) throw err;
  			db.close();
  			callback(a);
  		});
	})
}


function getPreferences(id){
	MongoClient.connect(url, function(err, db){
		var dbd = db.db("preferences")
		if (err) throw err;
  		dbd.collection(id).find().toArray(function(err, p){
  			if(err) throw err;
  			db.close();
  			return p[p.length -1];
  		});
	})
}

function setPreferences(id, data){
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db("preferences")
		if (err) throw err;
  		dbd.collection(id).insertOne(data, function(e, res){ if (e) throw e; });
  		db.close();
	});
}

function addUser(data, callback){
	if (data.email &&
	  data.password) {
	  var userData = {
	    email: data.email,
	    password: data.password,
	    firstName: data.firstName,
	    lastName: data.lastName
	  }
	  
	  User.create(userData, function (err, user) {
	    if (err) {console.log('error--')
	    	console.log(err)
	      callback(-1)
	    } else {
	    	console.log('woah')
	    	console.log(user._id)
	        callback(user._id)
	    }
	  });
	}
}

app.use('/website', express.static('website'))


app.get('/assignments', function(req, res){console.log('assignments')
	if (req.session && req.session.id && req.session.userId) {
		getAssignments(req.session.userId.toString(), function(assignments){
			res.send(assignments)
		})
	} else {
		res.send('not today')
	}
})

app.get('/events', function(req, res){
	if (req.session && req.session.id && req.session.userId) {
		getEvents(req.session.userId.toString(), function(assignments){
			res.send(assignments)
		})
	} else {
		res.send('not today')
	}
})

app.get('/preferences', function(req, res){
	if (req.session && req.session.id && req.session.userId) {
		getPreferences(req.session.userId.toString(), function(assignments){
			res.send(assignments)
		})
	} else {
		res.send('not today')
	}
})


app.post('/add_assignment', function(req,res){console.log("add_assignment")
	if (req.session && req.session.id && req.session.userId) {
		req.body.repeating = ""
		addAssignment(req.session.userId, req.body)
	} else {
		res.redirect('/sign_in')
	}
})

app.post('/set_preferences', function(req, res){console.log('set_preferences')
	if (req.session && req.session.id && req.session.userId) {
		setPreferences(req.session.userId, req.body)
	} else {
		res.redirect('/sign_in')
	}
})

app.post('/sign_up', function(req, res){console.log('sign_up')
	userId = addUser(req.body)
	if(userId != -1){
		console.log('sign up worked')
		req.session.userId = userId
	}
})

app.post('/sign_in', function(req, res){ console.log('sign_in')
	if (req.body.email && req.body.password) {
	  	UserSchema.statics.authenticate(req.body.email, req.body.password, function(err, user){
			if(!(err || !user)){
				console.log('sign in worked')
				req.session.userId = user._id
				res.redirect('/website/index.html')
			}else{
				res.redirect('/website/login.html')
			}
		})
	}else{
		res.redirect('/website/login.html')
	}
})


app.get('/logout', function(req, res, next) {
  if (req.session) {
    // delete session object
    req.session.destroy(function(err) {
      if(err) {
        return next(err);
      } else {
        return res.redirect('/website/login.html');
      }
    });
  }
});


var server = app.listen(8000, function () {
    console.log("Listening on port %s...", server.address().port);
});

function populateDatabase(){
	var today = new Date()
	user1 = addUser({firstName: 'Arman', lastName: 'Aydemir', email: 'rr@rr.com', password:'woah', passwordConf:'woah'}, function(usr1_id){
		addAssignment(usr1_id.toString(), {completed:false, due: today, repeating:'', description:'test assignments', title:'test title',
			notifications: null, numhours:5, worktime:null}) //user is yell@yell.com with password yell
		addAssignment(usr1_id.toString(), {completed:false, due:  new Date(today.getFullYear(), today.getMonth(), today.getDate()+7), repeating:'', description:'test assignments 2', title:'test title 2',
				notifications: null, numhours:7, worktime:null})
		addEvent(usr1_id.toString(), {start: new Date(today.getFullYear(), today.getMonth(), today.getDate()+7), end: new Date(today.getFullYear(), today.getMonth(), today.getDate()+8), repeating:'', description:'test assignments 2', title:'test title 2',
				notifications: null})
	})
	
}

// populateDatabase()

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








