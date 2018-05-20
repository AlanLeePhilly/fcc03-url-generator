var express = require('express');
var app = express();
var mongoose = require('mongoose')
var shortid = require('shortid');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$&');
var validUrl = require('valid-url');
const options = {
  reconnectTries: Number.MAX_VALUE,
  poolSize: 10
};

mongoose.connect(process.env.MONGO_URL, options).then(
  () => {
    console.log("Database connection established!");
  },
  err => {
    console.log("Error connecting Database instance due to: ", err);
  }
);


// http://expressjs.com/en/starter/basic-routing.html
app.route('/new/:url(*)')
    .get( (req,res, next) => {
      MongoClient.connect(process.env.MONGO_URL, (err, client) => {
            if (err) {
              console.log("Unable to connect to server", err);
            } else {
              var db = client.db('fcc');
              //console.log("Connected to server");
              var collection = db.collection('url-shorter');
              var url = req.params.url;
              var host = req.get('host') + "/"

              //function to generate short link 
              var generateLink = function(db, callback) {
                //check if url is valid
                if (validUrl.isUri(url)){
                  collection.findOne({"url": url}, {"short": 1, "_id": 0}, (err, doc) =>{
                    if(doc != null){
                      res.json({
                      "original_url": url, 
                      "short_url":host + doc.short
                    });
                    }
                    else{
                       //generate a short code
                        var shortCode = shortid.generate();
                        var newUrl = { url: url, short: shortCode };
                        collection.insert([newUrl]);
                          res.json({
                            "original_url":url, 
                            "short_url":host + shortCode
                          });
                    }
                  });
                } 
                else {
                    console.log('Not a URI');
                    res.json({
                      "error": "Invalid url"
                    })
                }
              };

              generateLink(db, function(){
                db.close();
              });
            }
      }); 
    });

//given short url redirect to original url
app.route('/:short')
    .get( (req,res, next) => {
  MongoClient.connect(process.env.MONGO_URL, (err,client) => {
    if (err) {
          console.log("Unable to connect to server", err);
        } else {
          var db = client.db('fcc');
          var collection = db.collection('url-shorter');
          var short = req.params.short;
          
          //search for original url in db and redirect the browser
          collection.findOne({"short": short}, {"url": 1, "_id": 0}, (err, doc) => {
            if (doc != null) {
              res.redirect(doc.url);
            } else {
              res.json({ error: "Shortlink not found in the database." });
            };
          });
        }
    client.close();
  });
});

// Respond not found to all the wrong routes
app.use(function(req, res, next){
  res.status(404);
  res.type('txt').send('Not found');
});

// Error Middleware
app.use(function(err, req, res, next) {
  if(err) {
    res.status(err.status || 500)
      .type('txt')
      .send(err.message || 'SERVER ERROR');
  }  
})

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
