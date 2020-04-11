const express = require('express');
const sqlite3 = require('sqlite3');
const session = require('express-session');
const bodyParser = require('body-parser');
const format = require('string-format');
const jsonParser = bodyParser.json();
const sha256 = require('sha-256-js');
const app = express();
const router = express.Router();
const port = 5000
var path = require('path');
let ejs = require('ejs');
const CSV=require("csv-string");
const textBody=bodyParser.text();


app.use(bodyParser.urlencoded({extended : true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'src')));

app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));

const db = new sqlite3.Database( __dirname + '/users.db',
  function(err){
    if(!err){
      console.log('opened db');
      initDB();
    }
    else{
      console.log('cannot open db');
    }
  });

function initDB(){
  db.serialize(function(){
    db.run(`
      CREATE TABLE IF NOT EXISTS users(
      id INTEGER AUTO_INCREMENT PRIMARY KEY,
      email TEXT NOT NULL,
      sha256_pw text NOT NULL,
      usertype BOOLEAN NOT NULL
    )`);

  });
}

// Checks authorization when user tries to log in
app.post('/auth', function(request, response){
  var email = request.body.email;
  var password = request.body.password;

  if (email && password){
    db.get(`SELECT * FROM users WHERE email = ?`,
      [email],
      function(err, row){
        if (!err){
          if (sha256(password) == row.sha256_pw){
            request.session.loggedin = true;
            request.session.email = email;
            response.redirect('/mySheets');
          }else{
            response.send('Incorrect Email address or Password!');
          }
        }
        response.end();
    });
  }else{
    response.send('Please register to login!');
  }
});

//
app.post('/register', function(req, res){
  let newAccount = req.body;
  console.log("---------");
  console.log(req.body.email);
  console.log(req.body.password);
  // Check if email is taken
  db.get(`SELECT * FROM users WHERE email = ?`,
    [req.body.email],
  function(err, row){
    if (!err){
      if(row){
        // email is already registered
        console.log("User name is already taken");
      }else{
        // email is not registered yet
        let newPass = sha256(req.body.password);
        let newRow = [req.body.email, sha256(req.body.password), false];
        console.log(newRow);
        // Add new account into database
        db.run(`INSERT INTO users(email, sha256_pw, usertype) VALUES(?,?,?)`, newRow, (err) =>{
          if(err){
            console.log(err);
          }else{
            console.log("Added to database");
            res.redirect('/login');
          }
        });

      }
    }else{
      console.log(err);
    }

  });
});

app.post('/mySheets', function(req, res){
  
  let newAccount = req.body;
  

  // Check if email is taken
  db.get(`SELECT * FROM sheets WHERE name = ?`,
    [req.body.sheetName],
  function(err, row){
    if (!err){
      if(row){
        //Sheet name is already taken
        console.log("Sheet name is already taken");
      }else{
        //Sheet name is new
   
        let newRow = [req.body.sheetName, req.body.rowNum, req.body.colNum, req.session.email, req.body.shareStat, "Empty"];
        console.log(newRow);
        // Add new sheet into sheets table in database
        db.run(`INSERT INTO sheets(name, row, col, creator, status, sheet) VALUES(?,?,?,?,?,?)`, newRow, (err) =>{
          if(err){
            console.log(err);
          }else{
            console.log("Sheet added to database");
            res.redirect('/mySheets');
            
          }
        });

      }
    }else{
      console.log(err);
    }

  });
});
app.get('/login', function (req, res) {
  res.sendFile(path.join(__dirname+'/proj/src/login.html'));
});

app.get('/register', function (req, res) {
  res.sendFile(path.join(__dirname+'/proj/src/register.html'));
});
app.get('/charts', function (req, res) {
  res.sendFile(path.join(__dirname+'/proj/src/charts.html'));
});


app.get('/sheet/:name', function(req, res) {
  const name = req.params.name;
  db.get('SELECT sheet FROM sheets where name = ?', [name],
      function( err, row ) {
          if ( !err ) {
              res.send( row.sheet ); // already a string
              console.log( 'sending', row.sheet );
          }
          else {
              res.send( {err:err} );
          }
      }
  );

 


});



app.get('/sheet-list', function(req, res) {
  db.all('SELECT name FROM sheets', [],
      function( err, rows ) {
          if ( !err ) {
              const names = rows.map( (x) => x.name );
              res.send( names ); // already a string
              console.log( 'sending',  names );
          }
          else {
              res.send( {err:err} );
          }
      }
  );
});

app.delete('/sheet/:name', function(req, res) {
  const name = req.params.name;
  db.run('DELETE FROM sheets WHERE name = ?', [name],
      function( err, row ) {
          if ( !err ) {
              res.send( { ok: true} ); 
          }
          else {
              res.send( {err:err} );
          }
      }
  );
});

app.put( '/sheet/:name', jsonParser, (req,res) => {
  const name = req.params.name;

  const values = req.body;
  console.log( 'Received sheet', values );
  
  const strValues = JSON.stringify( values );

  db.run(`UPDATE sheets SET sheet = ? WHERE name= ?`,
      [strValues, name],
      function(err) {
          if (!err) {
              res.send( {ok:true} ); 
          }
          else {
              res.send( {ok:false} ); // converts to JSON
          }
      }
  );
});

