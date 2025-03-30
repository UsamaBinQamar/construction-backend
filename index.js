// Import required modules
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const multer = require("multer");
const xlsx = require("xlsx");

// Initialize app and middleware
const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));

// MongoDB configuration
const uri =
  "mongodb+srv://testusername:testuserpassword@cluster0.nfgli.mongodb.net/construction_db?retryWrites=true&w=majority&appName=Cluster0";
//const uri = "mongodb://localhost:27017/";
const client = new MongoClient(uri);
const dbName = "construction_db";
let db;

// JWT Secret Key
const JWT_SECRET = "your_jwt_secret_key";

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    db = client.db(dbName);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}
connectToMongoDB();

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token." });
    }
    req.user = user;
    next();
  });
}

// Middleware to check user roles
function authorizeRoles(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
}

// Define API routes
app.get("/", async (req, res) => {
  try {
    // Respond with the retrieved records
    res.json({
      success: true, // Return the list of image links
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while fetching images");
  }
});
// 1. Create a new user
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Specify the folder where uploaded files are saved
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname); // Create a unique filename
  },
});

const upload = multer({ storage });
// Route to handle user creation with file upload
app.post("/store-user", upload.single("picture"), async (req, res) => {
  try {
    const {
      username,
      password,
      role,
      phone,
      name,
      address,
      postalCode,
      city,
      startDate,
      projectsId,
      companyId,
      isProjectManager,
      type,
      mainId,
    } = req.body;

    // Hash the password
    //const hashedPassword = await bcrypt.hash(password, 10);

    // Get the file information
    const picture = req.file ? req.file.filename : null;

    // Insert the data into the database
    const result = await db.collection("users").insertOne({
      username,
      password,
      role,
      phone,
      name,
      address,
      postalCode,
      city,
      startDate,
      picture, // Store the filename of the uploaded image
      projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
      companyId,
      isProjectManager,
      type,
      mainId,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// 2. Get all users
app.get(
  "/get-usersbb",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const users = await db
        .collection("users")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }
);

app.get(
  "/get-advisors",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const { companyId, projectId } = req.query; // Get query parameters

      // Build the query object dynamically
      const query = { role: "Advisor" };
      if (companyId && companyId !== "null") {
        query.companyId = companyId;
      }

      if (projectId && projectId !== "null") {
        // Convert comma-separated projectId to an array and apply the $in operator
        query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
      }

      const users = await db.collection("users").find(query).toArray();

      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch advisors" });
    }
  }
);
app.get(
  "/get-inputs",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const { companyId, projectId, profession } = req.query; // Get query parameters
      const query = {};
      if (companyId && companyId !== "null") {
        query.companyId = companyId;
      }

      if (projectId && projectId !== "null") {
        // Convert comma-separated projectId to an array and apply the $in operator
        query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
      }
      if (profession) {
        query.profession = profession;
      }

      const users = await db.collection("inputs").find(query).toArray();

      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch inputs" });
    }
  }
);
app.get(
  "/get-standards",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const { companyId, projectId, profession } = req.query; // Get query parameters
      const query = {};
      if (companyId && companyId !== "null") {
        query.companyId = companyId;
      }

      if (projectId && projectId !== "null") {
        // Convert comma-separated projectId to an array and apply the $in operator
        query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
      }
      if (profession) {
        query.profession = profession;
      }

      const users = await db.collection("standards").find(query).toArray();

      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch standards" });
    }
  }
);
app.get("/get-superadmins", async (req, res) => {
  try {
    const query = { role: "Superadmin" };

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Superadmins" });
  }
});
app.get("/get-safety", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    const query = { role: "Safety Coordinator" };
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }

    if (projectId && projectId !== "null") {
      // Convert comma-separated projectId to an array and apply the $in operator
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
    }

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Safety Coordinators" });
  }
});

app.get("/get-cons", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    const query = { role: "Construction Manager" };
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }

    if (projectId && projectId !== "null") {
      // Convert comma-separated projectId to an array and apply the $in operator
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
    }

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Construction Managers" });
  }
});

app.get("/get-mains", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    const query = { role: "Main Constructor" };
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }

    if (projectId && projectId !== "null") {
      // Convert comma-separated projectId to an array and apply the $in operator
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
    }

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Main Constructors" });
  }
});

app.get("/get-inspectors", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    const query = { role: "Inspector" };
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }

    if (projectId && projectId !== "null") {
      // Convert comma-separated projectId to an array and apply the $in operator
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
    }

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Inspectors" });
  }
});

app.get("/get-subs", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    const query = { role: "Sub Contractor" };
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }

    if (projectId && projectId !== "null") {
      // Convert comma-separated projectId to an array and apply the $in operator
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
    }

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Sub Contractors" });
  }
});

// GET /get-workers?companyId=123&projectId=999&professionsId=abc,xyz
app.get("/get-workers", async (req, res) => {
  try {
    const { companyId, projectId, professionsId } = req.query;

    // Base query: fetch only "Workers"
    const query = { role: "Worker" };

    // If we have a valid companyId, add to query
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }

    // If we have a valid projectId, split them into an array
    // e.g. projectId=111,222 -> [ "111", "222" ]
    if (projectId && projectId !== "null") {
      const projectArr = projectId.split(",").map((p) => p.trim());
      query.projectsId = { $in: projectArr };
    }

    // If we have professionsId, find all groups that match those professions
    if (professionsId && professionsId !== "null") {
      const professionsArr = professionsId.split(",").map((p) => p.trim());

      // groups contain: { professionId, workerId, ... }
      const groupDocs = await db
        .collection("groups")
        .find({
          professionId: { $in: professionsArr },
        })
        .toArray();

      // Extract workerId from each group document
      const workerIds = groupDocs.map((doc) => doc.worker).filter(Boolean);

      // If no matching workers in groups, force an empty result
      // Otherwise, filter by _id in [ workerIds... ]
      if (workerIds.length > 0) {
        // If your "users" collection `_id` is stored as **string**,
        // you can use them directly:
        //query._id = { $in: workerIds };

        // If your "users" _id is an **ObjectId**, do:
        const objectIds = workerIds.map((id) => new ObjectId(id));
        query._id = { $in: objectIds };
      } else {
        // ensures no matching users
        query._id = { $in: [] };
      }
    }

    // Execute final query on "users"
    const users = await db.collection("users").find(query).toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching Workers:", error);
    res.status(500).json({ error: "Failed to fetch Workers" });
  }
});

