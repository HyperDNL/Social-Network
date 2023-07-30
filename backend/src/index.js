import app from "./app.js";

// Server
app.listen(app.get("port"));
console.log(`Server on port ${app.get("port")}`);