app.post('/deleteuser', function(req,res){
  var user = req.body;
  console.log("User deleted:" + user.email);
  let sql = `DELETE FROM users WHERE email = ?`;

  db.run(sql, user.email, function(err){
    if(err){
      return console.log(err.message);
    }
    console.log('Removed user from users.');
  });
});

app.post('/deleteSheet', function(req,res){
  var mySheet = req.body;
  console.log("Sheet deleted:" + mySheet.name);
  let sql = `DELETE FROM sheets WHERE name = ?`;

  db.run(sql, mySheet.name, function(err){
    if(err){
      return console.log(err.message);
    }
    console.log('Removed sheet from sheets.');
  });
});




app.get('/mySheets', function (req, res) {
  
  `SELECT email FROM users`

    var un;
    un = req.session.email;
 

  
    let sql = `SELECT email FROM users WHERE email = ?`;
  
   
  
    db.all(sql, [un], function(err, rows) {
      if (err) {
        return console.error(err.message);
      }
    });
  var mySheet = [];
  var sn, cr, stat, tx;
  let sql2 = `SELECT name, row, col, creator, status FROM sheets`;

  db.all(sql2, [], function(err, rows) {
    if (err) {
      return console.error(err.message);
    }
    rows.forEach((row) => {
   
      sn = row.name;
      cr = row.creator;
      stat=row.status;
      r=row.row;
      c=row.col;
    
      
        if(stat==1){
          stat="Shared";
        }
        else{
          stat="Not shared";
        }


      if(row.creator==un){

      mySheet.push({
        name: sn,
        row:r,
        column:c,
        status:stat
        
       
         });

       }
    });
  });

    setTimeout(function(){
      console.log("un = " + un+" sn="+sn );
      res.render(path.join(__dirname+'/proj/src/mySheets.ejs'), {
        user: un,
        mySheetList:mySheet
      
      });
    },100)
  });


app.get('/editSheets', function (req, res) {
  
  `SELECT email FROM users`

    var un;
    un = req.session.email;
  
    let sql = `SELECT email FROM users WHERE email = ?`;
  
    console.log("Searching database ...");
  
    db.all(sql, [un], function(err, rows) {
      if (err) {
        return console.error(err.message);
      }
    });
  var mySheet = [];
  var sn, cr, stat, tx;
  let sql2 = `SELECT name, row, col, creator, status FROM sheets`;

  db.all(sql2, [], function(err, rows) {
    if (err) {
      return console.error(err.message);
    }
    rows.forEach((row) => {
   
      sn = row.name;
      cr = row.creator;
      stat=row.status;
      r=row.row;
      c=row.col;
    
      
        if(stat==1){
          stat="Shared";
        }
        else{
          stat="Not shared";
        }


      if(row.creator==un){

      mySheet.push({
        name: sn,
        row:r,
        column:c,
        status:stat
        
       
         });

       }
    });
  });

    setTimeout(function(){
      console.log("un = " + un+"sn="+sn );
      res.render(path.join(__dirname+'/proj/src/editSheets.ejs'), {
        user: un,
        mySheetList:mySheet
      
      });
    },100)
  });



app.get('/admin', function(req, res){


  var users = [];
  var un, ts, adm;
  let sql = `SELECT email, usertype FROM users`;

  db.all(sql, [], function(err, rows) {
    if (err) {
      return console.error(err.message);
    }
    rows.forEach((row) => {
   
      un = row.email;
      adm = row.usertype;

      users.push({
        email: un,
        admin: adm
      });
    });
  });

  setTimeout(function(){
    res.render(path.join(__dirname+'/proj/src/admin.ejs'),{
      adminUserList: users
    });
  },100)
});



app.get('/profile', function (req, res) {

`SELECT email FROM users`

  var un;
  un = req.session.email;

  let sql = `SELECT email FROM users WHERE email = ?`;

  console.log("Searching database ...");

  db.all(sql, [un], function(err, rows) {
    if (err) {
      return console.error(err.message);
    }

  });

  setTimeout(function(){
    console.log("un = " + un);
    res.render(path.join(__dirname+'/proj/src/profile.ejs'), {
      user: un,
     
    });
  },100)
});


  app.get('/sharedSheets', function (req, res) {

    `SELECT email FROM users`
    
      var un;
      un = req.session.email;
    
      let sql = `SELECT email FROM users WHERE email = ?`;
    
      console.log("Searching database ...");
    
      db.all(sql, [un], function(err, rows) {
        if (err) {
          return console.error(err.message);
        }
    
      });
      var mySheet = [];
  var sn, cr, stat, tx;
  let sql2 = `SELECT name, row, col, creator, status FROM sheets`;

  db.all(sql2, [], function(err, rows) {
    if (err) {
      return console.error(err.message);
    }
    rows.forEach((row) => {
   
      sn = row.name;
      cr = row.creator;
      stat=row.status;
      r=row.row;
      c=row.col;
    
      
        if(stat==1){
          stat="Shared";
        }
        else{
          stat="Not shared";
        }

       if(stat=="Shared") {

      mySheet.push({
        name: sn,
        row:r,
        column:c,
        status:stat,
        creator:cr
        
       
         });
        }

       
    });
  });
    
      setTimeout(function(){
        console.log("un = " + un);
        res.render(path.join(__dirname+'/proj/src/sharedSheets.ejs'), {
          user: un,
          mySheetList:mySheet
         
        });
      },100)
    });