app.get("/get-admins", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    const query = { role: "Admin" };
    if (companyId && companyId !== "null") {
      query.companyId = companyId;
    }

    if (projectId && projectId !== "null") {
      // Convert comma-separated projectId to an array and apply the $in operator
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
    }

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Admins" });
  }
});
app.get("/get-users", async (req, res) => {
  try {
    const { projectId } = req.query;

    const query = {};

    if (projectId && projectId !== "null") {
      // Convert comma-separated projectId to an array and apply the $in operator
      query.projectsId = { $in: projectId.split(",").map((id) => id.trim()) };
    }
    console.log(query);

    const users = await db.collection("users").find(query).toArray();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

const addFilters = (query, companyId, projectId) => {
  if (companyId && companyId !== "null") {
    query.companyId = companyId;
  }

  if (projectId && projectId !== "null") {
    // Convert comma-separated projectId to an array
    query.projectsId = projectId.split(",").map((id) => id.trim());

    // Use $in for projectsId in MongoDB
    query.projectsId = { $in: query.projectsId };
  }

  return query;
};

app.post("/update-company-status/:id", async (req, res) => {
  const companyId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  try {
    const result = await db
      .collection("companies")
      .updateOne({ _id: new ObjectId(companyId) }, { $set: { status } });

    if (result.modifiedCount === 1) {
      res.json({ message: "Company status updated successfully" });
    } else {
      res.status(404).json({ error: "Company not found or status unchanged" });
    }
  } catch (error) {
    console.error("Error updating company status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/get-tasks", async (req, res) => {
  try {
    const { companyId, projectId, SubjectMatterId, types } = req.query;

    // Base filters for companyId, projectId (if you have an existing helper):
    const query = addFilters({}, companyId, projectId);

    // 1. If "matters" is provided, split by commas
    //    => tasks whose "SubjectMatterId" is in that array
    if (SubjectMatterId) {
      query.SubjectMatterId = SubjectMatterId;
    }

    // 2. If "types" is provided, split by commas
    //    => tasks whose "Type" is in that array
    if (types) {
      const typesArray = types.split(",").map((t) => t.trim());
      query.Type = { $in: typesArray };
    }

    // Now find tasks matching the combined query
    const tasks = await db.collection("tasks").find(query).toArray();

    res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

app.get("/get-matters", async (req, res) => {
  try {
    // distinct() with no second argument, or an empty object {}
    // returns unique values from the entire collection
    const uniqueMatters = await db
      .collection("tasks")
      .distinct("SubjectMatterId");

    res.status(200).json(uniqueMatters);
  } catch (error) {
    console.error("Error fetching matters:", error);
    res.status(500).json({ error: "Failed to fetch matters" });
  }
});

app.get("/get-types", async (req, res) => {
  try {
    // distinct() with no second argument, or an empty object {}
    // returns unique values from the entire collection
    const uniqueMatters = await db.collection("tasks").distinct("Type");

    res.status(200).json(uniqueMatters);
  } catch (error) {
    console.error("Error fetching matters:", error);
    res.status(500).json({ error: "Failed to fetch matters" });
  }
});

app.get("/get-checks", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;

    //let query = addFilters({}, companyId, projectId);
    let query = {};
    let query2 = {};
    if (companyId) {
      query2.selectedCompany = companyId;
    }
    if (projectId) {
      query2.selectedProjects = projectId;
    }
    const activatedRecords = await db
      .collection("user_checks")
      .find(query2)
      .toArray();

    let activatedCheckIds = activatedRecords.map((record) => record.checkId);
    // Convert check IDs to ObjectIds if they are valid
    activatedCheckIds = activatedCheckIds.map((id) =>
      ObjectId.isValid(id) ? new ObjectId(id) : id
    );

    if (activatedCheckIds.length === 0) {
      return res.status(200).json([]);
    }

    query._id = { $in: activatedCheckIds };

    const checks = await db
      .collection("checks")
      .find(query, { projection: { password: 0 } })
      .toArray();

    res.status(200).json(checks);
  } catch (error) {
    console.error("Error in /get-checks:", error);
    res.status(500).json({ error: "Failed to fetch checks" });
  }
});

app.get("/get-controls", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);

    const controls = await db
      .collection("controls")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(controls);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch controls" });
  }
});
app.get("/get-gammas", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);

    const controls = await db.collection("gammas").find(query).toArray();
    res.status(200).json(controls);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch gammas" });
  }
});

app.get("/get-descriptions", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);

    const descriptions = await db
      .collection("descriptions")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(descriptions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch descriptions" });
  }
});

app.get("/get-draws", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);

    const draws = await db
      .collection("draws")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(draws);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch draws" });
  }
});

app.get("/get-mentions", async (req, res) => {
  try {
    const { companyId, projectId, profession } = req.query;
    const query = addFilters({}, companyId, projectId);
    if (profession) {
      query.profession = profession;
    }
    const mentions = await db
      .collection("mentions")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(mentions);
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.get("/get-news", async (req, res) => {
  try {
    const { companyId, projectId, profession } = req.query;

    // 1. Build your filter for the "news" collection
    const query = addFilters({}, companyId, projectId);
    if (profession) {
      query.profession = profession;
    }
    // e.g. add { companyId, ... } if needed

    // 2. Get all news that match the filter
    const newsArray = await db.collection("news").find(query).toArray();

    // 3. Iterate over each news item to find and attach project names
    for (const item of newsArray) {
      const validProjectIds = (item.projectsId || []).filter(ObjectId.isValid);
      const objectIds = validProjectIds.map((id) => new ObjectId(id));

      const projectsArray = await db
        .collection("projects")
        .find({
          _id: { $in: objectIds },
        })
        .toArray();

      const projectNames = projectsArray.map((proj) => proj.name).join(", ");
      item.projectNames = projectNames;
    }

    // Finally return the enriched array
    res.status(200).json(newsArray);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error });
  }
});

app.get("/get-notes", async (req, res) => {
  try {
    const { companyId, projectId, profession } = req.query;
    const query = addFilters({}, companyId, projectId);
    if (profession) {
      query.profession = profession;
    }
    const notes = await db.collection("notes").find(query).toArray();
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

app.get("/get-plans", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);

    const plans = await db
      .collection("plans")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

app.get("/get-requests", async (req, res) => {
  try {
    const { companyId, projectId, profession } = req.query;
    const query = addFilters({}, companyId, projectId);
    if (profession) {
      query.profession = profession;
    }
    const requests = await db
      .collection("requests")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

app.get("/get-schemes", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);

    const schemes = await db
      .collection("schemes")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(schemes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch schemes" });
  }
});
app.get("/get-items", async (req, res) => {
  try {
    const items = await db.collection("items").find({}).toArray();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
});
app.get("/get-levels", async (req, res) => {
  try {
    const levels = await db.collection("levels").find({}).toArray();
    res.status(200).json(levels);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch levels" });
  }
});

app.get("/get-statics", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);

    const statics = await db
      .collection("statics")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(statics);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch statics" });
  }
});

app.get("/get-supers", async (req, res) => {
  try {
    const { companyId, projectId, profession } = req.query;
    const query = addFilters({}, companyId, projectId);
    if (profession) {
      query.profession = profession;
    }
    const supers = await db.collection("supers").find(query).toArray();
    res.status(200).json(supers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch supers" });
  }
});

app.get("/get-professions", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);
    console.log(query);
    const professions = await db
      .collection("professions")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(professions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch professions" });
  }
});

app.get("/get-groups", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);

    const groups = await db
      .collection("groups")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

app.get("/get-deviations", async (req, res) => {
  try {
    const { companyId, projectId, profession } = req.query;
    const query = addFilters({}, companyId, projectId);
    if (profession) {
      query.profession = profession;
    }
    const deviations = await db.collection("deviations").find(query).toArray();
    res.status(200).json(deviations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch deviations" });
  }
});

app.get("/get-parts", async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    const query = addFilters({}, companyId, projectId);

    const parts = await db
      .collection("parts")
      .find(query, { projection: { password: 0 } })
      .toArray();
    res.status(200).json(parts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch parts" });
  }
});

// 3. Get a single user by ID
app.get(
  "/get-user-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("users")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  }
);
app.get(
  "/get-input-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const input = await db
        .collection("inputs")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!input) {
        return res.status(404).json({ error: "Input not found" });
      }
      res.status(200).json(input);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch input" });
    }
  }
);
app.get(
  "/get-standard-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const input = await db
        .collection("standards")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!input) {
        return res.status(404).json({ error: "Standard not found" });
      }
      res.status(200).json(input);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch standard" });
    }
  }
);

