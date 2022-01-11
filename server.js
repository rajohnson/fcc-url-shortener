require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
var bodyParser = require('body-parser');
const dns = require('dns');
const {URL} = require('url');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use('/api/shorturl', bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// database
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// value is the last value used.
const indexSchema = new mongoose.Schema({
  index: Number
});

let Index = mongoose.model('Index', indexSchema);

function nextIndex(handler) {
  Index.exists({}, (err, exists) => {
    if(err) {
      console.log(err);
    }
    if(exists !== null) {
      // get value and update
      Index.findOneAndUpdate(
        {}, 
        { $inc: {'index': 1 } },
        {new: true }, 
        (err, value) => {
          handler(value.index);
        }
      )
    } else {
      // create with value 0
      Index.create({index: 1}, (err, result) => {
        if(err) {
          console.log(err);
        }
        handler(result.index)
      });
    }
  });
}

// full is the url provided. short is the short id number assigned.
const urlSchema = new mongoose.Schema({
  full: String,
  short: {type: Number, unique: true, required: true}
});

let UrlSet = mongoose.model('UrlSet', urlSchema);

function getShort(short, callback) {
  UrlSet.findOne({short: short}, (err, result) => {
    if(err) {
      return callback(err, null);
    } else if(result === null) {
      return callback(true, null);
    }
    return callback(null, result.full);
  })
}

function saveUrl(urlString, callback) {
  // save the url and return short it is saved under
  const short = nextIndex((index) => {
    UrlSet.create({full: urlString, short: index}, (err, res) => {
      if(err) {
        return console.error(err);
      }
      callback(res.full, res.short);
    });
  });
}

// endpoint for shorturl
app.post('/api/shorturl', function(req, res) {
  const urlString = req.body.url;
  try {
    var urlObject = new URL(urlString);
  } catch(e) {
    console.log('bad input: ', e);
    return res.json({ error: 'invalid url' });
  }
  if(urlObject.protocol === 'http:' || urlObject.protocol === 'https:') {
    dns.lookup(urlObject.host, (err, addresses) => {
      if(err) {
        return res.json({ error: 'invalid url' });
      }
      if(addresses === undefined) {
        res.json({ error: 'invalid url' });
      } else {
        // address is good
        saveUrl(urlString, (full, short) => {
          res.json({original_url: full, short_url: short});
        });
      }
    });
  } else {
    res.json({ error: 'invalid url' });
  }
});

app.get('/api/shorturl/:id', function(req, res) {
  const short = req.params.id;
  getShort(short, (err, full) => {
    if(err) {
      res.json({ error: `invalid id ${short}` });
    } else {
      res.redirect(full);
    }
  });
});

// listen
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

