const express = require("express");
const app = express();
const session = require("express-session");
const bcrypt = require("bcrypt");
const pool = require("./dbPool.js");


app.engine('html', require('ejs').renderFile);
app.use(express.static("public"));

app.set("view engine", "ejs");

app.use(session({
    secret: "top secret!",
    resave: true,
    saveUninitialized: true
}));

app.use(express.urlencoded({extended: true}));

//routes
app.get("/", function(req, res) {
    res.render("index.ejs", {"authenticatied": (req.session.authenticatied ? true : false)});
});

app.get("/flight", function(req, res) {
    res.render("flight.ejs", {"authenticatied": (req.session.authenticatied ? true : false)});
});

app.get("/hotel", function(req, res) {
    res.render("hotel.ejs", {"authenticatied": (req.session.authenticatied ? true : false)});
});

app.get("/contact", function(req, res) {
   res.render("contact.ejs", {"authenticatied": (req.session.authenticatied ? true : false)});
});


// ****************************************************************
app.get("/admin", isAuthenticated, function(req, res) {
    res.render("admin.ejs", {
        "authenticatied": (req.session.authenticatied ? true : false)        
    }); 
});

app.get("/admin/flights", isAuthenticated, function (req, res) {
    let success,
        message;
    if (typeof (req.session.deleting_status) == 'object') {
        success = req.session.deleting_status.success,
        message = req.session.deleting_status.message;
        delete (req.session.deleting_status);
    }
    
    pool.query("SELECT * FROM flights", function (err, data) {
        if (err) return console.log(err);
        res.render("admin/flights/index.ejs", {
            authenticatied: (req.session.authenticatied ? true : false),
            flights: data,
            dtm: dtm,
            success: success,
            message: message
        });
    });
});

app.get("/admin/flights/add", isAuthenticated, function (req, res) {
    res.render("admin/flights/add.ejs");
});

app.post("/admin/flights/add", isAuthenticated, function (req, res) {
    if (!req.body) return res.sendStatus(400);
    const flight_num = req.body.flight_num,
        airline = req.body.airline,
        departure_timestamp = req.body.departure_timestamp,
        arrival_timestamp = req.body.arrival_timestamp,
        departure_airport = req.body.departure_airport,
        arrival_airport = req.body.arrival_airport,
        layovers = req.body.layovers,
        price = req.body.price;
    pool.query(
        "INSERT INTO flights SET flight_num=?, airline=?, departure_timestamp=?, arrival_timestamp=?, departure_airport=?, arrival_airport=?, layovers=?, price=?",
        [flight_num, airline, departure_timestamp, arrival_timestamp, departure_airport, arrival_airport, layovers, price],
        function (err, data) {
            if (err) {
                req.session.saving_status = {
                    success: 0,
                    message: `Errors during deleting: ${err}`
                }
            } else {
                req.session.saving_status = {
                    'success': 1,
                    'message': `Flight #${flight_num} saved successfully!`
                }
            }
            res.redirect(`/admin/flights/edit/${flight_num}`)
        }
    );
});

app.get("/admin/flights/edit/:id", isAuthenticated, function (req, res) {
    let success,
        message;
    if (typeof (req.session.saving_status) == 'object') {
        success = req.session.saving_status.success,
        message = req.session.saving_status.message;
        delete(req.session.saving_status);
    }
    pool.query("SELECT * FROM flights WHERE flight_num=?", [req.params.id], function (err, data) {
        if (err) return console.log(err);
        res.render("admin/flights/edit.ejs", {
            flight: data[0],
            dtm: dtm,
            success: success,
            message: message
        });
    });
});

app.post("/admin/flights/edit/:id", isAuthenticated, function (req, res) {
    if (!req.body) return res.sendStatus(400);
    const flight_num = req.params.id,
        airline = req.body.airline,
        departure_timestamp = req.body.departure_timestamp,
        arrival_timestamp = req.body.arrival_timestamp,
        departure_airport = req.body.departure_airport,
        arrival_airport = req.body.arrival_airport,
        layovers = req.body.layovers,
        price = req.body.price;
    pool.query(
        "UPDATE flights SET airline=?, departure_timestamp=?, arrival_timestamp=?, departure_airport=?, arrival_airport=?, layovers=?, price=? WHERE flight_num=?", 
        [airline, departure_timestamp, arrival_timestamp, departure_airport, arrival_airport, layovers, price, flight_num], 
        function (err, data) {
            if (err) {
                req.session.saving_status = {
                    success: 0,
                    message: `Errors during deleting: ${err}`
                }
            } else {
                req.session.saving_status = {
                    'success': 1,
                    'message': `Flight #${flight_num} saved successfully!`
                }
            }
            res.redirect(`/admin/flights/edit/${flight_num}`)
        }
    );
});

app.get("/admin/flights/delete/:id", isAuthenticated, function (req, res) {
    pool.query("DELETE FROM flights WHERE flight_num=?", [req.params.id], function (err, data) {
        if (err) {
            req.session.deleting_status = {
                'success': 0,
                'message': `Errors during deleting: ${err}`
            }
        } else {
            req.session.deleting_status = {
                'success': 1,
                'message': `Flight #${req.params.id} deleted successfully!`
            }
        }
        res.redirect(`/admin/flights`)
    });
});