// 4. Update a user by ID
app.post(
  "/update-user/:id",
  upload.single("picture"), // Handles a single file upload with the field name "picture"
  async (req, res) => {
    try {
      const {
        username,
        password,
        role,
        address,
        city,
        postalCode,
        startDate,
        phone,
        name,
        picture2,
        projectsId,
        companyId,
        isProjectManager,
        type,
        mainId,
      } = req.body;

      const updateData = {};

      // Add fields dynamically to the updateData object if they are provided
      if (username) updateData.username = username;
      if (password) updateData.password = await bcrypt.hash(password, 10);
      if (role) updateData.role = role;
      if (address) updateData.address = address;
      if (city) updateData.city = city;
      if (postalCode) updateData.postalCode = postalCode;
      if (startDate) updateData.startDate = startDate;
      if (phone) updateData.phone = phone;
      if (name) updateData.name = name;
      if (mainId) updateData.mainId = mainId;
      if (isProjectManager) updateData.isProjectManager = isProjectManager;
      updateData.picture = picture2;
      // If an image is uploaded, include its path in the update
      if (req.file) {
        updateData.picture = req.file.filename; // Store only the filename in the database
      }
      if (type) updateData.type = type;
      //
      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      const result = await db
        .collection("users")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.status(200).json({ message: "User updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);

// 5. Delete a user by ID
app.post(
  "/delete-user/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("users")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
);

// 6. User login
app.post("/users/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.collection("users").findOne({ username, password });
    if (!user) {
      return res.status(404).json({ error: "Invalid username or password" });
    }

    if (user.companyId) {
      const company = await db
        .collection("companies")
        .findOne({ _id: new ObjectId(user.companyId) });
      if (company && company.picture) {
        user.picture = company.picture;
      }
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.status(200).json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});
app.post("/api/updateCheck", async (req, res) => {
  try {
    const { userId, checkId, checked } = req.body;

    // Validate required fields
    if (!userId || !checkId || typeof checked !== "boolean") {
      return res.status(400).json({
        error: "userId, checkId, and checked (boolean) are required.",
      });
    }

    // Access the users collection (adjust if your collection name differs)
    const usersCollection = db.collection("users");

    // Prepare the update operation:
    // - If checked is true, add checkId to the checks array using $addToSet
    // - If false, remove checkId from the checks array using $pull
    const updateOperation = checked
      ? { $addToSet: { checks: checkId } }
      : { $pull: { checks: checkId } };

    // Execute the update
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      updateOperation
    );

    // Check if a user was actually updated
    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ error: "User not found or check not updated." });
    }
    const updatedUser = await usersCollection.findOne({
      _id: new ObjectId(userId),
    });

    res.json({
      message: "User check updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating check:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get(
  "/get-task-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("tasks")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "task not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task" });
    }
  }
);
app.post(
  "/delete-task/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("tasks")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "task not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  }
);
app.post(
  "/delete-input/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("inputs")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "input not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete input" });
    }
  }
);
app.post(
  "/delete-standard/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("standards")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "standard not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete standard" });
    }
  }
);

app.get(
  "/get-check-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("checks")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "check not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch check" });
    }
  }
);
app.post(
  "/delete-check/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("checks")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "check not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete check" });
    }
  }
);

app.get(
  "/get-gamma-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("gammas")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "gamma not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gamma" });
    }
  }
);
app.post(
  "/delete-gamma/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("gammas")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "gamma not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete gamma" });
    }
  }
);

app.get(
  "/get-description-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("descriptions")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "description not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch description" });
    }
  }
);
app.post(
  "/delete-description/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("descriptions")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "description not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete description" });
    }
  }
);

app.get(
  "/get-draw-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("draws")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "draw not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch draw" });
    }
  }
);
app.post(
  "/delete-draw/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("draws")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "draw not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete draw" });
    }
  }
);

app.get(
  "/get-mention-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("mentions")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "mention not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mention" });
    }
  }
);
app.post(
  "/delete-mention/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("mentions")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "mention not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete mention" });
    }
  }
);

app.get(
  "/get-new-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("news")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "new not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch new" });
    }
  }
);
app.post(
  "/delete-new/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("news")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "new not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete new" });
    }
  }
);

app.get(
  "/get-note-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("notes")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "note not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch note" });
    }
  }
);
app.post(
  "/delete-note/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("notes")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "note not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete note" });
    }
  }
);

app.get(
  "/get-plan-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("plans")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "plan not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch plan" });
    }
  }
);
app.post(
  "/delete-plan/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("plans")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "plan not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete plan" });
    }
  }
);
app.get(
  "/get-projects",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const { companyId } = req.query; // Get companyId from query parameters

      // If companyId is provided, filter projects by companyId, else return all projects
      const query =
        companyId && companyId != "null" ? { companyId: companyId } : {};
      console.log(query);
      const projects = await db
        .collection("projects")
        .find(query, { projection: { password: 0 } })
        .toArray();

      res.status(200).json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  }
);

app.get(
  "/get-project-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("projects")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "project not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  }
);
app.post(
  "/delete-project/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("projects")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "project not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  }
);

app.get(
  "/get-request-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("requests")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { requestion: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "request not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch request" });
    }
  }
);
app.post(
  "/delete-request/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("requests")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "request not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete request" });
    }
  }
);

app.get(
  "/get-scheme-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("schemes")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { schemeion: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "scheme not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scheme" });
    }
  }
);
app.post(
  "/delete-scheme/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("schemes")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "scheme not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete scheme" });
    }
  }
);

app.get(
  "/get-static-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("statics")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { staticion: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "static not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch static" });
    }
  }
);
app.get(
  "/get-item-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("items")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!user) {
        return res.status(404).json({ error: "item not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch item" });
    }
  }
);
app.get(
  "/get-level-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const level = await db
        .collection("levels")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!user) {
        return res.status(404).json({ error: "level not found" });
      }
      res.status(200).json(level);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch level" });
    }
  }
);
app.post(
  "/delete-static/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("statics")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "static not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete static" });
    }
  }
);

app.get(
  "/get-super-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("supers")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { superion: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "super not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch super" });
    }
  }
);
app.post(
  "/delete-super/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("supers")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "super not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete super" });
    }
  }
);

app.get(
  "/get-profession-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("professions")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "profession not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch draw" });
    }
  }
);
app.post(
  "/delete-profession/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("professions")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "profession not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete profession" });
    }
  }
);

app.get(
  "/get-group-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("groups")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "group not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group" });
    }
  }
);
app.post(
  "/delete-group/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("groups")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "group not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete group" });
    }
  }
);

