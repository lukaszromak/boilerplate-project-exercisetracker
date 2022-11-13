const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({"extended": false}));
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

let exerciseSchema = new mongoose.Schema({
  description: {type: String},
  duration: {type: Number},
  date: {
    type: Date,
    // `Date.now()` returns the current unix timestamp as a number
    default: Date.now
  },
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User' }
})
let Exercise = new mongoose.model("Exercise", exerciseSchema)

let userSchema = new mongoose.Schema({
  username: {type: String}
})
let User = new mongoose.model("User", userSchema)

const createUser = (username, done) => {
  let user = new User({username: username})
  user.save((err) =>{
    if(err) done(err, user)
    done(null, user)
  })
}

const findUser = (userId, done) => {
  User.findById(userId, (err, user) => {
    if(err) done(err, user)
    done(null, user)
  })
}

const findAllUsers = (done) => {
  User.find({}, (err, users) => {
    if(err) return done(err, users)
    done(null, users)
  })
}

const createExercise = (exercise, done) => {
  exercise.save((err) =>{
    if(err) done(err, exercise)
    done(null, exercise)
  })
}

const findUserExercises = (params, done) => {
  Exercise
    .find({
      user: params.user,
      date: { $gte: params.from, $lte: params.to}
    })
    .limit(params.limit)
    .exec((err, docs) => {
      if(err) done(err, docs)
      done(null, docs)
    })
}

app.post('/api/users', (req, res) => {
  createUser(req.body.username, (err, user) => {
    if(err) return console.log(err)
    res.json({username: user.username, _id:user._id}) 
  })
})

app.get('/api/users', (req, res) => {
  findAllUsers((err, users) => {
    if(err) return console.log(err)
    res.send(users)
  })
})

app.post('/api/users/:_id/exercises', (req, res) => {
  findUser(req.params._id, (err, user) => {
    if(err) return console.log(err)
    if(user == null) {
      res.json({})
    } else {
      if(req.body.date === "") req.body.date = undefined
      let exercise = new Exercise({
        user: user._id,
        description: req.body.description,
        duration: req.body.duration,
        date: req.body.date
      })
      createExercise(exercise, (err, doc) => {
        if(err) return console.log(err)
        res.json({
          username: user.username, 
          description: doc.description, 
          duration: doc.duration, 
          date: doc.date.toDateString(),
           _id: user._id
          })
      })
    }
  })
})

app.get('/api/users/:_id/logs', (req, res) => {
  findUser(req.params._id, (err, user) => {
    if(err) {
      res.send(err.toString())
    } else if(user == null) {
      res.json({})
    } else {
      let params = {
        user: user._id,
        limit: parseInt(req.query.limit),
        from: 0,
        to: Date.now()
      }
      let from = new Date(req.query.from)
      let to = new Date(req.query.to)
      if(from != "Invalid Date") params.from = from
      if(to != "Invalid Date") params.to = to
      findUserExercises(params, (err, exercises) => {
        if(err) {
          res.send(err.toString())
        } else {
          res.json({
            username: user.username,
            count: exercises.length,
            log: exercises.map(exercise => {
              const container = {
                description: exercise.description,
                duration: exercise.duration,
                date: exercise.date.toDateString()
              }
              return container
            })
          })
        }
      })
    }
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