app.get("/admin/flights/report", isAuthenticated, function (req, res) {

    pool.query("SELECT COUNT(*) as FLIGHTS_COUNT, AVG(price) as AVG_PRICE FROM flights", function (err, data) {
        if (err) return console.log(err);
        res.render("admin/flights/report.ejs", {
            data: data[0],
        });
    });
});



app.get("/login", function(req, res) {
   res.render("login.ejs"); 
});

app.post("/login", async function(req, res) {
    let username = req.body.username;
    let password = req.body.password;
    
    let hashedPwd = "$2a$10$06ofFgXJ9wysAOzQh0D0..RcDp1w/urY3qhO6VuUJL2c6tzAJPfj6";
    
    // let result = await getUserinfo(username);
    let result = await checkUsername(username);
    // console.dir(result);
    // let hashedPwd = "";
    
    // if (result.length > 0) {
    //     hashedPwd = result[0].password;
    // }
    
    // let passwordMatch = await checkPassword(password, hashedPwd);
    // console.log("passwordMatch: " + passwordMatch);
    
    if (username == "admin" && await checkPassword(password, hashedPwd)) {
    // if (await checkPassword(password, hashedPwd)) {
        req.session.authenticatied = true;
        req.session.username = username;
        res.redirect("/admin");
    } else {
        res.render("login", {"loginError":true});
    }
});

app.get("/myAccount", isAuthenticated, async function(req, res) {
    let users = await getUserInfo(req.session.username);
    console.dir(users);
    
    let flights = await getFlightReservation(req.session.username);
    console.dir(flights);
    
    res.render("account", {"authenticatied": (req.session.authenticatied ? true : false), "users":users, "flights":flights}); 
});

app.get("/logout", function(req, res) {
    req.session.authenticatied = false;
    req.session.username = "";
    req.session.destroy();
    res.redirect("/");
});

app.get("/about", function(req, res) {
    res.render("about", {"authenticatied": (req.session.authenticatied ? true : false)}); 
});

app.get("/covid19", function(req, res) {
   res.render("covid.ejs"); 
});

app.get("/api/getReservation", function(req, res) {
    res.send("Covid-19 page will be here");
});


// app.get("/api/getReservation", function(req, res) {
//     console.log(req.query.flightNumber);
    
//     let sql = "SELECT * FROM flights WHERE flight_num = ?";
//     let sqlParams = [req.query.flightNumber];  
//     pool.query(sql, sqlParams, function (err, rows, fields) {
//         if (err) throw err;
//         console.log(rows);
//         res.send(rows);
//     });
// });

const dtm = (timestamp) => {  // javascript to mysql datetime convert
    let date = new Date(timestamp);
    return date.getFullYear() + '-' +
        ('00' + (date.getMonth() + 1)).slice(-2) + '-' + ('00' + date.getDate()).slice(-2) + ' ' +
        ('00' + date.getHours()).slice(-2) + ':' + ('00' + date.getMinutes()).slice(-2); 
} 

function checkPassword(password, hashedValue) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(password, hashedValue, function(err, result) {
            console.log("Result: " + result);
            resolve(result);
        })
    })
}

function isAuthenticated(req, res, next) {
    // console.log('check auth: ', req.session.authenticatied);
    if (!req.session.authenticatied) {
        res.redirect("/login");
    } else {
        next();
    }
}

function checkUsername(username) {
    return new Promise(function(resolve, reject) {
        let sql = "SELECT * FROM users WHERE username = ? ";
        let sqlParams = [username];
        pool.query(sql, sqlParams, function (err, rows, fields) {
            if (err) throw err;
            console.log("UserName Rows found: " + rows.length);
            resolve(rows);
        });
    });
}

function getUserInfo(username) {
    return new Promise(function(resolve, reject) {
        let sql = "SELECT * FROM users WHERE username = ? ";
        let sqlParams = [username];
        pool.query(sql, sqlParams, function (err, rows, fields) {
            if (err) throw err;
            console.log("UserName Rows found: " + rows.length);
            resolve(rows);
        });
    });
}

function getFlightReservation(username) {
    return new Promise(function(resolve, reject) {
        let sql = "SELECT * FROM flights JOIN users ON (flights.user_id = users.user_id) and users.username = ?";
        let sqlParams = [username];
        pool.query(sql, sqlParams, function (err, rows, fields) {
            if (err) throw err;
            console.log("Fights Rows found: " + rows.length);
            resolve(rows);
        });
    });
}

function getHotelReservation(username) {
    return new Promise(function(resolve, reject) {
        let sql = "SELECT * FROM hotels JOIN users ON (flights.user_id = users.user_id) and users.username = ?";
        let sqlParams = [username];
        pool.query(sql, sqlParams, function (err, rows, fields) {
            if (err) throw err;
            console.log("Hotels Rows found: " + rows.length);
            resolve(rows);
        });
    });
}

//starting server
app.listen(process.env.PORT, process.env.IP, function(){
    console.log("Express server is running...");
});