app.get(
  "/get-deviation-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("deviations")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "deviation not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deviation" });
    }
  }
);
app.post(
  "/delete-deviation/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("deviations")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "deviation not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete deviation" });
    }
  }
);

app.get(
  "/get-part-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("parts")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "part not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch part" });
    }
  }
);
app.post(
  "/delete-part/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("parts")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "part not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete part" });
    }
  }
);
app.get(
  "/get-companies",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const companies = await db
        .collection("companies")
        .find({}, { projection: { password: 0 } })
        .toArray();
      res.status(200).json(companies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  }
);
app.get(
  "/get-company-detail/:id",
  //authenticateToken,
  async (req, res) => {
    try {
      const user = await db
        .collection("companies")
        .findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { password: 0 } }
        );
      if (!user) {
        return res.status(404).json({ error: "company not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company" });
    }
  }
);
app.post(
  "/delete-company/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("companies")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "company not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete company" });
    }
  }
);
app.post(
  "/delete-item/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("items")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "item not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete item" });
    }
  }
);
app.post(
  "/delete-level/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("levels")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "level not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete level" });
    }
  }
);
app.post(
  "/store-part",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { name, description, projectsId, companyId } = req.body; // Extract the new fields
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("parts").insertOne({
        name, // New field
        description,
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        // New field
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        companyId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create part" });
    }
  }
);

app.post(
  "/update-part/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { name, description, picture2, pictures2, projectsId } = req.body;
      console.log("here" + pictures2);

      const updateData = {};

      if (name) updateData.name = name; // Add name
      if (description) updateData.description = description;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }

      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the user document in the database
      const result = await db
        .collection("parts")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.status(200).json({ message: "User updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);
app.post(
  "/store-profession",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { project, name, indexNumber, companyId } = req.body; // Extract the new fields
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("professions").insertOne({
        project, // New field
        name, // New field
        indexNumber, // New field
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        companyId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create profession" });
    }
  }
);

app.post(
  "/update-profession/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        project,
        name,
        indexNumber,
        picture2,
        pictures2, // Optional field for single file reference
      } = req.body;
      console.log("here" + pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (project) updateData.project = project; // Add project
      if (name) updateData.name = name; // Add name
      if (indexNumber) updateData.indexNumber = indexNumber;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }

      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      // Update the user document in the database
      const result = await db
        .collection("professions")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.status(200).json({ message: "User updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);
app.post(
  "/store-group",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field (no '[]' here)
  ]),
  async (req, res) => {
    try {
      const { project, type, worker, projectsId, companyId, professionId } =
        req.body; // Extract new fields
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("groups").insertOne({
        project, // New field
        type, // New field
        worker, // New field
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        professionId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create group" });
    }
  }
);

app.post(
  "/update-group/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        project,
        type,
        worker,
        picture2,
        pictures2, // Optional field for single file reference
        projectsId,

        professionId,
      } = req.body;
      console.log("here" + pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (project) updateData.project = project; // Add project
      if (type) updateData.type = type; // Add type
      if (worker) updateData.worker = worker; // Add worker
      if (professionId) updateData.professionId = professionId;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }

      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the user document in the database
      const result = await db
        .collection("groups")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Group not found" });
      }

      res.status(200).json({ message: "Group updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update group" });
    }
  }
);
app.post(
  "/store-task",
  upload.fields([
    { name: "file", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        project,
        Index,
        professionGroup,
        Type,
        item,
        Activity,
        criteria,
        time,
        method,
        serialNumber,
        comment,
        drawing,
        buildingPart,
        projectsId,
        companyId,
        SubjectMatterId,
        ControlId,
      } = req.body;

      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let file = null;
      let pictures = [];

      // Handle Excel file upload
      if (req.files["file"] && req.files["file"].length > 0) {
        file = req.files["file"][0]; // Get the uploaded file

        // Parse the Excel file
        const workbook = xlsx.readFile(file.path); // `file.path` contains the path to the uploaded file
        const sheetName = workbook.SheetNames[0]; // Use the first sheet
        const sheetName2 = workbook.SheetNames[6]; // Use the first sheet

        let excelRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]); // Convert sheet to JSON
        let excelRows2 = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName2]); // Convert sheet to JSON

        // Log the parsed Excel rows
        console.log("Excel Rows:", excelRows);

        if (excelRows.length > 50) {
          excelRows = excelRows.slice(0, 50); // Limit to the first 50 rows
        }
        if (excelRows2.length > 50) {
          excelRows2 = excelRows2.slice(0, 50); // Limit to the first 50 rows
        }
        if (excelRows.length > 0) {
          excelRows = excelRows.map((row) => ({
            ...row,
            projectsId: Array.isArray(projectsId) ? projectsId : [projectsId],
            companyId,
          }));
        }
        if (excelRows2.length > 0) {
          excelRows2 = excelRows2.map((row) => ({
            ...row,
            projectsId: Array.isArray(projectsId) ? projectsId : [projectsId],
            companyId,
          }));
        }

        // Optionally, store Excel data into a separate collection in the database
        if (excelRows.length > 0) {
          await db.collection("tasks").insertMany(excelRows);
        }
        if (excelRows2.length > 0) {
          await db.collection("inputs").insertMany(excelRows2);
        }
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the main task data into the database
      const result = await db.collection("tasks").insertOne({
        project,
        Index,
        professionGroup,
        Type,
        item,
        Activity,
        criteria,
        time,
        method,
        serialNumber,
        comment,
        drawing,
        buildingPart,
        picture, // Single picture (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        SubjectMatterId,
        ControlId,
      });

      res.status(201).json({
        message: "Task and Excel data stored successfully!",
        taskId: result.insertedId,
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  }
);

app.post(
  "/update-task/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        project,
        Index,
        professionGroup,
        Type,
        item,
        Activity,
        criteria,
        time,
        method,
        serialNumber,
        comment,
        drawing,
        buildingPart,
        picture2,
        pictures2,
        SubjectMatterId,
        ControlId,
        projectsId,
      } = req.body;

      console.log("here" + pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (project) updateData.project = project;
      if (Index) updateData.Index = Index;
      if (professionGroup) updateData.professionGroup = professionGroup;
      if (Type) updateData.Type = Type;
      if (item) updateData.item = item;
      if (Activity) updateData.Activity = Activity;
      if (criteria) updateData.criteria = criteria;
      if (time) updateData.time = time;
      if (method) updateData.method = method;
      if (serialNumber) updateData.serialNumber = serialNumber;
      if (comment) updateData.comment = comment;
      if (drawing) updateData.drawing = drawing;
      if (buildingPart) updateData.buildingPart = buildingPart;
      if (projectsId) updateData.projectsId = projectsId;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }
      if (SubjectMatterId) updateData.SubjectMatterId = SubjectMatterId;
      if (ControlId) updateData.ControlId = ControlId;
      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }

      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the task document in the database
      const result = await db
        .collection("tasks")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);