app.post('/profile', function(req,res ){

  console.log('Updating in database ...');
  var newPass = req.body;
  console.log('New pass = ' + newPass.password);
  console.log('user logged in = '+ req.session.email);

  let hash = sha256(req.body.password);

  let data = [hash, req.session.email];

  let sql = `UPDATE users
              SET sha256_pw = ?
              WHERE email = ?`;

  db.run(sql, data, function(err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Row(s) updated: ${this.changes}`);
    res.redirect('/profile');
    

  });

});
app.post('/changePassword', function(req,res ){

  console.log('Updating in database ...');
  var ne = req.body;

  console.log('User = ' + ne.email);
  console.log('New password = ' + ne.newP);


  let hash = sha256(req.body.newP);

  let data = [hash, req.body.email];

  let sql = `UPDATE users
              SET sha256_pw = ?
              WHERE email = ?`;

  db.run(sql, data, function(err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Row(s) updated: ${this.changes}`);
    res.redirect('/admin');
    
   }
  );

});

app.post('/changeName', function(req,res ){

  console.log('Updating in database ...');
  var ne = req.body;

  console.log('Old name = ' + ne.name);
  console.log('New name = ' + ne.newN);


  db.run(`UPDATE sheets SET name= ? WHERE name= ?`,
        [ne.newN,ne.name],
        function(err) {
            if (!err) {
                res.send( {ok:true} );
            }
            else {
                res.send( {ok:false} ); 
            }
        }
    );

  

});


app.post('/changeStatus', function(req,res ){

  console.log('Updating in database ...');
  var ne = req.body;

  console.log(req.body);
  console.log('Name of sheet = ' + ne.name);
  console.log('New status = ' + ne.newS);

  db.run(`UPDATE sheets SET status= ? WHERE name= ?`,
        [ne.newS,ne.name],
        function(err) {
            if (!err) {
                res.send( {ok:true} );
            }
            else {
                res.send( {ok:false} ); 
            }
        }
    );

  

});

app.put( '/csv-export', jsonParser, (req,res) => {
  const values = req.body;
  console.log( 'csv sheet', values );
  let csv = ''
  for( let row of values ) {
      csv += CSV.stringify( row ); 
  }
  res.set('Content-Type', 'text/plain')
  res.send( csv );
});

// note the textBody middleware to access the text
app.put( '/csv-import/:name', textBody, (req,res) => {
  const name = req.params.name;
  const sheet = [];
  console.log('importing', req.body);
  // parse the CSV
  CSV.forEach(req.body, ',', function(row, index) {
      sheet.push( row );
  });
  const strValues = JSON.stringify( sheet );
  console.log("string values: "+ strValues);
  // insert it into the data base
  db.run(`UPDATE sheets SET sheet= ? WHERE name=?`,
      [strValues,name],
      function(err) {
          if (!err) {
              res.send( {ok:true} ); // converts to JSON
          }
          else {
              res.send( {ok:false} ); // converts to JSON
          }
      }
  );
});

app.get( '/csv-export/:name', (req,res) => {
  const name = req.params.name;
  db.get('SELECT sheet FROM sheets where name = ?', [name],
      function( err, row ) {
          if ( !err ) {
              // convert to javascript object
              let values = JSON.parse( row.sheet );
              let csv = ''
              for( let row of values ) {
                  csv += CSV.stringify( row ); 
              }
              res.set('Content-Type', 'text/plain')
              // tell the browsers to down load to a file
              res.set('Content-Disposition',
                  `attachment; filename="${name}.csv"`);
              res.send( csv );
          }
          else {
              res.status(404).send("not found");
          }
      }
  );
});

// note the textBody middleware to access the text
app.put( '/csv-import/:name', textBody, (req,res) => {
  const name = req.params.name;
  const sheet = [];
  console.log('importing', req.body);
  // parse the CSV
  CSV.forEach(req.body, ',', function(row, index) {
      sheet.push( row );
  });
  const strValues = JSON.stringify( sheet );
  // insert it into the data base
  db.run(`INSERT OR REPLACE INTO sheets (name,sheet) VALUES(?,?)`,
      [name,strValues],
      function(err) {
          if (!err) {
              res.send( {ok:true} ); // converts to JSON
          }
          else {
              res.send( {ok:false} ); // converts to JSON
          }
      }
  );
});


app.use(express.static('proj/src/', {index: 'login.html'})) 

app.listen(port, () => {
  console.log('App listening on port ', port);
});
