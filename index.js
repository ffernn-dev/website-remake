import express from "express";
import path from "path";
const __dirname = import.meta.dirname;

const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "public/index.html"));
});
app.listen(8080, () =>
  console.log(
    "Server is running on Port 5000, visit http://localhost:8080/ or http://127.0.0.1:8080 to access your website"
  )
);