app.post(
  "/store-input",
  upload.fields([
    { name: "file", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { projectsId, companyId } = req.body;

      console.log(req.files); // Log files to inspect

      // Initialize variables for files

      let file = null;

      // Handle Excel file upload
      if (req.files["file"] && req.files["file"].length > 0) {
        file = req.files["file"][0]; // Get the uploaded file

        // Parse the Excel file
        const workbook = xlsx.readFile(file.path); // `file.path` contains the path to the uploaded file
        const sheetName = workbook.SheetNames[6]; // Use the first sheet
        let excelRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]); // Convert sheet to JSON

        // Log the parsed Excel rows
        console.log("Excel Rows:", excelRows);

        if (excelRows.length > 50) {
          excelRows = excelRows.slice(0, 50); // Limit to the first 50 rows
        }

        if (excelRows.length > 0) {
          excelRows = excelRows.map((row) => ({
            ...row,
            projectsId: Array.isArray(projectsId) ? projectsId : [projectsId],
            companyId,
          }));
        }

        // Optionally, store Excel data into a separate collection in the database
        if (excelRows.length > 0) {
          await db.collection("inputs").insertMany(excelRows);
        }
      }

      res.status(201).json({
        message: "Excel data stored successfully!",
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create input" });
    }
  }
);

app.post(
  "/store-standard",
  upload.fields([
    { name: "file", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { projectsId, companyId } = req.body;

      // Initialize variables for files
      let picture = null;
      let file = null;
      let pictures = [];

      // Handle Excel file upload
      if (req.files["file"] && req.files["file"].length > 0) {
        file = req.files["file"][0]; // Get the uploaded file

        // Parse the Excel file
        const workbook = xlsx.readFile(file.path); // `file.path` contains the path to the uploaded file
        const sheetName = workbook.SheetNames[0]; // Use the first sheet
        let excelRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
          range: 4,
        }); // Convert sheet to JSON
        console.log(excelRows[0]);

        // Log the parsed Excel rows

        if (excelRows.length > 50) {
          excelRows = excelRows.slice(0, 50); // Limit to the first 50 rows
        }

        if (excelRows.length > 0) {
          excelRows = excelRows.map((row) => ({
            ...row,
            projectsId: Array.isArray(projectsId) ? projectsId : [projectsId],
            companyId,
          }));
        }

        // Optionally, store Excel data into a separate collection in the database
        if (excelRows.length > 0) {
          await db.collection("standards").insertMany(excelRows);
        }
      }

      res.status(201).json({
        message: "Excel data stored successfully!",
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create standard" });
    }
  }
);
app.post(
  "/store-deviation",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { serialNumber, comment, projectsId, companyId, profession } =
        req.body;
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("deviations").insertOne({
        serialNumber,
        comment,
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        profession,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create deviation" });
    }
  }
);

app.post(
  "/update-deviation/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        serialNumber,
        comment,
        picture2,
        pictures2,
        profession,
        projectsId,
      } = req.body;

      console.log("here" + pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (serialNumber) updateData.serialNumber = serialNumber;
      if (comment) updateData.comment = comment;
      if (profession) updateData.profession = profession;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }

      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the deviation document in the database
      const result = await db
        .collection("deviations")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Deviation not found" });
      }

      res
        .status(200)
        .json({ message: "Deviation updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update deviation" });
    }
  }
);

app.post(
  "/store-company",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { name, casenr, phone, address, contactPerson } = req.body;
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("companies").insertOne({
        name,
        casenr,
        phone,
        address,
        contactPerson,
        picture,
        pictures,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create company" });
    }
  }
);

app.post(
  "/update-company/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { name, casenr, phone, address, contactPerson } = req.body;

      console.log("here" + pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (name) updateData.name = name;
      if (casenr) updateData.casenr = casenr;
      if (phone) updateData.phone = phone;
      if (address) updateData.address = address;
      if (contactPerson) updateData.contactPerson = contactPerson;

      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }

      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      // Update the deviation document in the database
      const result = await db
        .collection("companies")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Company not found" });
      }

      res.status(200).json({ message: "Company updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update company" });
    }
  }
);

app.post(
  "/store-check",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        name,
        receiveDate,
        note,
        approvedDate,
        projectsId,
        companyId,
        professionId,
      } = req.body; // Receive the new fields
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("checks").insertOne({
        name, // Add the name
        receiveDate, // Add the receiveDate
        note, // Add the note
        approvedDate, // Add the approvedDate
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        professionId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  }
);
app.post(
  "/update-check/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        name,
        receiveDate,
        note,
        approvedDate,
        picture2,
        pictures2,
        professionId,
        projectsId,
      } = req.body; // Receive new fields
      console.log(pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (name) updateData.name = name;
      if (receiveDate) updateData.receiveDate = receiveDate;
      if (note) updateData.note = note;
      if (approvedDate) updateData.approvedDate = approvedDate;

      if (professionId) updateData.professionId = professionId;

      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the task document in the database
      const result = await db
        .collection("checks")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post(
  "/store-control",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the fields you specified
      const {
        euroCode,
        independent,
        b222x,
        b322x,
        a5x,
        specialText,
        exc,
        cc,
        controllerT,
        controllerD,
        projectsId,
        companyId,
        professionId,
      } = req.body;

      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("controls").insertOne({
        euroCode, // Add the euroCode field
        independent, // Add the independent field
        b222x, // Add the b222x field
        b322x, // Add the b322x field
        a5x, // Add the a5x field
        specialText, // Add the specialText field
        exc, // Add the exc field
        cc, // Add the cc field
        controllerT, // Add the controllerT field
        controllerD, // Add the controllerD field
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        professionId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  }
);
app.post(
  "/update-control/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the fields you specified
      const {
        euroCode,
        independent,
        b222x,
        b322x,
        a5x,
        specialText,
        exc,
        cc,
        controllerT,
        controllerD,
        picture2,
        pictures2,
        professionId,
        projectsId,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (euroCode) updateData.euroCode = euroCode;
      if (independent) updateData.independent = independent;
      if (b222x) updateData.b222x = b222x;
      if (b322x) updateData.b322x = b322x;
      if (a5x) updateData.a5x = a5x;
      if (specialText) updateData.specialText = specialText;
      if (exc) updateData.exc = exc;
      if (cc) updateData.cc = cc;
      if (controllerT) updateData.controllerT = controllerT;
      if (controllerD) updateData.controllerD = controllerD;
      if (professionId) updateData.professionId = professionId;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the task document in the database
      const result = await db
        .collection("controls")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post(
  "/store-description",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields: desc1 and desc2
      const { desc1, desc2, companyId } = req.body;
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("descriptions").insertOne({
        desc1, // Add the desc1 field
        desc2, // Add the desc2 field
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        companyId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  }
);

app.post(
  "/update-description/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields: desc1, desc2, and other optional fields for update
      const { desc1, desc2, picture2, pictures2 } = req.body;
      console.log(pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (desc1) updateData.desc1 = desc1;
      if (desc2) updateData.desc2 = desc2;

      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      // Update the task document in the database
      const result = await db
        .collection("descriptions")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post(
  "/store-item",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields: desc1 and desc2
      const { name } = req.body;
      console.log(name);

      // Insert the data into the database
      const result = await db.collection("items").insertOne({
        name,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create item" });
    }
  }
);
app.post(
  "/store-level",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields: desc1 and desc2
      const { name } = req.body;
      console.log(req.files); // Log files to inspect

      // Insert the data into the database
      const result = await db.collection("levels").insertOne({
        name,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create level" });
    }
  }
);

app.post(
  "/update-item/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields: desc1, desc2, and other optional fields for update
      const { name } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (name) updateData.name = name;
      // Update the task document in the database
      const result = await db
        .collection("items")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "item not found" });
      }

      res.status(200).json({ message: "item updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update item" });
    }
  }
);
app.post(
  "/update-level/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields: desc1, desc2, and other optional fields for update
      const { name } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (name) updateData.name = name;
      // Update the task document in the database
      const result = await db
        .collection("levels")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "level not found" });
      }

      res.status(200).json({ message: "level updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update level" });
    }
  }
);

