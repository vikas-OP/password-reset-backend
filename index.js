const express = require("express");
const crypto = require("crypto");
const mongodb = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { response } = require("express");
const app = express();
const mongoClient = mongodb.MongoClient;
const url = "mongodb://localhost:27017";
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);

app.post("/register", async (req, res) => {
  try {
    let email = req.body.email;
    let password = req.body.password;
    var client = await mongoClient.connect(url, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
    const db = client.db("password_reset");
    let user = await db.collection("users").find({ email: email }).toArray();
    if (user.length !== 0) {
      res.json({
        message: "user already registered",
      });
      client.close();
      return;
    } else {
      let hashPass = await bcrypt.hash(password, 10);
      let userData = {
        email: email,
        password: hashPass,
      };
      await db.collection("users").insertOne(userData);
      client.close();
      res.json({
        message: "successfully registered",
      });
    }
  } catch (error) {
    console.log(error);
    if (client) {
      client.close();
    }
    res.status(500).json({
      message: "something went wrong",
    });
  }
});

app.put("/resetpassword/:randomString", async (req, res) => {
  try {
    let randomString = req.params.randomString;
    let newPassword = req.body.password;
    var client = await mongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = client.db("password_reset");
    let user = await db
      .collection("users")
      .find({ randomString: randomString })
      .toArray();
    if (user.length === 0) {
      client.close();
      res.json({
        status: "failure",
        message: "invalid string",
      });
    } else {
      let hashPass = await bcrypt.hash(newPassword, 10);
      await db
        .collection("users")
        .findOneAndReplace(
          { randomString: randomString },
          { email: user[0].email, password: hashPass }
        );
      client.close();
      res.json({
        status: "success",
        message: "password changed",
      });
    }
  } catch (error) {
    if (client) {
      client.close();
    }
    console.log(error);
    res.status(500).json({
      message: "something went wrong",
    });
  }
});

app.post("/forgotpassword", async (req, res) => {
  try {
    let email = req.body.email;
    var client = await mongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = client.db("password_reset");
    let user = await db.collection("users").find({ email: email }).toArray();
    if (user.length == 0) {
      client.close();
      res.status(400).json({
        status: "failure",
        message: "user not in database",
      });
    } else {
      let randomString = crypto.randomBytes(64).toString("hex");
      console.log(randomString);
      await db
        .collection("users")
        .findOneAndUpdate(
          { email: email },
          { $set: { randomString: randomString } }
        );
      client.close();
      let randomUrl = `http://localhost:3000/resetpassword/${randomString}`;
      let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "noreplyvikaspassreset",
          pass: "passwordreset123",
        },
      });
      var mailOptions = {
        from: "noreplyvikaspassreset",
        to: `${email}`,
        subject: "Password reset using nodeJS",
        html: `<p>To reset your password for the account you created in vikas's password reset project please <a href = ${randomUrl}>click here</a> and enter the new password.
        </p>`,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          res.json({
            status: "success",
            message: "email sent",
          });
        }
      });
    }
  } catch (error) {
    if (client) {
      client.close();
    }
    console.log(error);
    res.status(500).json({
      message: "something went wrong",
    });
  }
});

app.get("/users", async (req, res) => {
  try {
    var client = await mongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = client.db("password_reset");
    const users = await db.collection("users").find().toArray();
    client.close();
    res.json({
      message: "success",
      data: users,
    });
  } catch (error) {
    console.log(error);
    if (client) {
      client.close();
    }
    res.status(500).json({
      message: "something went wrong",
    });
  }
});

app.listen(PORT, () => console.log("server started"));