app.post(
  "/store-draw",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        name,
        type,
        description,
        plan,
        checkbox,
        date,
        updatedDate,
        projectsId,
        companyId,
        planId,
      } = req.body;
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("draws").insertOne({
        name,
        type,
        description,
        plan,
        checkbox,
        date,
        updatedDate,
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        planId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  }
);
app.post(
  "/update-draw/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        name,
        type,
        description,
        plan,
        checkbox,
        date,
        updatedDate,
        picture2,
        pictures2,
        planId,
        projectsId,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (name) updateData.name = name;
      if (type) updateData.type = type;
      if (description) updateData.description = description;
      if (plan) updateData.plan = plan;
      if (checkbox !== undefined) updateData.checkbox = checkbox; // Ensure checkbox is added correctly
      if (date) updateData.date = date;
      if (updatedDate) updateData.updatedDate = updatedDate;
      if (planId) updateData.planId = planId;

      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the task document in the database
      const result = await db
        .collection("draws")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post("/store-gamma", upload.single("picture"), async (req, res) => {
  try {
    // Receive the new fields
    const {
      profession,
      item,
      independentD,
      x,
      text,
      exc,
      cc,
      name,
      email,
      point,
      projectsId,
      companyId,
    } = req.body;

    const picture = req.file ? req.file.filename : null;

    // Insert the data into the database
    const result = await db.collection("gammas").insertOne({
      profession,
      item,
      independentD,
      x,
      text,
      exc,
      cc,
      name,
      email,
      point, // Array of multiple files (empty if not uploaded)
      projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
      companyId,
      picture,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to create gamma" });
  }
});
app.post(
  "/update-gamma/:id",
  upload.single("picture"), // Handles a single file upload with the field name "picture"
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        profession,
        item,
        independentD,
        x,
        text,
        exc,
        cc,
        name,
        email,
        point,
        picture2,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (profession) updateData.profession = profession;
      if (item) updateData.item = item;
      if (independentD) updateData.independentD = independentD;
      if (x) updateData.x = x;
      if (text) updateData.text = text;
      if (exc) updateData.exc = exc;
      if (cc) updateData.cc = cc;
      if (cc) updateData.name = name;
      if (cc) updateData.email = email;

      if (cc) updateData.point = point;

      updateData.picture = picture2;
      // If an image is uploaded, include its path in the update
      if (req.file) {
        updateData.picture = req.file.filename; // Store only the filename in the database
      }

      // Update the task document in the database
      const result = await db
        .collection("gammas")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "gamma not found" });
      }

      res.status(200).json({ message: "gamma updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update gamma" });
    }
  }
);

app.post(
  "/store-mention",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        item,
        recipient,
        drawing,
        projectsId,
        companyId,
        profession,
        users,
      } = req.body;
      console.log(users); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("mentions").insertOne({
        item,
        recipient,
        drawing,
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        profession,
        users: users.split(","),
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  }
);
app.post(
  "/update-mention/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        item,
        recipient,
        drawing,
        picture2,
        pictures2,
        profession,
        projectsId,
        users,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (item) updateData.item = item;
      if (recipient) updateData.recipient = recipient;
      if (drawing) updateData.drawing = drawing;
      if (profession) updateData.profession = profession;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      const usersArray = users.split(",");
      updateData.users = usersArray;

      // Update the task document in the database
      const result = await db
        .collection("mentions")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post(
  "/store-new",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        item,
        supplementory,
        time,
        discipline,
        drawing,
        projectsId,
        companyId,
        profession,
        users,
      } = req.body;
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("news").insertOne({
        item,
        supplementory,
        time,
        discipline,
        drawing,
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        profession,
        users: users.split(","),
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  }
);

app.post(
  "/update-new/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        item,
        supplementory,
        time,
        discipline,
        drawing,
        picture2,
        pictures2,
        profession,
        projectsId,
        users,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (item) updateData.item = item;
      if (supplementory) updateData.supplementory = supplementory;
      if (time) updateData.time = time;
      if (discipline) updateData.discipline = discipline;
      if (drawing) updateData.drawing = drawing;
      if (profession) updateData.profession = profession;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      const usersArray = users.split(",");
      updateData.users = usersArray;

      // Update the task document in the database
      const result = await db
        .collection("news")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post(
  "/store-note",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        item,
        recipient,
        drawing,
        projectsId,
        companyId,
        profession,
        users,
      } = req.body;
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("notes").insertOne({
        item,
        recipient,
        drawing,
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        profession,
        users: users.split(","),
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  }
);

app.post(
  "/update-note/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        item,
        recipient,
        drawing,
        picture2,
        pictures2,
        profession,
        projectsId,
        users,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (item) updateData.item = item;
      if (recipient) updateData.recipient = recipient;
      if (drawing) updateData.drawing = drawing;
      if (profession) updateData.profession = profession;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;
      const usersArray = users.split(",");
      updateData.users = usersArray;

      // Update the task document in the database
      const result = await db
        .collection("notes")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post(
  "/store-plan",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { name, description, projectsId, companyId } = req.body; // Use 'name' and 'description' instead of 'username'
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("plans").insertOne({
        name, // Use 'name' instead of 'username'
        description, // Use 'description'
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create plan" });
    }
  }
);
app.post(
  "/update-plan/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { name, description, picture2, pictures2, projectsId } = req.body;
      console.log(pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (name) updateData.name = name; // Add 'name' field
      if (description) updateData.description = description;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the plan document in the database
      const result = await db
        .collection("plans")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Plan not found" });
      }

      res.status(200).json({ message: "Plan updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update plan" });
    }
  }
);

app.post(
  "/store-project",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { name, address, postCode, city, startDate, companyId } = req.body; // Use the new fields instead of 'username'
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("projects").insertOne({
        name, // Use 'name' instead of 'username'
        address,
        postCode,
        city,
        startDate,
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        companyId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  }
);
app.post(
  "/update-project/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        name,
        address,
        postCode,
        city,
        startDate,
        picture2,
        pictures2, // Optional field for single file reference
      } = req.body;
      console.log(pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (name) updateData.name = name; // Add 'name' field
      if (address) updateData.address = address; // Add 'address' field
      if (postCode) updateData.postCode = postCode; // Add 'postCode' field
      if (city) updateData.city = city; // Add 'city' field
      if (startDate) updateData.startDate = startDate; // Add 'startDate' field
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      // Update the project document in the database
      const result = await db
        .collection("projects")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.status(200).json({ message: "Project updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update project" });
    }
  }
);

app.post(
  "/store-request",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const { item, recipient, drawing, projectsId, profession, users } =
        req.body;
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("requests").insertOne({
        item,
        recipient,
        drawing,
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        profession,
        users: users.split(","),
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  }
);
app.post(
  "/update-request/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      // Receive the new fields
      const {
        item,
        recipient,
        drawing,
        picture2,
        pictures2,
        profession,
        projectsId,
        users,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (item) updateData.item = item;
      if (recipient) updateData.recipient = recipient;
      if (drawing) updateData.drawing = drawing;
      if (profession) updateData.profession = profession;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      const usersArray = users.split(",");
      updateData.users = usersArray;

      // Update the task document in the database
      const result = await db
        .collection("requests")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

app.post(
  "/store-scheme",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { item, level, startDate, projectsId, companyId } = req.body; // Use the new fields instead of 'username'
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("schemes").insertOne({
        item, // 'item' field
        level, // 'level' field
        startDate, // 'startDate' field
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create scheme" });
    }
  }
);

app.post(
  "/update-scheme/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { item, level, startDate, picture2, pictures2, projectsId } =
        req.body;
      console.log(pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (item) updateData.item = item; // Add 'item' field
      if (level) updateData.level = level; // Add 'level' field
      if (startDate) updateData.startDate = startDate;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Splitting by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Update the scheme document in the database
      const result = await db
        .collection("schemes")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Scheme not found" });
      }

      res.status(200).json({ message: "Scheme updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update scheme" });
    }
  }
);
app.post(
  "/store-static",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const { activity, controlPlan, items, projectsId, professionId } =
        req.body; // Replace 'username' with the new fields
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("statics").insertOne({
        activity, // New field
        controlPlan, // New field
        items, // New field
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        professionId,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create static entry" });
    }
  }
);
app.post(
  "/update-static/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        activity,
        controlPlan,
        items,
        picture2,
        pictures2, // Optional field for single file reference
        projectsId,
        professionId,
      } = req.body;

      console.log(pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (activity) updateData.activity = activity; // Add 'activity' field
      if (controlPlan) updateData.controlPlan = controlPlan; // Add 'controlPlan' field
      if (items) updateData.items = items; // Add 'ite
      if (professionId) updateData.professionId = professionId;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Split by comma
        updateData.pictures = picturesArray;
      }
      //
      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      // Update the static document in the database
      const result = await db
        .collection("statics")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Static entry not found" });
      }

      res
        .status(200)
        .json({ message: "Static entry updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update static entry" });
    }
  }
);
app.post(
  "/store-super",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        title,
        what,
        when,
        where,
        scope,
        executedDate,
        projectsId,
        companyId,
        profession,
        users,
      } = req.body; // Replace 'username' with the new fields
      console.log(req.files); // Log files to inspect

      // Initialize variables for files
      let picture = null;
      let pictures = [];

      // Handle single picture upload
      if (req.files["picture"] && req.files["picture"].length > 0) {
        picture = req.files["picture"][0].filename; // Single file
      }

      // Handle multiple pictures upload
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        pictures = req.files["pictures"].map((file) => file.filename); // Multiple files
      }

      // Insert the data into the database
      const result = await db.collection("supers").insertOne({
        title, // New field
        what, // New field
        when, // New field
        scope, // New field
        executedDate, // New field
        picture, // Single file (null if not uploaded)
        pictures, // Array of multiple files (empty if not uploaded)
        projectsId: Array.isArray(projectsId) ? projectsId : [projectsId], // Convert to array if it's not already an array
        companyId,
        profession,
        where,
        users: users.split(","),
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to create super entry" });
    }
  }
);
app.post(
  "/update-super/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        title,
        what,
        when,
        scope,
        executedDate,
        picture2,
        pictures2,
        profession,
        projectsId,
        where,
        users,
      } = req.body;

      console.log(pictures2);

      const updateData = {};
      //
      const projectsArray = projectsId.split(",");
      updateData.projectsId = projectsArray;

      const usersArray = users.split(",");
      updateData.users = usersArray;

      // Dynamically add provided fields to updateData
      if (title) updateData.title = title; // Add 'title' field
      if (what) updateData.what = what; // Add 'what' field
      if (when) updateData.when = when; // Add 'when' field
      if (where) updateData.where = where;
      if (scope) updateData.scope = scope; // Add 'scope' field
      if (executedDate) updateData.executedDate = executedDate; // Add 'executedDate' field

      if (profession) updateData.profession = profession;
      if (picture2) {
        updateData.picture = picture2; // Use the existing picture if provided in the request
      }

      // Handle single file upload (picture)
      if (req.files["picture"] && req.files["picture"].length > 0) {
        updateData.picture = req.files["picture"][0].filename; // Replace the existing picture
      }

      let picturesArray = [];
      if (!pictures2) {
        updateData.pictures = [];
      }
      if (pictures2) {
        picturesArray = pictures2.split(","); // Split by comma
        updateData.pictures = picturesArray;
      }

      // Handle multiple file uploads (pictures)
      if (req.files["pictures"] && req.files["pictures"].length > 0) {
        const newFiles = req.files["pictures"].map((file) => file.filename);

        // Append new files to the existing files
        const existingFiles = picturesArray;
        updateData.pictures = [...existingFiles, ...newFiles];
      }

      // Update the super document in the database
      const result = await db
        .collection("supers")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Super entry not found" });
      }

      res
        .status(200)
        .json({ message: "Super entry updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update super entry" });
    }
  }
);

app.get("/get-profession-row/:id/:projectId", async (req, res) => {
  try {
    const { id, projectId } = req.params;
    // Assuming that the profession is stored in the 'inputs' collection
    const doc = await db
      .collection("inputs")
      .findOne({ SubjectMatterId: id, projectsId: { $in: [projectId] } });
    if (!doc) {
      return res.status(404).json({ message: "Profession not found" });
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get rows based on selected B value
app.get("/get-rows-by-b/:bValue/:projectId", async (req, res) => {
  try {
    const { bValue, projectId } = req.params;
    // Replace 'rows' with your actual collection name and adjust query
    const rows = await db
      .collection("standards")
      .find({
        DS_GroupId: bValue,
        projectsId: { $in: [projectId] }, // Checks if projectId is in the projectsId array
      })
      .toArray();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to store the new Alpha document
// Using multer to handle file uploads if needed (adjust fields and file handling as necessary)
app.post("/store-alpha", upload.none(), async (req, res) => {
  try {
    // Access fields from req.body (if files, you might use upload.single('file') etc.)
    const {
      profession,
      euroCode,
      bValue,
      standardsIds, // May be an array of values
      control,
      status,
      date,
      comment,
      companyId,
      projectsId,
    } = req.body;

    // Create your new document (adjust fields as needed)
    const newAlpha = {
      profession,
      euroCode,
      bValue,
      standardsIds: Array.isArray(standardsIds) ? standardsIds : [standardsIds],
      control,
      status,
      date,
      comment,
      companyId,
      projectsId: Array.isArray(projectsId) ? projectsId : [projectsId],
      createdAt: new Date(),
    };

    // Insert the document into a collection, e.g., 'alphas'
    const result = await db.collection("alphas").insertOne(newAlpha);
    res.json({ message: "Alpha stored successfully", id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/store-beta", upload.none(), async (req, res) => {
  try {
    // Access fields from req.body (if files, you might use upload.single('file') etc.)
    const {
      profession,

      bValue,
      standardsIds, // May be an array of values
      buildingPart,
      status,
      drawing,
      comment,
      companyId,
      projectsId,
    } = req.body;

    // Create your new document (adjust fields as needed)
    const newBeta = {
      profession,

      bValue,
      standardsIds: Array.isArray(standardsIds) ? standardsIds : [standardsIds],
      buildingPart,
      status,
      drawing,
      comment,
      companyId,
      projectsId: Array.isArray(projectsId) ? projectsId : [projectsId],
      createdAt: new Date(),
    };

    // Insert the document into a collection, e.g., 'alphas'
    const result = await db.collection("betas").insertOne(newBeta);
    res.json({ message: "Beta stored successfully", id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post(
  "/update-alpha/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        profession,
        bValue,
        standardsIds, // May be an array of values
        control,
        status,
        date,
        comment,
      } = req.body;

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (profession) updateData.profession = profession;

      if (bValue) updateData.bValue = bValue;
      if (standardsIds)
        updateData.standardsIds = Array.isArray(standardsIds)
          ? standardsIds
          : [standardsIds];

      if (control) updateData.control = control;
      if (status) updateData.status = status;
      if (date) updateData.date = date;
      if (comment) updateData.comment = comment;

      // Update the task document in the database
      const result = await db
        .collection("alphas")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(200).json({ message: "Task updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);
app.post(
  "/update-beta/:id",
  upload.fields([
    { name: "picture", maxCount: 1 }, // Single file field
    { name: "pictures", maxCount: 10 }, // Multiple file field
  ]),
  async (req, res) => {
    try {
      const {
        profession,
        bValue,
        standardsIds, // May be an array of values
        buildingPart,
        status,
        drawing,
        comment,
      } = req.body;

      console.log("here" + pictures2);

      const updateData = {};

      // Dynamically add provided fields to updateData
      if (profession) updateData.profession = profession;

      if (bValue) updateData.bValue = bValue;
      if (standardsIds)
        updateData.standardsIds = Array.isArray(standardsIds)
          ? standardsIds
          : [standardsIds];

      if (buildingPart) updateData.buildingPart = buildingPart;
      if (status) updateData.status = status;
      if (drawing) updateData.drawing = drawing;
      if (comment) updateData.comment = comment;

      // Update the task document in the database
      const result = await db
        .collection("betas")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Beta not found" });
      }

      res.status(200).json({ message: "Beta updated successfully", result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update beta" });
    }
  }
);
app.get("/get-alphas", async (req, res) => {
  try {
    const { companyId, projectId, profession } = req.query;

    const query = addFilters({}, companyId, projectId);
    if (profession) {
      query.profession = profession;
    }
    console.log(query);
    const parts = await db.collection("alphas").find(query).toArray();
    res.status(200).json(parts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch alphas" });
  }
});
app.get("/get-betas", async (req, res) => {
  try {
    const { companyId, projectId, profession } = req.query;
    const query = addFilters({}, companyId, projectId);
    if (profession) {
      query.profession = profession;
    }
    const parts = await db.collection("betas").find(query).toArray();
    res.status(200).json(parts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch betas" });
  }
});
app.get("/get-alpha-detail/:id", async (req, res) => {
  try {
    // First, find the alpha document
    const alpha = await db
      .collection("alphas")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!alpha) {
      return res.status(404).json({ error: "Alpha not found" });
    }

    // Check if standardIds exists and is an array
    if (
      alpha.standardsIds &&
      Array.isArray(alpha.standardsIds) &&
      alpha.standardsIds.length > 0
    ) {
      // Convert each id to ObjectId if necessary.
      const standardObjectIds = alpha.standardsIds.map((id) =>
        typeof id === "string" ? new ObjectId(id) : id
      );
      // Fetch all standards documents where _id is in the standardObjectIds array.
      const standards = await db
        .collection("standards")
        .find({ _id: { $in: standardObjectIds } })
        .toArray();

      // Attach the standards records to the alpha document as rowsData.
      alpha.rowsData = standards;
    } else {
      alpha.rowsData = [];
    }

    res.status(200).json(alpha);
  } catch (error) {
    console.error("Error fetching alpha detail:", error);
    res.status(500).json({ error: "Failed to fetch alpha" });
  }
});
app.get("/get-beta-detail/:id", async (req, res) => {
  try {
    // First, find the alpha document
    const alpha = await db
      .collection("betas")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!alpha) {
      return res.status(404).json({ error: "Beta not found" });
    }

    // Check if standardIds exists and is an array
    if (
      alpha.standardsIds &&
      Array.isArray(alpha.standardsIds) &&
      alpha.standardsIds.length > 0
    ) {
      // Convert each id to ObjectId if necessary.
      const standardObjectIds = alpha.standardsIds.map((id) =>
        typeof id === "string" ? new ObjectId(id) : id
      );
      // Fetch all standards documents where _id is in the standardObjectIds array.
      const standards = await db
        .collection("standards")
        .find({ _id: { $in: standardObjectIds } })
        .toArray();

      // Attach the standards records to the alpha document as rowsData.
      alpha.rowsData = standards;
    } else {
      alpha.rowsData = [];
    }

    res.status(200).json(alpha);
  } catch (error) {
    console.error("Error fetching beta detail:", error);
    res.status(500).json({ error: "Failed to fetch beta" });
  }
});
app.post(
  "/delete-alpha/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("alphas")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "alpha not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete alpha" });
    }
  }
);
app.post(
  "/delete-beta/:id",
  //authenticateToken,
  //authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const result = await db
        .collection("betas")
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "beta not found" });
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete beta" });
    }
  }
);

// Activation endpoint: now uses selectedCompany and checkId
app.post("/api/activate-check", async (req, res) => {
  const { selectedCompany, checkId, selectedProjects } = req.body;
  if (!selectedCompany || !checkId || !selectedProjects) {
    return res
      .status(400)
      .json({ error: "selectedCompany and checkId required" });
  }
  try {
    // Prevent duplicate activation
    const existing = await db
      .collection("user_checks")
      .findOne({ selectedCompany, checkId, selectedProjects });
    if (existing) {
      return res.status(400).json({ error: "Check already activated" });
    }
    const result = await db
      .collection("user_checks")
      .insertOne({ selectedCompany, checkId, selectedProjects });
    res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Deactivation endpoint: remove document with selectedCompany and checkId
app.post("/api/deactivate-check", async (req, res) => {
  const { selectedCompany, checkId, selectedProjects } = req.body;
  if (!selectedCompany || !checkId) {
    return res
      .status(400)
      .json({ error: "selectedCompany and checkId required" });
  }
  try {
    const result = await db
      .collection("user_checks")
      .deleteOne({ selectedCompany, checkId, selectedProjects });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "No matching record found" });
    }
    res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all activated checks for a given selectedCompany
app.get("/api/company-checks", async (req, res) => {
  const { selectedCompany, selectedProjects } = req.query;
  console.log(selectedCompany, selectedProjects);
  try {
    const docs = await db
      .collection("user_checks")
      .find({ selectedCompany, selectedProjects })
      .toArray();
    res.json({ success: true, data: docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 7. Check authentication status
app.get("/users/authenticated", authenticateToken, (req, res) => {
  res.status(200).json({ authenticated: true, user: req.user });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
